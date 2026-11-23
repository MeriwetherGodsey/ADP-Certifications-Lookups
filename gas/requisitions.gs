/** =======================
 *  Job requisition alerts for IT
 *
 *  Daily flow (refreshRequisitions, run by a time-driven trigger and the menu):
 *    1. Lambda ingestRequisitions — pulls ADP requisitions, marks new / reopened / new-on-hold rows as pendingAlert
 *    2. Lambda getRequisitions    — returns all stored rows
 *    3. Join job titles with ADP Info → "IT Job Title Requirements" (col A = Job Title, one checkbox column per IT need)
 *    4. Rewrite ADP Info → "Open Requisitions" (ON/OH reqs with IT needs, plus unmapped titles)
 *    5. Email one digest of pending alerts to the IT_ALERT_EMAILS script property
 *    6. Lambda ackRequisitionAlerts — only after the email succeeds, so failures retry next run
 *  ======================= */
const REQ_ADP_INFO_ID        = '1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE';
const REQ_IT_MAPPING_SHEET   = 'IT Job Title Requirements';
const REQ_LISTING_SHEET      = 'Open Requisitions';
const REQ_LISTED_STATUSES    = ['ON', 'OH'];
const REQ_UNMAPPED           = 'Unmapped – add to IT Job Title Requirements';

function refreshRequisitions() {
  const ingest = postSnapshot({ action: 'ingestRequisitions' });
  if (!ingest || ingest.statusCode !== 200) {
    notifySlackFromGAS(':rotating_light: *refreshRequisitions* failed — ingestRequisitions did not return 200. Check Lambda logs.');
    reqAlert_('Requisition refresh failed. Check Apps Script logs.');
    return;
  }

  const result = postSnapshot({ action: 'getRequisitions' });
  if (!result || !Array.isArray(result.requisitions)) {
    notifySlackFromGAS(':rotating_light: *refreshRequisitions* failed — could not fetch requisitions from snapshot service');
    reqAlert_('Requisition refresh failed. Check Apps Script logs.');
    return;
  }

  const adpInfo  = SpreadsheetApp.openById(REQ_ADP_INFO_ID);
  const mapping  = loadItNeedsMapping_(adpInfo);
  const enriched = result.requisitions.map(function (r) {
    const needs = mapping[normalizeTitle_(r.jobTitle)];
    return Object.assign({}, r, { itNeeds: needs === undefined ? null : needs });
  });
  const relevant = enriched.filter(function (r) {
    return REQ_LISTED_STATUSES.indexOf(r.status) !== -1 && hasItRelevance_(r);
  });

  writeRequisitionsTab_(adpInfo, relevant);
  const sent = emailPendingAlerts_(enriched.filter(function (r) { return r.pendingAlert; }));

  console.log(`refreshRequisitions: ${relevant.length} listed, digest=${sent}`);
  reqAlert_(`Open Requisitions refreshed: ${relevant.length} listed. ${sent}`);
}

/** Header row → need names; returns { normalizedTitle: [needs...] }. A listed title with no boxes = no IT needs. */
function loadItNeedsMapping_(adpInfo) {
  const sheet = adpInfo.getSheetByName(REQ_IT_MAPPING_SHEET);
  if (!sheet || sheet.getLastRow() < 2) {
    console.warn(`loadItNeedsMapping_: "${REQ_IT_MAPPING_SHEET}" tab missing or empty — every title will show as unmapped`);
    return {};
  }
  const values  = sheet.getDataRange().getValues();
  const headers = values[0];
  const mapping = {};
  for (let i = 1; i < values.length; i++) {
    const title = normalizeTitle_(values[i][0]);
    if (!title) continue;
    const needs = [];
    for (let c = 1; c < headers.length; c++) {
      const name = String(headers[c] || '').trim();
      if (name && isChecked_(values[i][c])) needs.push(name);
    }
    mapping[title] = needs;
  }
  return mapping;
}

function writeRequisitionsTab_(adpInfo, reqs) {
  const sheet = adpInfo.getSheetByName(REQ_LISTING_SHEET) || adpInfo.insertSheet(REQ_LISTING_SHEET);
  const header = ['Req #', 'Status', 'Job Title', 'Account', 'Account Name', 'Worker Type', 'Openings',
    'Projected Start', 'Replacement', 'Hiring Manager', 'IT Needs', 'First Seen', 'Last Seen'];

  const sorted = reqs.slice().sort(function (a, b) {
    return (a.projectedStartDate || '9999').localeCompare(b.projectedStartDate || '9999');
  });
  const rows = sorted.map(function (r) {
    return [
      r.reqNumber || '', r.statusName || r.status || '', r.jobTitle || '', r.account || '', r.accountName || '',
      r.workerType || '', r.openings || 0, r.projectedStartDate || '', r.isBackfill ? 'Y' : 'N',
      r.hiringManager || '', formatNeeds_(r), r.firstSeenAt || '', r.lastSeenAt || '',
    ];
  });

  sheet.clearContents();
  sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  if (rows.length) sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  sheet.setFrozenRows(1);
}

