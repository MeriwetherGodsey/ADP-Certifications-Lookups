'use strict';

const { adpGet } = require('./adp');

const PAGE_SIZE = 20; // ADP caps job-requisitions at 20 per call

/** =======================
 *  fetchAllRequisitions
 *  Pages through /staffing/v1/job-requisitions (all statuses — no filter, so OH → ON can be detected).
 *  Throws on any non-200/204 page so a partial fetch is never committed.
 *  Never logs response bodies (they contain pay, descriptions, and departing-employee names).
 *  ======================= */
async function fetchAllRequisitions(token) {
  let skip    = 0;
  let total   = null;
  let pageNum = 0;
  const byId  = new Map();

  while (true) {
    pageNum++;
    const uri = pageNum === 1
      ? `/staffing/v1/job-requisitions?count=true&$top=${PAGE_SIZE}&$skip=${skip}`
      : `/staffing/v1/job-requisitions?$top=${PAGE_SIZE}&$skip=${skip}`;

    const result = await adpGet(token, 'https://api.adp.com', uri);
    if (result.statusCode === 204) break;
    if (result.statusCode !== 200 || !result.data) {
      throw new Error(`ADP job-requisitions returned ${result.statusCode} at skip=${skip}`);
    }

    if (pageNum === 1) {
      total = result.data?.meta?.totalNumber ?? null;
      console.log(`[requisitions] totalCount=${total}`);
    }

    const page = result.data.jobRequisitions || [];
    for (const raw of page) {
      if (raw?.itemID) byId.set(raw.itemID, raw);
    }

    skip += PAGE_SIZE;
    if (page.length < PAGE_SIZE) break;
    if (total != null && skip >= total) break;
  }

  console.log(`[requisitions] Fetched ${byId.size} requisitions in ${pageNum} page(s)`);
  return [...byId.values()];
}

/** =======================
 *  mapRequisition
 *  Allow-list only. Built field-by-field so pay ranges, job descriptions, backfill worker names/IDs,
 *  application contacts, and addresses can never be stored or returned.
 *  ======================= */
function mapRequisition(raw, fetchedAt) {
  const loc       = raw?.requisitionLocations?.[0]?.nameCode || {};
  const quantity  = Number(raw?.openingsQuantity) || 0;
  const filled    = Number(raw?.openingsFilledQuantity) || 0;

  return {
    itemID:             String(raw.itemID),
    reqNumber:          str(raw?.clientRequisitionID),
    status:             str(raw?.requisitionStatusCode?.codeValue),
    statusName:         str(raw?.requisitionStatusCode?.shortName),
    statusDate:         str(raw?.requisitionStatusCode?.effectiveDate),
    jobTitle:           str(raw?.job?.jobTitle),
    jobCode:            str(raw?.job?.jobCode?.codeValue),
    account:            str(loc.codeValue),
    accountName:        str(loc.longName) || str(loc.shortName),
    workerType:         str(raw?.workerTypeCode?.shortName) || str(raw?.workerTypeCode?.longName),
    openings:           Math.max(0, quantity - filled),
    projectedStartDate: str(raw?.projectedStartDate),
    reason:             str(raw?.requisitionReasonCode?.shortName),
    isBackfill:         Array.isArray(raw?.backfillWorkerPositions) && raw.backfillWorkerPositions.length > 0,
    hiringManager:      str(raw?.hiringManager?.personName?.formattedName),
    fetchedAt,
  };
}

/** =======================
 *  diffRequisitions
 *  fresh: mapped requisitions from ADP; existingById: Map(itemID → stored row)
 *  Returns { rows, alerts, counts }. rows are full items to Put; requisitions missing from ADP are
 *  not included, so their stored row (and lastSeenAt) is left untouched.
 *
 *  pendingAlert values:
 *    new      — first seen with status ON
 *    onHold   — first seen with status OH (low-key heads-up)
 *    reopened — previously stored with a non-ON status, now ON
 *  An un-acked pendingAlert is carried forward until GAS acks it.
 *  seed=true → write rows with no alerts.
 *  ======================= */
function diffRequisitions(fresh, existingById, now, { seed = false } = {}) {
  const rows   = [];
  const alerts = [];
  const counts = { fetched: fresh.length, new: 0, reopened: 0, onHold: 0, updated: 0 };

  for (const f of fresh) {
    const prev = existingById.get(f.itemID);
    const row  = { ...f, firstSeenAt: prev?.firstSeenAt || now, lastSeenAt: now, fetchedAt: now };
    if (prev) counts.updated++;

    if (!seed) {
      const alert = classify(f, prev);
      if (alert) {
        row.pendingAlert   = alert.kind;
        row.pendingAlertAt = now;
        if (alert.prevStatusName) row.prevStatusName = alert.prevStatusName;
        counts[alert.kind]++;
      } else if (prev?.pendingAlert) {
        row.pendingAlert   = prev.pendingAlert;
        row.pendingAlertAt = prev.pendingAlertAt;
        if (prev.prevStatusName) row.prevStatusName = prev.prevStatusName;
      }
      if (row.pendingAlert) alerts.push(row);
    }

    rows.push(row);
  }

  return { rows, alerts, counts };
}

function classify(f, prev) {
  if (!prev) {
    if (f.status === 'ON') return { kind: 'new' };
    if (f.status === 'OH') return { kind: 'onHold' };
    return null;
  }
  if (f.status !== 'ON' || prev.status === 'ON') return null;
  // Never emailed yet (still pending as new/onHold) → it's still news, so report as new
  if (prev.pendingAlert === 'new' || prev.pendingAlert === 'onHold') return { kind: 'new' };
  return { kind: 'reopened', prevStatusName: prev.statusName || prev.status || '' };
}

function str(v) {
  return String(v ?? '').trim();
}

module.exports = { fetchAllRequisitions, mapRequisition, diffRequisitions };
