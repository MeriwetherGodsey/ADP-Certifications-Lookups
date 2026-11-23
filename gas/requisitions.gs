/** =======================
 *  Job requisition alerts for IT
 *
 *  Daily flow (refreshRequisitions, run by a time-driven trigger and the menu):
 *    1. Lambda ingestRequisitions — pulls ADP requisitions, marks new / reopened / new-on-hold rows as pendingAlert
 *    2. Lambda getRequisitions    — returns all stored rows
 *    3. Keep only reqs whose job title is listed in ADP Info → "IT Job Titles" (col A, header in row 1)
 *    4. Rewrite ADP Info → "Open Requisitions" (ON/OH reqs with a listed title)
 *    5. Email IT_ALERT_EMAILS daily: updated reqs (or "No updated requisitions") + table of all listed open reqs
 *    6. Lambda ackRequisitionAlerts — only after the email succeeds, so failures retry next run
 *  ======================= */
const REQ_ADP_INFO_ID        = '1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE';
const REQ_IT_TITLES_SHEET    = 'IT Job Titles';
const REQ_LISTING_SHEET      = 'Open Requisitions';
const REQ_LISTED_STATUSES    = ['ON', 'OH'];

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
  const itTitles = loadItTitles_(adpInfo);
  if (!itTitles) {
    // Without the list every alert would be filtered out and then acked — i.e. silently lost
    notifySlackFromGAS(`:rotating_light: *refreshRequisitions* — "${REQ_IT_TITLES_SHEET}" tab in ADP Info is missing or empty. No email sent; alerts stay pending.`);
    reqAlert_(`"${REQ_IT_TITLES_SHEET}" tab is missing or empty — nothing listed or emailed.`);
    return;
  }

  const isItTitle = function (r) { return itTitles.has(normalizeTitle_(r.jobTitle)); };
  const relevant  = result.requisitions.filter(function (r) {
    return REQ_LISTED_STATUSES.indexOf(r.status) !== -1 && isItTitle(r);
  });

  writeRequisitionsTab_(adpInfo, relevant);
  const sent = sendDailyDigest_(result.requisitions.filter(function (r) { return r.pendingAlert; }), relevant, isItTitle);

  console.log(`refreshRequisitions: ${relevant.length} listed, digest=${sent}`);
  reqAlert_(`Open Requisitions refreshed: ${relevant.length} listed. ${sent}`);
}