/** Emails one digest; acks all pending rows (incl. ones with no IT needs) only after success. Returns a status string. */
function emailPendingAlerts_(pending) {
  if (pending.length === 0) return 'No new alerts.';

  const toEmail = pending.filter(function (r) {
    return REQ_LISTED_STATUSES.indexOf(r.status) !== -1 && hasItRelevance_(r);
  });

  if (toEmail.length > 0) {
    const recipients = PropertiesService.getScriptProperties().getProperty('IT_ALERT_EMAILS');
    if (!recipients) {
      notifySlackFromGAS(`:rotating_light: *refreshRequisitions* — ${toEmail.length} requisition alert(s) pending but IT_ALERT_EMAILS is not set. Will retry next run.`);
      return `${toEmail.length} alert(s) NOT emailed (IT_ALERT_EMAILS unset).`;
    }
    try {
      MailApp.sendEmail({
        to:       recipients,
        subject:  `IT heads-up: ${toEmail.length} job requisition update(s)`,
        htmlBody: buildDigestHtml_(toEmail),
      });
    } catch (e) {
      console.error('emailPendingAlerts_: MailApp failed: ' + e.message);
      notifySlackFromGAS(`:rotating_light: *refreshRequisitions* — requisition digest email failed (${e.message}). Will retry next run.`);
      return `${toEmail.length} alert(s) NOT emailed (send failed).`;
    }
  }

  const ack = postSnapshot({
    action: 'ackRequisitionAlerts',
    acks: pending.map(function (r) { return { itemID: r.itemID, pendingAlertAt: r.pendingAlertAt }; }),
  });
  if (!ack || ack.statusCode !== 200) {
    notifySlackFromGAS(':warning: *refreshRequisitions* — digest sent but ackRequisitionAlerts failed; IT may get duplicates next run.');
  }
  return `${toEmail.length} alert(s) emailed.`;
}

function buildDigestHtml_(reqs) {
  const sections = [
    { kind: 'new',      title: 'New openings' },
    { kind: 'reopened', title: 'Now open (reopened)' },
    { kind: 'onHold',   title: 'Heads-up: on hold (not open yet)' },
  ];
  const parts = [];
  sections.forEach(function (s) {
    const items = reqs.filter(function (r) { return r.pendingAlert === s.kind; });
    if (!items.length) return;
    parts.push(`<h3>${s.title} (${items.length})</h3><ul>`);
    items.forEach(function (r) { parts.push(`<li>${buildDigestItem_(r)}</li>`); });
    parts.push('</ul>');
  });
  return parts.join('\n');
}

function buildDigestItem_(r) {
  const e = escapeHtmlReq_;
  const was = r.pendingAlert === 'reopened' && r.prevStatusName ? ` (was ${e(r.prevStatusName)})` : '';
  const lines = [
    `<b>${e(r.jobTitle)}</b> at ${e(r.accountName)} (${e(r.account)})${was}`,
    `Req #${e(r.reqNumber)} · ${e(r.workerType || 'Worker type n/a')} · ${r.openings || 0} opening(s)`,
    `Projected start: ${e(r.projectedStartDate || 'n/a')}`,
    `Replacement: ${r.isBackfill ? 'yes' : 'no'}`,
  ];
  if (r.hiringManager) lines.push(`Hiring manager: ${e(r.hiringManager)}`);
  lines.push(`<b>IT needs:</b> ${e(formatNeeds_(r))}`);
  return lines.join('<br>');
}

function hasItRelevance_(r) {
  return r.itNeeds === null || r.itNeeds.length > 0;
}

function formatNeeds_(r) {
  return r.itNeeds === null ? REQ_UNMAPPED : r.itNeeds.join(', ');
}

function normalizeTitle_(t) {
  return String(t || '').trim().toLowerCase();
}

function isChecked_(v) {
  return v === true || ['y', 'yes', 'x', 'true'].indexOf(String(v).trim().toLowerCase()) !== -1;
}

function escapeHtmlReq_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** UI alert only when run interactively (time-driven triggers have no UI). */
function reqAlert_(msg) {
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    console.log(msg);
  }
}

/** Run once from the editor after the Lambda deploy: populates the table without raising alerts. */
function seedRequisitions() {
  const result = postSnapshot({ action: 'ingestRequisitions', seed: true });
  console.log('seedRequisitions: ' + JSON.stringify(result && result.counts));
}

/** Run from the editor: fetch + diff without writing to DynamoDB or emailing. */
function dryRunRequisitions() {
  const result = postSnapshot({ action: 'ingestRequisitions', dryRun: true });
  if (!result) {
    console.error('dryRunRequisitions: no result');
    return;
  }
  console.log('counts: ' + JSON.stringify(result.counts) + ' seed=' + result.seed);
  console.log('sample: ' + JSON.stringify(result.sample, null, 2));
  (result.alerts || []).forEach(function (a) {
    console.log(`would alert ${a.pendingAlert}: req ${a.reqNumber} ${a.jobTitle} @ ${a.account} (${a.status})`);
  });
}

/** Daily ~7am (script timezone America/New_York). Removes existing triggers for this handler first. */
function createDailyRequisitionsTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'refreshRequisitions') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('refreshRequisitions').timeBased().everyDays(1).atHour(7).create();
  reqAlert_('Daily trigger created: refreshRequisitions will run every day at ~7am.');
}
