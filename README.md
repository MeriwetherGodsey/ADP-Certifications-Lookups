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
- `ADP_CERT` / `ADP_KEY` — mTLS cert/key for adp-snapshot-service

---

## Lambda Environment Variables

### adp-snapshot-service
Set in AWS Console → Lambda → adp-snapshot-service → Configuration → Environment variables.

| Variable | Description |
|---|---|
| `SLACK_WEBHOOK_URL` | Slack app incoming webhook URL |
| `SLACK_SIGNING_SECRET` | Slack app signing secret — verifies "Retry failed AOIDs" button clicks |
| `FUNCTION_URL_SECRET` | Shared secret GAS sends in `x-adp-secret` |
| `CERT_CONCURRENCY` | Parallel ADP cert requests (default `4`) |
| `REQUISITIONS_TABLE` | DynamoDB table for job requisitions (default `adp_requisitions_latest`) |

#### Slack "Retry failed AOIDs" button
When `ingestCerts` still has failures after its internal retries, the Slack alert includes a button that re-runs `ingestCerts` for just the failed AOIDs (no need to open the sheet). One-time setup:
1. Slack app (the one owning the webhook) → **Interactivity & Shortcuts** → On; Request URL = the Lambda Function URL (same as GAS script property `SNAPSHOT_LAMBDA_URL`).
2. Slack app → **Basic Information** → copy **Signing Secret** into the Lambda env var `SLACK_SIGNING_SECRET`.
3. Lambda execution role needs `lambda:InvokeFunction` on its own ARN (the button triggers an async self-invoke).

#### Job-requisition alerts for IT
IT gets an email digest when a job requisition opens in ADP, so equipment and accounts can be planned before the hire starts.

- **Lambda actions:** `ingestRequisitions` (ADP `/staffing/v1/job-requisitions`, all statuses → `adp_requisitions_latest`; marks new / reopened / new-on-hold rows with `pendingAlert`; supports `{ "seed": true }` and `{ "dryRun": true }`; an empty table seeds automatically with no alerts), `getRequisitions` (optional `{ "status": "ON" }`), `ackRequisitionAlerts`.
- **Only allow-listed fields are stored** — no pay ranges, job descriptions, backfill (departing employee) names, contacts, or addresses.
- **Trigger:** unlike roster/certs (EventBridge), this runs from an Apps Script daily trigger, `refreshRequisitions` in `gas/requisitions.gs`. It ingests, rewrites the **Open Requisitions** tab in the ADP Info sheet, emails one digest to the `IT_ALERT_EMAILS` script property, then acks. If the email fails, alerts stay pending and retry on the next run.
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
