# ADP-Certifications-Lookups

## Project Structure

- `gas/` — Google Apps Script source files
- `aws/adp-snapshot-service/` — Lambda: fetches ADP roster & certifications, stores in DynamoDB
- `aws/ftp-to-google-drive/` — Lambda: downloads ADP inservice CSV via FTP, filters, re-uploads to MG FTP
- `aws/adp-api-node/` — Lambda: original ADP API proxy (legacy)
- `.github/workflows/` — GitHub Actions CI/CD for Lambda deployments

---

## Deploying Google Apps Script (GAS)

GAS files are managed with [clasp](https://github.com/google/clasp). The `.clasp.json` is in the `gas/` folder and points to the production script.

**Push local changes to Apps Script:**
```bash
cd gas
clasp push
```

**Pull latest from Apps Script (overwrites local):**
```bash
cd gas
clasp pull
```

> Requires `clasp` to be installed (`npm install -g @google/clasp`) and authenticated (`clasp login`).

---

## Deploying AWS Lambda Functions

Lambda functions are deployed automatically via GitHub Actions on push to `main` when files under the relevant `aws/` subdirectory change.

| Function | Trigger path | Workflow |
|---|---|---|
| `adp-snapshot-service` | `aws/adp-snapshot-service/**` | `deploy-adp-snapshot-service.yml` |
| `ftp-to-google-drive` | `aws/ftp-to-google-drive/**` | `deploy-ftp-to-google-drive.yml` |

**Required GitHub Secrets:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `MG_CERT_B64` / `MG_KEY_B64` — base64-encoded mTLS cert/key for adp-snapshot-service (decoded into `keys/` at deploy time)

---

## Lambda Environment Variables

### adp-snapshot-service
Set in AWS Console → Lambda → adp-snapshot-service → Configuration → Environment variables.

| Variable | Description |
|---|---|
| `SLACK_WEBHOOK_URL` | Slack app incoming webhook URL |
| `SLACK_SIGNING_SECRET` | Slack app signing secret — verifies "Retry failed AOIDs" button clicks |
| `FUNCTION_URL_SECRET` | Shared secret GAS sends in `x-adp-secret` |
| `FUNCTION_URL_SECRET_LETTERS` | Optional second `x-adp-secret` for the Letters app (Render env `ADP_SNAPSHOT_SECRET`); limited to `getRoster` |
| `CERT_CONCURRENCY` | Parallel ADP cert requests (default `4`) |
| `REQUISITIONS_TABLE` | DynamoDB table for job requisitions (default `adp_requisitions_latest`) |

HTTP calls with no secret configured, or a missing/wrong `x-adp-secret`, get `401`. A Letters-secret call for any action other than `getRoster` gets `403`.

#### Roster fields
`getRoster` returns one item per AOID: `aoid`, `name` ("Last, First" — used by GAS), `givenName`, `familyName` (preferred name, else legal), `account`, `accountName` (home work location long name, else short name, else `''`), `jobTitle`, `positionId`, `associateId`, `originalHireDate`, `positionStartDate`, `fetchedAt`. GAS maps fields by name, so new fields don't affect the Roster tab.

#### Slack "Retry failed AOIDs" button
When `ingestCerts` still has failures after its internal retries, the Slack alert includes a button that re-runs `ingestCerts` for just the failed AOIDs (no need to open the sheet). One-time setup:
1. Slack app (the one owning the webhook) → **Interactivity & Shortcuts** → On; Request URL = the Lambda Function URL (same as GAS script property `SNAPSHOT_LAMBDA_URL`).
2. Slack app → **Basic Information** → copy **Signing Secret** into the Lambda env var `SLACK_SIGNING_SECRET`.
3. Lambda execution role needs `lambda:InvokeFunction` on its own ARN (the button triggers an async self-invoke).

#### Job-requisition alerts for IT
IT gets an email digest when a job requisition opens in ADP, so equipment and accounts can be planned before the hire starts.

- **Lambda actions:** `ingestRequisitions` (ADP `/staffing/v1/job-requisitions`, Open + On Hold only — ADP keeps 2.5k+ historical reqs → `adp_requisitions_latest`; stored rows that drop out become `NO_LONGER_OPEN` and are kept as history; marks new / reopened / new-on-hold rows with `pendingAlert`; supports `{ "seed": true }` and `{ "dryRun": true }`; an empty table seeds automatically with no alerts), `getRequisitions` (optional `{ "status": "ON" }`), `ackRequisitionAlerts`.
- **Only allow-listed fields are stored** — no pay ranges, job descriptions, backfill (departing employee) names, contacts, or addresses.
- **Trigger:** unlike roster/certs (EventBridge), this runs from an Apps Script daily trigger, `refreshRequisitions` in `gas/requisitions.gs`. It ingests, rewrites the **Open Requisitions** tab in the ADP Info sheet, emails `IT_ALERT_EMAILS` every day (section 1: updated reqs, or "No updated requisitions"; section 2: table of all open/on-hold reqs on the IT list), then acks. If the email fails, alerts stay pending and retry on the next run.
- **IT job titles list:** ADP Info sheet → **IT Job Titles** tab: column A, header in row 1, one job title per row (matched case-insensitively against ADP job titles). Only requisitions with a listed title appear in the Open Requisitions tab and the email; others are skipped. If the tab is missing or empty, nothing is emailed and alerts stay pending (Slack ops notice).
- **One-time setup:** create DynamoDB table `adp_requisitions_latest` (PK `itemID`, String) and give the Lambda role `dynamodb:Scan`, `BatchWriteItem`, `BatchGetItem`, `UpdateItem` on it → set script property `IT_ALERT_EMAILS` → make sure the script's account can edit the ADP Info sheet → create the IT Job Titles tab → `clasp push` → run `seedRequisitions()` once, then `createDailyRequisitionsTrigger()`. `dryRunRequisitions()` previews without writing.

### ftp-to-google-drive
| Variable | Description |
|---|---|
| `ADP_FTP_HOST` | ADP FTP hostname (default: `filetransfer1.adp.com`) |
| `ADP_FTP_USER` | ADP FTP username |
| `ADP_FTP_PASS` | ADP FTP password |
| `MG_FTP_HOST` | MG FTP hostname (default: `ftp.merig.com`) |
| `MG_FTP_USER` | MG FTP username |
| `MG_FTP_PASS` | MG FTP password |
| `SLACK_WEBHOOK` | Slack incoming webhook URL |
| `COMPLETION_AFTER` | Date filter cutoff in `YYYY-MM-DD` format (e.g. `2024-06-01`) |
| `EXEMPT_COURSE_CODES` | Comma-separated course codes to always include regardless of date (e.g. `INS 123,INS 137`) |

---

## Rotating the ADP mTLS Cert

The cert/key are never committed (`**/keys/` is gitignored). Each Lambda reads them from its own `keys/` folder:
- `keys/Meriwether Godsey, Inc..cer`
- `keys/meriwethergodsey_auth.key` — only changes if ADP issued the cert against a new CSR/private key

Files must be PEM (text starting with `-----BEGIN ...`). If ADP sends a binary DER `.cer`, convert it first: `openssl x509 -inform der -in new.cer -out new.pem`.

### adp-snapshot-service
1. **Live fix:** AWS Console → Lambda → adp-snapshot-service → Code → `keys/` → paste the new cert over `Meriwether Godsey, Inc..cer` (keep the filename) → **Deploy**.
2. **Persist for future deploys** — otherwise the next GitHub Actions deploy restores the old cert from secrets:
   ```bash
   base64 -i "/path/to/new/Meriwether Godsey, Inc..cer" | tr -d '\n' \
     | gh secret set MG_CERT_B64 -R MeriwetherGodsey/ADP-Certifications-Lookups
   # only if the key changed:
   base64 -i "/path/to/new/meriwethergodsey_auth.key" | tr -d '\n' \
     | gh secret set MG_KEY_B64 -R MeriwetherGodsey/ADP-Certifications-Lookups
   ```
   Confirm with `gh secret list -R MeriwetherGodsey/ADP-Certifications-Lookups` (updated date should be today).
3. **Verify:** Sheet → **Manually Update ADP → Refresh Roster from ADP**.

### adp-api-node (legacy)
No CI deploy. Paste the new cert into its `keys/` folder in the Lambda console → **Deploy**. Test with `testHUListEmployees` in Apps Script.
