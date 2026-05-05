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
