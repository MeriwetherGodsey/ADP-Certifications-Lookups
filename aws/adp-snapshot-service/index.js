'use strict';

const { getBearerToken, adpGet, mapWithConcurrency } = require('./adp');
const { notifySuccess, notifyFailure, notifyError } = require('./slack');
const {
  ROSTER_TABLE, CERTS_TABLE,
  batchWrite, batchGet,
  scanAllRosterAoids, scanAllRoster,
} = require('./dynamo');

/** =======================
 *  Lambda handler — routes by event.action
 *
 *  Supported actions:
 *    ingestRoster  — fetch all workers from ADP → store in adp_roster_latest
 *    ingestCerts   — read AOIDs from adp_roster_latest → fetch all certs → store in adp_associate_certs_latest
 *    getRoster     — return all roster rows from adp_roster_latest
 *    getCerts      — return cert rows for provided AOIDs from adp_associate_certs_latest
 *
 *  EventBridge scheduled events should include { "action": "ingestRoster" } etc.
 *  GAS calls should POST { "action": "getRoster" } or { "action": "getCerts", "aoids": [...] }
 *  ======================= */
exports.handler = async (event) => {
  const action = event?.action;
  console.log(`[handler] action=${action}`);

  try {
    switch (action) {
      case 'ingestRoster': return await ingestRoster();
      case 'ingestCerts':  return await ingestCerts();
      case 'getRoster':    return await getRoster();
      case 'getCerts':     return await getCerts(event?.aoids);
      default:
        console.warn(`[handler] Unknown action: ${action}`);
        return { statusCode: 400, error: `Unknown action: ${action}` };
    }
  } catch (err) {
    console.error(`[handler] Unhandled error in action=${action}:`, err?.message || err);
    await notifyError(action, err);
    return { statusCode: 500, error: err?.message || 'Internal error' };
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
      const aoid          = w.associateOID || '';
      const name          = buildWorkerDisplayName(w);
      const associateId   = w?.workerID?.idValue || '';
      const originalHire  = w?.workerDates?.originalHireDate || '';

      for (const a of (w.workAssignments || [])) {
        const status = a?.assignmentStatus?.statusCode?.codeValue;
        const acct   = a?.homeWorkLocation?.nameCode?.codeValue;
        if (!acct || status !== 'A') continue;

        items.push({
          aoid,
          name,
          account:           acct,
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
    console.warn('[ingestRoster] No items to write');
    return { statusCode: 200, message: 'No roster items found', count: 0 };
  }

  await batchWrite(ROSTER_TABLE, items);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[ingestRoster] Done. Wrote ${items.length} items in ${elapsed}s`);
  await notifySuccess('ingestRoster', {
    'Employees written': items.length,
    'Elapsed':           `${elapsed}s`,
  });
  return { statusCode: 200, message: 'Roster ingest complete', count: items.length, elapsed };
}

/** =======================
 *  ingestCerts
 *  Reads AOIDs from adp_roster_latest, fetches certs for each, stores in adp_associate_certs_latest
 *  ======================= */
async function ingestCerts() {
  const t0    = Date.now();
  const token = await getBearerToken();

  const aoids = await scanAllRosterAoids();
  console.log(`[ingestCerts] ${aoids.length} AOIDs from roster`);

  if (aoids.length === 0) {
    return { statusCode: 200, message: 'No AOIDs in roster — run ingestRoster first', count: 0 };
  }

  const CONCURRENCY     = Number(process.env.CERT_CONCURRENCY || 4);
  const MAX_429_RETRIES = 6;
  const BASE_SLEEP_MS   = 1200;

  // First pass
  const fetchedAt = new Date().toISOString();
  const firstResults = await mapWithConcurrency(aoids, CONCURRENCY, async (aoid) => {
    const uri    = `/talent/v2/associates/${encodeURIComponent(aoid)}/associate-certifications`;
    const result = await adpGet(token, 'https://accounts.adp.com', uri);
    return { aoid, ...result };
  });

  // Separate successes from 429s and other failures
  let toRetry    = [];
  const successes = [];
  const failures  = [];

  for (const r of firstResults) {
    if (r.statusCode === 200 || r.statusCode === 204) {
      successes.push(r);
    } else if (r.statusCode === 429) {
      toRetry.push(r.aoid);
    } else {
      failures.push(r);
      console.warn(`[ingestCerts] ${r.aoid} returned ${r.statusCode}`);
    }
  }

  // Retry loop for 429s
  for (let attempt = 1; attempt <= MAX_429_RETRIES && toRetry.length > 0; attempt++) {
    const jitter   = Math.floor(Math.random() * 250);
    const sleepMs  = (BASE_SLEEP_MS * Math.pow(2, attempt - 1)) + jitter;
    console.log(`[ingestCerts] Retrying ${toRetry.length} rate-limited AOIDs (attempt ${attempt}) after ${sleepMs}ms`);
    await sleep(sleepMs);

    const retryResults = await mapWithConcurrency(toRetry, CONCURRENCY, async (aoid) => {
      const uri    = `/talent/v2/associates/${encodeURIComponent(aoid)}/associate-certifications`;
      const result = await adpGet(token, 'https://accounts.adp.com', uri);
      return { aoid, ...result };
    });

    toRetry = [];
    for (const r of retryResults) {
      if (r.statusCode === 200 || r.statusCode === 204) {
        successes.push(r);
      } else if (r.statusCode === 429) {
        toRetry.push(r.aoid);
      } else {
        failures.push(r);
        console.warn(`[ingestCerts] ${r.aoid} returned ${r.statusCode} on retry ${attempt}`);
      }
    }
  }

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
  const failureCount = failures.length + toRetry.length;
  console.log(`[ingestCerts] Done. Wrote ${items.length} items. Failures=${failureCount} in ${elapsed}s`);

  if (failureCount > 0) {
    await notifyFailure('ingestCerts', {
      'Certs written':         items.length,
      'Failed AOIDs':          failureCount,
      'Elapsed':               `${elapsed}s`,
      'Note':                  'Check CloudWatch logs for affected AOIDs',
    });
  } else {
    await notifySuccess('ingestCerts', {
      'Certs written': items.length,
      'Failed AOIDs':  0,
      'Elapsed':       `${elapsed}s`,
    });
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
 *  Worker name builder (mirrors allActiveEmployees in GAS)
 *  ======================= */
function buildWorkerDisplayName(w) {
  const legal     = w?.person?.legalName || {};
  const preferred = w?.person?.preferredName || {};

  const pick = (...vals) => {
    for (const v of vals) {
      const s = String(v ?? '').trim();
      if (s) return s;
    }
    return '';
  };

  const family    = pick(preferred.familyName1, legal.familyName1);
  const first     = pick(preferred.givenName, legal.givenName, preferred.nickName, legal.nickName);
  const formatted = pick(preferred.formattedName, legal.formattedName, preferred.fullName, legal.fullName);

  if (family && first) return `${family}, ${first}`;
  if (formatted)       return formatted;
  if (family)          return family;
  return first;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