/** Column A (row 1 = header) → Set of normalized job titles; null if the tab is missing or has no titles. */
function loadItTitles_(adpInfo) {
  const sheet = adpInfo.getSheetByName(REQ_IT_TITLES_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return null;
  const titles = new Set();
  sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().forEach(function (row) {
    const t = normalizeTitle_(row[0]);
    if (t) titles.add(t);
  });
  return titles.size ? titles : null;
}

function writeRequisitionsTab_(adpInfo, reqs) {
  const sheet = adpInfo.getSheetByName(REQ_LISTING_SHEET) || adpInfo.insertSheet(REQ_LISTING_SHEET);
  const header = ['Req #', 'Status', 'Job Title', 'Account', 'Account Name', 'Worker Type', 'Openings',
    'Projected Start', 'Replacement', 'Hiring Manager', 'First Seen', 'Last Seen'];

  const rows = sortByStart_(reqs).map(function (r) {
    return [
      r.reqNumber || '', r.statusName || r.status || '', r.jobTitle || '', r.account || '', r.accountName || '',
      r.workerType || '', r.openings || 0, r.projectedStartDate || '', r.isBackfill ? 'Y' : 'N',
      r.hiringManager || '', r.firstSeenAt || '', r.lastSeenAt || '',
    ];
  });

  sheet.clearContents();
  sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  if (rows.length) sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  sheet.setFrozenRows(1);
}

/**
 * Sends the daily email: section 1 = updates (or "No updated requisitions"), section 2 = every open/on-hold
 * req on the IT job title list. Acks all pending rows (incl. titles not on the list) only after a successful
 * send, so failed sends retry next run. Returns a status string.
 */
function sendDailyDigest_(pending, relevant, isItTitle) {
  const updates = pending.filter(function (r) {
    return REQ_LISTED_STATUSES.indexOf(r.status) !== -1 && isItTitle(r);
  });

  const recipients = PropertiesService.getScriptProperties().getProperty('IT_ALERT_EMAILS');
  if (!recipients) {
    notifySlackFromGAS(`:rotating_light: *refreshRequisitions* — daily requisition email NOT sent: IT_ALERT_EMAILS is not set (${updates.length} update(s) pending, will retry next run).`);
    return `Email NOT sent (IT_ALERT_EMAILS unset); ${updates.length} update(s) pending.`;
  }

  const subject = updates.length
    ? `IT heads-up: ${updates.length} job requisition update(s) · ${relevant.length} open`
    : `IT daily: no requisition updates · ${relevant.length} open`;
  try {
    MailApp.sendEmail({ to: recipients, subject: subject, htmlBody: buildDigestHtml_(updates, relevant) });
  } catch (e) {
    console.error('sendDailyDigest_: MailApp failed: ' + e.message);
    notifySlackFromGAS(`:rotating_light: *refreshRequisitions* — daily requisition email failed (${e.message}). ${updates.length} update(s) will retry next run.`);
    return `Email NOT sent (send failed); ${updates.length} update(s) pending.`;
  }

  if (pending.length === 0) return `Email sent (no updates, ${relevant.length} open).`;
  const ack = postSnapshot({
    action: 'ackRequisitionAlerts',
    acks: pending.map(function (r) { return { itemID: r.itemID, pendingAlertAt: r.pendingAlertAt }; }),
  });
  if (!ack || ack.statusCode !== 200) {
    notifySlackFromGAS(':warning: *refreshRequisitions* — digest sent but ackRequisitionAlerts failed; IT may get duplicates next run.');
  }
  return `Email sent (${updates.length} update(s), ${relevant.length} open).`;
}

function buildDigestHtml_(updates, relevant) {
  const sections = [
    { kind: 'new',      title: 'New openings' },
    { kind: 'reopened', title: 'Now open (reopened)' },
    { kind: 'onHold',   title: 'Heads-up: on hold (not open yet)' },
  ];
  const parts = [`<h2>Updated requisitions (${updates.length})</h2>`];
  if (!updates.length) parts.push('<p>No updated requisitions since the last email.</p>');
  sections.forEach(function (s) {
    const items = updates.filter(function (r) { return r.pendingAlert === s.kind; });
    if (!items.length) return;
    parts.push(`<h3>${s.title} (${items.length})</h3><ul>`);
    items.forEach(function (r) { parts.push(`<li>${buildDigestItem_(r)}</li>`); });
    parts.push('</ul>');
  });

  parts.push(`<h2>All open requisitions on the IT job title list (${relevant.length})</h2>`);
  parts.push(relevant.length ? buildRequisitionsTable_(relevant) : '<p>None.</p>');
  return parts.join('\n');
}

function buildRequisitionsTable_(reqs) {
  const e    = escapeHtmlReq_;
  const cell = 'style="border:1px solid #ccc;padding:4px 8px;text-align:left"';
  const head = ['Req #', 'Status', 'Job Title', 'Account', 'Projected Start', 'Hiring Manager'];
  const rows = sortByStart_(reqs).map(function (r) {
    return '<tr>' + [
      r.reqNumber, r.statusName || r.status, r.jobTitle, `${r.accountName || ''} (${r.account || ''})`,
      r.projectedStartDate || 'n/a', r.hiringManager,
    ].map(function (v) { return `<td ${cell}>${e(v)}</td>`; }).join('') + '</tr>';
  });
  return `<table style="border-collapse:collapse;font-size:13px"><tr>` +
    head.map(function (h) { return `<th ${cell}>${h}</th>`; }).join('') + '</tr>' + rows.join('') + '</table>';
}

function sortByStart_(reqs) {
  return reqs.slice().sort(function (a, b) {
    return (a.projectedStartDate || '9999').localeCompare(b.projectedStartDate || '9999');
  });
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
  return lines.join('<br>');
}

function normalizeTitle_(t) {
  return String(t || '').trim().toLowerCase();
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
