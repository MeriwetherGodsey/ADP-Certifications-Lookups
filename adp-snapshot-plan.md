# ADP Certification Reporting Refactor Plan (GAS + AWS)

## Current pain points

* We run many nightly/weekly certification reports (FPM, Food Handlers, STOP, AllerTrain Lite, etc.).
* Each report currently calls ADP for certifications for overlapping AOIDs, creating **redundant API calls**.
* Redundant calls increase exposure to ADP gateway limits and instability (e.g., **429 Rate Limit Violated**, **504 Gateway Timeout**), which can lead to missing/incorrect report rows.
* We want the sheets to be accurate for anyone viewing them, without requiring a human to notice and react to alerts.

## Goals

* **Accuracy**: report tabs should reflect correct certification status from ADP (source of truth).
* **Reliability**: nightly runs should complete without producing false negatives due to transient API errors.
* **Efficiency**: avoid repeatedly fetching the same certification payload for the same AOID across multiple reports.
* **Maintainability**: develop in IDE (Windsurf) with clear separation between GAS and AWS code.

## Proposed architecture (snapshot + cache)

### Key idea: Fetch once, reuse many

1. Nightly job ingests certifications for the full AOID set (currently ~776 AOIDs).
2. Store the latest certification snapshot in a durable cache (recommended: **DynamoDB**).
3. All report tabs are generated from the cached snapshot instead of calling ADP directly.

### Why DynamoDB (latest-only)

* One item per AOID (overwritten nightly) keeps size manageable.
* Fast batch retrieval (BatchGet) for report generation.
* Eliminates sheet-cache growth risk.
* Avoids needing snapshot version history if “latest only” is sufficient.

## Division of responsibilities

### Google Apps Script (GAS)

* Continues to populate the **Roster** tab for human/manual lookup.
* Filters employees for each report (job title categories, regions, etc.).
* Generates each report tab by reading cached cert data (via AWS endpoint) and writing to Sheets.

### AWS (new Lambda service)

* Separate from existing `adp-api-node` proxy to avoid breaking other uses.
* Provides endpoints to:

  * Ingest certifications for a list of AOIDs and write to DynamoDB.
  * Batch read certifications for a set of AOIDs (for GAS report generation).
  * (Optional later) build roster in AWS as well.

## Deployment approach (current repo)

* Single GitHub repo, with clear folders:

  * `/gas` for Apps Script code (managed by clasp).
  * `/aws/adp-api-node` for the existing proxy Lambda.
  * `/aws/adp-snapshot-service` for the new snapshot/cache Lambda.
* Existing GitHub Action uses a **zip-and-upload** deployment to Lambda (`appleboy/lambda-action`).

  * We will update it so it zips only `/aws/adp-api-node` (not the whole repo).
  * Add a second workflow for `/aws/adp-snapshot-service`.

## Phased rollout

### Phase 1: Stabilize existing batch lookups (short-term)

* Reduce concurrency and add retries for retryable status codes (429, 502, 503, 504, missing result).
* Improve logging of per-URI failures.
* Goal: fewer false negatives while we build the cache.

### Phase 2: Implement snapshot cache (recommended path)

1. Create DynamoDB table `adp_associate_certs_latest` keyed by `aoid`.
2. Build new Lambda `adp-snapshot-service` with endpoints:

   * `POST /certs/ingest` (accept AOID list, fetch from ADP via mTLS/OAuth, store in DDB)
   * `POST /certs/batchGet` (accept AOID list, return cached cert arrays)
3. Modify GAS report functions to use cached reads instead of ADP calls.

### Phase 3 (optional): Move roster ingestion to AWS

* AWS builds roster snapshot and GAS only writes it to the Roster tab.
* Removes GAS as a dependency for the ingestion AOID list.

## Data model sketch (DynamoDB)

Table: `adp_associate_certs_latest`

* Partition key: `aoid` (string)
* Attributes:

  * `fetchedAt` (epoch ms or ISO string)
  * `statusCode` (number) from ADP call
  * `certs` (array of compact cert objects)

    * `n`: certification longName
    * `e`: expirationDate
    * `c`: categoryCode

## Finalized decisions

* **Ingestion trigger**: AWS-owned via two EventBridge scheduled rules — `ingestRoster` runs first (nightly), `ingestCerts` runs ~15 min later using AOIDs stored by the roster ingest. GAS does not pass AOIDs.
* **Report generation**: Stays in GAS long-term. GAS calls `getRoster` / `getCerts` endpoints and writes to sheets — zero direct ADP calls from GAS.
* **Token sharing**: `adp-snapshot-service` shares the same SSM parameters (`/meriwether/adp/token`, `/meriwether/adp/tokenExpiresAt`) as the existing `adp-api-node` proxy, since both use the same mTLS cert/key (same ADP client identity).
* **mTLS keys**: `keys/` folder (same cert/key files) copied into `adp-snapshot-service` at deploy time via GitHub Actions secrets — never committed to git.
* **Deployment**: GitHub Actions → `aws lambda update-function-code` on push to `main` when files under `aws/adp-snapshot-service/**` change. No manual zip uploads.
* **GAS deploys**: Manual `clasp push` from IDE — decoupled from GitHub Actions.
* **Step Functions/SQS**: Not needed initially. Lambda timeout for `ingestCerts` (~776 AOIDs with concurrency=6) should be well within 15 min. Revisit if employee count grows significantly.

## Repo structure

```
/
├── gas/                        # Google Apps Script (clasp-managed)
├── aws/
│   ├── adp-api-node/           # Existing proxy Lambda — reference only, no deploy workflow
│   └── adp-snapshot-service/   # New snapshot/cache Lambda
│       ├── index.js            # Handler router (ingestRoster, ingestCerts, getRoster, getCerts)
│       ├── adp.js              # mTLS agent, OAuth token, ADP GET helper
│       ├── dynamo.js           # DynamoDB batchWrite, batchGet, scan helpers
│       └── package.json
└── .github/workflows/
    └── deploy-adp-snapshot-service.yml

```

## AWS setup required before first deploy

1. Create DynamoDB table `adp_roster_latest` — partition key: `aoid` (String)
2. Create DynamoDB table `adp_associate_certs_latest` — partition key: `aoid` (String)
3. Create Lambda function `adp-snapshot-service` (Node 20, us-east-1)
4. Attach IAM role with permissions: `ssm:GetParameter`, `ssm:PutParameter`, `dynamodb:BatchWriteItem`, `dynamodb:BatchGetItem`, `dynamodb:Scan`
5. Add GitHub Actions secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `MG_CERT_B64`, `MG_KEY_B64`
6. Create two EventBridge rules targeting `adp-snapshot-service`:
   - `ingestRoster`: nightly (e.g. `cron(0 5 * * ? *)` — 5am UTC), payload `{"action":"ingestRoster"}`
   - `ingestCerts`: 15 min after roster (e.g. `cron(15 5 * * ? *)`), payload `{"action":"ingestCerts"}`
