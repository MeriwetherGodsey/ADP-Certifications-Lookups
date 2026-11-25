'use strict';

const { getBearerToken, adpGet, mapWithConcurrency } = require('./adp');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const {
  RETRY_ACTION_ID,
  notifySuccess, notifyFailure, notifyCertFailure, notifyError,
  verifySlackSignature, respondToSlack,
} = require('./slack');
const {
  ROSTER_TABLE, CERTS_TABLE, REQUISITIONS_TABLE,
  batchWrite, batchDelete, batchGet,
  scanAllRosterAoids, scanAllRoster,
  scanAllRequisitions, clearPendingAlerts,
} = require('./dynamo');
const { fetchAllRequisitions, mapRequisition, diffRequisitions } = require('./requisitions');

/** =======================
 *  Lambda handler — routes by event.action
 *
 *  Supported actions:
 *    ingestRoster          — fetch all workers from ADP → store in adp_roster_latest
 *    ingestCerts           — read AOIDs from adp_roster_latest → fetch all certs → store in adp_associate_certs_latest
 *    getRoster             — return all roster rows from adp_roster_latest
 *    getCerts              — return cert rows for provided AOIDs from adp_associate_certs_latest
 *    ingestRequisitions    — fetch job requisitions from ADP → diff → store in adp_requisitions_latest
 *                            with pendingAlert set on new / reopened / new-on-hold rows ({ seed, dryRun } supported)
 *    getRequisitions       — return requisition rows (optional { status: 'ON' } filter)
 *    ackRequisitionAlerts  — clear pendingAlert on rows GAS has emailed ({ acks: [{ itemID, pendingAlertAt }] })
 *
 *  EventBridge scheduled events should include { "action": "ingestRoster" } etc.
 *  GAS calls should POST { "action": "getRoster" } or { "action": "getCerts", "aoids": [...] }
 *  The Letters app (separate repo on Render) POSTs { "action": "getRoster" } with its own secret
 *  (FUNCTION_URL_SECRET_LETTERS) and is limited to getRoster.
 *  ======================= */
const LETTERS_ALLOWED_ACTIONS = new Set(['getRoster']);

exports.handler = async (event) => {
  // Slack interactivity (button clicks) — authenticated by Slack signing secret instead of x-adp-secret
  if (event?.headers?.['x-slack-signature']) {
    return handleSlackInteraction(event);
  }

  // Shared secret check for Function URL calls (EventBridge bypasses this — no headers)
  // Fails closed: if no secret is configured, all HTTP calls are rejected
  let caller = null;
  if (event?.headers) {
    const secrets = [
      ['gas',     process.env.FUNCTION_URL_SECRET],
      ['letters', process.env.FUNCTION_URL_SECRET_LETTERS],
    ].filter(([, s]) => s);
    const provided = event.headers['x-adp-secret'];
    if (secrets.length === 0) console.error('[handler] No FUNCTION_URL_SECRET* is set — rejecting HTTP request');
    caller = provided ? secrets.find(([, s]) => s === provided)?.[0] : undefined;
    if (!caller) return { statusCode: 401, error: 'Unauthorized' };
  }

  const isHttp = !!event?.headers;
  const body   = event?.body ? JSON.parse(event.body) : event;
  const action = body?.action;
  console.log(`[handler] action=${action} isHttp=${isHttp}${caller ? ` caller=${caller}` : ''}`);

  if (caller === 'letters' && !LETTERS_ALLOWED_ACTIONS.has(action)) {
    console.warn(`[handler] caller=letters not allowed action=${action}`);
    return { statusCode: 403, error: 'Forbidden' };
  }

  const respond = (result) => {
    if (isHttp) {
      return {
        statusCode: result.statusCode || 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      };
    }
    return result;
  };

  try {
    switch (action) {
      case 'ingestRoster': return respond(await ingestRoster());
      case 'ingestCerts':  return respond(await ingestCerts({ aoids: body?.aoids, requestedBy: body?.requestedBy }));
      case 'getRoster':    return respond(await getRoster());
      case 'getCerts':     return respond(await getCerts(body?.aoids));
      case 'ingestRequisitions':   return respond(await ingestRequisitions({ seed: body?.seed === true, dryRun: body?.dryRun === true }));
      case 'getRequisitions':      return respond(await getRequisitions({ status: body?.status }));
      case 'ackRequisitionAlerts': return respond(await ackRequisitionAlerts(body?.acks));
      default:
        console.warn(`[handler] Unknown action: ${action}`);
        return respond({ statusCode: 400, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error(`[handler] Unhandled error in action=${action}:`, err?.message || err);
    await notifyError(action, err);
    return respond({ statusCode: 500, error: err?.message || 'Internal error' });
  }
};

/** =======================
 *  ingestRoster
 *  Fetches all active workers from ADP (/hr/v2/workers, paginated)
 *  Stores one item per active assignment in adp_roster_latest
 *  ======================= */
async function ingestRoster() {
  const t0    = Date.now();
  const token = await getBearerToken();

  const TOP    = 100;
  let skip     = 0;
  let total    = null;
  let pageNum  = 0;
  const items  = [];

  while (true) {
    pageNum++;
    const uri = pageNum === 1
      ? `/hr/v2/workers?count=true&$top=${TOP}&$skip=${skip}`
      : `/hr/v2/workers?$top=${TOP}&$skip=${skip}`;

    const result = await adpGet(token, 'https://api.adp.com', uri);

    if (result.statusCode !== 200 || !result.data) {
      console.warn(`[ingestRoster] ADP returned ${result.statusCode} at skip=${skip} — stopping`);
      break;
    }

    if (pageNum === 1) {
      total = result.data?.meta?.totalNumber ?? null;
      console.log(`[ingestRoster] totalCount=${total}`);
    }

    const workers = result.data.workers || [];
    if (workers.length === 0) {
      console.log(`[ingestRoster] No workers at skip=${skip} — done`);
      break;
    }

    const fetchedAt = new Date().toISOString();

    for (const w of workers) {
      const workerStatus = w?.workerStatus?.statusCode?.codeValue;
      if (workerStatus && workerStatus !== 'A' && workerStatus !== 'Active') {
        console.log(`[ingestRoster] Skipping ${w.associateOID} — workerStatus=${workerStatus}`);
        continue;
      }

      const aoid          = w.associateOID || '';
      const name          = buildWorkerDisplayName(w);
      const associateId   = w?.workerID?.idValue || '';
      const originalHire  = w?.workerDates?.originalHireDate || '';
      const preferred     = w?.person?.preferredName || {};
      const legal         = w?.person?.legalName || {};
      const givenName     = pick(preferred.givenName, legal.givenName);
      const familyName    = pick(preferred.familyName1, legal.familyName1);

      for (const a of (w.workAssignments || [])) {
        const status   = a?.assignmentStatus?.statusCode?.codeValue;
        const nameCode = a?.homeWorkLocation?.nameCode;
        const acct     = nameCode?.codeValue;
        if (!acct || status !== 'A') continue;

        items.push({
          aoid,
          name,
          givenName,
          familyName,
          account:           acct,
          accountName:       pick(nameCode?.longName, nameCode?.shortName),
          jobTitle:          a?.jobTitle || '',
          positionId:        a?.positionID || '',
          associateId,
          originalHireDate:  originalHire,
          positionStartDate: a?.actualStartDate || '',
          fetchedAt,
        });
      }
    }

    skip += TOP;
    if (total != null && skip >= total) break;
    if (workers.length < TOP) break;
  }

  if (items.length === 0) {
    console.warn('[ingestRoster] No items to write — ADP returned no active workers');
    await notifyFailure('ingestRoster', { 'Warning': 'ADP returned 0 active workers — roster NOT updated' });
    return { statusCode: 200, message: 'No roster items found', count: 0 };
  }

  await batchWrite(ROSTER_TABLE, items);

  // Delete stale AOIDs — any row in DynamoDB not in the fresh fetch
  const freshAoids  = new Set(items.map((i) => i.aoid));
  const existingAoids = await scanAllRosterAoids();
  const staleAoids  = existingAoids.filter((a) => !freshAoids.has(a));
  if (staleAoids.length > 0) {
    console.log(`[ingestRoster] Deleting ${staleAoids.length} stale AOIDs from roster`);
    await batchDelete(ROSTER_TABLE, staleAoids.map((a) => ({ aoid: a })));
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[ingestRoster] Done. Wrote ${items.length} items, deleted ${staleAoids.length} stale in ${elapsed}s`);
  await notifySuccess('ingestRoster', {
    'Employees written': items.length,
    'Stale deleted':     staleAoids.length,
    'Elapsed':           `${elapsed}s`,
  });
  return { statusCode: 200, message: 'Roster ingest complete', count: items.length, elapsed };
}

/** =======================
 *  ingestCerts
 *  Reads AOIDs from adp_roster_latest (or uses the provided aoids), fetches certs for each,
 *  stores in adp_associate_certs_latest
 *  ======================= */
async function ingestCerts({ aoids: aoidsOverride, requestedBy } = {}) {
  const t0    = Date.now();
  const token = await getBearerToken();

  const isPartial = Array.isArray(aoidsOverride) && aoidsOverride.length > 0;
  const aoids     = isPartial
    ? aoidsOverride.map((a) => String(a).trim()).filter(Boolean)
    : await scanAllRosterAoids();
  console.log(`[ingestCerts] ${aoids.length} AOIDs from ${isPartial ? 'request' : 'roster'}${requestedBy ? ` (requested by ${requestedBy})` : ''}`);

  if (aoids.length === 0) {
    return { statusCode: 200, message: 'No AOIDs in roster — run ingestRoster first', count: 0 };
  }

  const fetchedAt = new Date().toISOString();
  const { successes, recovered, failures } = await fetchCertsWithRetries(token, aoids);

  // Build DynamoDB items — only write successful lookups
  const items = successes.map((r) => {
    const rawCerts = r.data?.associateCertifications || [];
    return {
      aoid:      r.aoid,
      fetchedAt,
      statusCode: r.statusCode,
      certs: rawCerts.map((c) => ({
        n: c?.certificationNameCode?.longName || '',
        e: c?.expirationDate || '',
        c: c?.categoryCode?.codeValue || '',
      })),
    };
  });

  if (items.length > 0) {
    await batchWrite(CERTS_TABLE, items);
  }

  const elapsed      = ((Date.now() - t0) / 1000).toFixed(1);
  const failureCount = failures.length;
  console.log(`[ingestCerts] Done. Wrote ${items.length} items. Failures=${failureCount} in ${elapsed}s`);
  if (failureCount > 0) {
    console.warn(`[ingestCerts] Failed AOIDs: ${failures.map((f) => `${f.aoid}(${f.statusCode})`).join(', ')}`);
  }
  if (recovered.length > 0) {
    console.log(`[ingestCerts] Recovered on retry: ${recovered.map((r) => `${r.aoid}(${r.statusCode})`).join(', ')}`);
  }

  const details = {
    ...(requestedBy ? { 'Retry requested by': `<@${requestedBy}>` } : {}),
    ...(isPartial ? { 'Scope': `${aoids.length} requested AOIDs` } : {}),
    'Certs written': items.length,
    ...(recovered.length > 0 ? { 'Recovered on retry': summarizeStatusCodes(recovered) } : {}),
    'Failed AOIDs':  failureCount,
    'Elapsed':       `${elapsed}s`,
  };

  if (failureCount > 0) {
    await notifyCertFailure(details, failures);
  } else {
    await notifySuccess('ingestCerts', details);
  }

  return {
    statusCode: 200,
    message:    'Cert ingest complete',
    written:    items.length,
    failures:   failureCount,
    elapsed,
  };
}

/** =======================
 *  fetchCertsWithRetries
 *  Fetches certs for each AOID; any non-200/204 result (429, 5xx, network errors) is retried
 *  with exponential backoff. Returns { successes, failures: [{ aoid, statusCode }] }
 *  ======================= */
async function fetchCertsWithRetries(token, aoids) {
  const CONCURRENCY   = Number(process.env.CERT_CONCURRENCY || 4);
  const MAX_RETRIES   = 6;
  const BASE_SLEEP_MS = 1200;

  const fetchOne = async (aoid) => {
    const uri    = `/talent/v2/associates/${encodeURIComponent(aoid)}/associate-certifications`;
    const result = await adpGet(token, 'https://accounts.adp.com', uri);
    return { aoid, ...result };
  };

  const successes    = [];
  const recovered    = [];
  const firstFailure = new Map();
  let pending        = [];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const batch = attempt === 0 ? aoids : pending.map((r) => r.aoid);
    if (batch.length === 0) break;

    if (attempt > 0) {
      const sleepMs = (BASE_SLEEP_MS * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 250);
      const codes   = [...new Set(pending.map((r) => r.statusCode))].join(',');
      console.log(`[ingestCerts] Retrying ${batch.length} AOIDs (attempt ${attempt}, codes=${codes}) after ${sleepMs}ms`);
      await sleep(sleepMs);
    }

    const results = await mapWithConcurrency(batch, CONCURRENCY, fetchOne);
    pending = [];
    for (const r of results) {
      if (r.statusCode === 200 || r.statusCode === 204) {
        successes.push(r);
        if (firstFailure.has(r.aoid)) recovered.push({ aoid: r.aoid, statusCode: firstFailure.get(r.aoid) });
      } else {
        if (!firstFailure.has(r.aoid)) firstFailure.set(r.aoid, r.statusCode);
        pending.push(r);
      }
    }
  }

  return {
    successes,
    recovered,
    failures: pending.map((r) => ({ aoid: r.aoid, statusCode: r.statusCode })),
  };
}

/** =======================
 *  handleSlackInteraction
 *  Handles the "Retry failed AOIDs" button from ingestCerts failure messages.
 *  Verifies the Slack signature, kicks off ingestCerts asynchronously (Slack requires a reply
 *  within 3s), and replaces the original message so the button can't be clicked twice.
 *  ======================= */
const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

async function handleSlackInteraction(event) {
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : (event.body || '');

  if (!verifySlackSignature(event.headers, rawBody)) {
    console.warn('[slack] Invalid or missing Slack signature');
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const payload = JSON.parse(new URLSearchParams(rawBody).get('payload') || '{}');
  const action  = payload?.actions?.[0];
  if (payload.type !== 'block_actions' || action?.action_id !== RETRY_ACTION_ID) {
    console.warn(`[slack] Ignoring interaction type=${payload.type} action=${action?.action_id}`);
    return { statusCode: 200, body: '' };
  }

  const userId = payload?.user?.id;
  const value  = JSON.parse(action.value || '{}');
  const aoids  = Array.isArray(value.aoids) ? value.aoids : undefined;
  const scope  = aoids ? `${aoids.length} AOIDs` : 'full roster';
  console.log(`[slack] Retry ingestCerts requested by ${userId} (${scope})`);

  try {
    await lambda.send(new InvokeCommand({
      FunctionName:   process.env.AWS_LAMBDA_FUNCTION_NAME,
      InvocationType: 'Event',
      Payload:        Buffer.from(JSON.stringify({ action: 'ingestCerts', aoids, requestedBy: userId })),
    }));
  } catch (err) {
    console.error('[slack] Failed to invoke ingestCerts:', err?.message || err);
    await respondToSlack(payload.response_url, {
      response_type:    'ephemeral',
      replace_original: false,
      text:             `:warning: Could not start retry: ${err?.message || err}`,
    });
    return { statusCode: 200, body: '' };
  }

  const startedText = `:hourglass_flowing_sand: Retry started by <@${userId}> (${scope}) — results will post here when done.`;
  const keptBlocks  = (payload?.message?.blocks || []).filter((b) => b.type !== 'actions');
  await respondToSlack(payload.response_url, {
    replace_original: true,
    text:             `${payload?.message?.text || ''}\n${startedText}`,
    blocks:           [...keptBlocks, { type: 'context', elements: [{ type: 'mrkdwn', text: startedText }] }],
  });

  return { statusCode: 200, body: '' };
}

/** =======================
 *  getRoster
 *  Returns all roster rows from adp_roster_latest
 *  GAS uses this to populate the Roster tab and get the AOID list
 *  ======================= */
async function getRoster() {
  const t0    = Date.now();
  const items = await scanAllRoster();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[getRoster] Returned ${items.length} items in ${elapsed}s`);
  if (items.length === 0) {
    await notifyFailure('getRoster', { 'Warning': 'Returned 0 roster items — table may be empty' });
  }
  return { statusCode: 200, employees: items, count: items.length };
}

/** =======================
 *  getCerts
 *  Returns cert rows for requested AOIDs from adp_associate_certs_latest
 *  event.aoids: string[]
 *  ======================= */
async function getCerts(aoids) {
  if (!Array.isArray(aoids) || aoids.length === 0) {
    return { statusCode: 400, error: 'aoids must be a non-empty array' };
  }

  const t0   = Date.now();
  const keys = aoids.map((a) => ({ aoid: String(a).trim() }));
  const items = await batchGet(CERTS_TABLE, keys);

  // Index by aoid for easy lookup
  const byAoid = {};
  for (const item of items) {
    byAoid[item.aoid] = item;
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[getCerts] Returned ${items.length}/${aoids.length} items in ${elapsed}s`);
  return { statusCode: 200, certs: byAoid, count: items.length };
}

/** =======================
 *  ingestRequisitions
 *  Fetches Open (ON) and On Hold (OH) job requisitions from ADP, diffs against adp_requisitions_latest,
 *  and marks rows with pendingAlert for GAS to email IT. Stored ON/OH rows that ADP no longer returns
 *  are kept as history with status NO_LONGER_OPEN.
 *  seed (or empty table) → write without alerts. dryRun → no writes; returns would-be alerts.
 *  ======================= */
async function ingestRequisitions({ seed = false, dryRun = false } = {}) {
  const t0    = Date.now();
  const token = await getBearerToken();
  const now   = new Date().toISOString();

  const fresh = (await fetchAllRequisitions(token)).map((r) => mapRequisition(r, now));
  if (fresh.length === 0) {
    console.warn('[ingestRequisitions] ADP returned 0 open/on-hold requisitions — table NOT updated');
    if (!dryRun) await notifyFailure('ingestRequisitions', { 'Warning': 'ADP returned 0 open/on-hold requisitions — table NOT updated' });
    return { statusCode: 200, message: 'No requisitions found', counts: { fetched: 0 } };
  }

  const existing   = await scanAllRequisitions();
  const isSeed     = seed || existing.length === 0;
  const existingById = new Map(existing.map((e) => [e.itemID, e]));
  const { rows, alerts, counts } = diffRequisitions(fresh, existingById, now, { seed: isSeed });
  const elapsed    = ((Date.now() - t0) / 1000).toFixed(1);
  const summary    = `fetched=${counts.fetched} new=${counts.new} reopened=${counts.reopened} onHold=${counts.onHold} updated=${counts.updated} noLongerOpen=${counts.noLongerOpen} seed=${isSeed}`;

  if (dryRun) {
    console.log(`[ingestRequisitions] DRY RUN ${summary} in ${elapsed}s`);
    for (const a of alerts) {
      console.log(`[ingestRequisitions] DRY RUN would alert ${a.pendingAlert}: req ${a.reqNumber} ${a.jobTitle} @ ${a.account} (${a.status})`);
    }
    return { statusCode: 200, dryRun: true, seed: isSeed, counts, alerts, sample: rows.slice(0, 3), elapsed };
  }

  await batchWrite(REQUISITIONS_TABLE, rows);

  console.log(`[ingestRequisitions] Done. ${summary} in ${elapsed}s`);
  await notifySuccess('ingestRequisitions', {
    'Fetched':       counts.fetched,
    'New':           counts.new,
    'Reopened':      counts.reopened,
    'On hold (new)': counts.onHold,
    'Updated':       counts.updated,
    'No longer open': counts.noLongerOpen,
    'Pending alerts': alerts.length,
    ...(isSeed ? { 'Seed': 'yes — no alerts raised' } : {}),
    'Elapsed':       `${elapsed}s`,
  });
  return { statusCode: 200, message: 'Requisition ingest complete', seed: isSeed, counts, pendingAlerts: alerts.length, elapsed };
}

/** =======================
 *  getRequisitions
 *  Returns all rows from adp_requisitions_latest, optionally filtered by status code (e.g. 'ON')
 *  Filtered in memory — `status` is a DynamoDB reserved word and the table is small.
 *  ======================= */
async function getRequisitions({ status } = {}) {
  const t0    = Date.now();
  const all   = await scanAllRequisitions();
  const want  = status ? String(status).trim().toUpperCase() : '';
  const items = want ? all.filter((r) => r.status === want) : all;
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[getRequisitions] Returned ${items.length}/${all.length} items${want ? ` (status=${want})` : ''} in ${elapsed}s`);
  return { statusCode: 200, requisitions: items, count: items.length };
}

/** =======================
 *  ackRequisitionAlerts
 *  Clears pendingAlert on rows GAS has successfully emailed
 *  acks: [{ itemID, pendingAlertAt }]
 *  ======================= */
async function ackRequisitionAlerts(acks) {
  const valid = Array.isArray(acks)
    ? acks.filter((a) => a?.itemID && a?.pendingAlertAt).map((a) => ({ itemID: String(a.itemID), pendingAlertAt: String(a.pendingAlertAt) }))
    : [];
  if (valid.length === 0) {
    return { statusCode: 400, error: 'acks must be a non-empty array of { itemID, pendingAlertAt }' };
  }
  const acked = await clearPendingAlerts(valid);
  console.log(`[ackRequisitionAlerts] Cleared ${acked}/${valid.length} pending alerts`);
  return { statusCode: 200, acked };
}

/** =======================
 *  Worker name builder (mirrors allActiveEmployees in GAS)
 *  ======================= */
function buildWorkerDisplayName(w) {
  const legal     = w?.person?.legalName || {};
  const preferred = w?.person?.preferredName || {};

  const family    = pick(preferred.familyName1, legal.familyName1);
  const first     = pick(preferred.givenName, legal.givenName, preferred.nickName, legal.nickName);
  const formatted = pick(preferred.formattedName, legal.formattedName, preferred.fullName, legal.fullName);

  if (family && first) return `${family}, ${first}`;
  if (formatted)       return formatted;
  if (family)          return family;
  return first;
}

function pick(...vals) {
  for (const v of vals) {
    const s = String(v ?? '').trim();
    if (s) return s;
  }
  return '';
}

function summarizeStatusCodes(entries) {
  const counts = {};
  for (const e of entries) counts[e.statusCode] = (counts[e.statusCode] || 0) + 1;
  const parts = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([code, n]) => `${code}×${n}`);
  return `${entries.length} (${parts.join(', ')})`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
