/**
 * CONFIG
 */
const ADP_EXPORT_URL = 'https://www.merig.com/exp/adp-export.csv';

/**
 * Main function: downloads the CSV and writes it into a sheet.
 */
function refreshAdpExport() {
  const ADP_EXPORT_URL = 'https://www.merig.com/exp/adp-export.csv';
  const ADP_EXPORT_SHEET_NAME = 'Inservice Data';

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ADP_EXPORT_SHEET_NAME) || ss.insertSheet(ADP_EXPORT_SHEET_NAME);

  const t0 = Date.now();

  const resp = UrlFetchApp.fetch(ADP_EXPORT_URL, {
    method: 'get',
    muteHttpExceptions: true,
    followRedirects: true,
    headers: { 'Cache-Control': 'no-cache' },
  });

  const code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(`Failed to fetch CSV. HTTP ${code}.`);
  }

  const rows = Utilities.parseCsv(resp.getContentText());
  if (!rows || rows.length === 0) throw new Error('CSV returned no rows.');

  // Normalize columns
  const numCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].length < numCols) {
      rows[i] = rows[i].concat(Array(numCols - rows[i].length).fill(''));
    }
  }

  sheet.clearContents();

  const CHUNK_SIZE = 3000; // safe for ~16k rows
  let startRow = 1;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    sheet.getRange(startRow, 1, chunk.length, numCols).setValues(chunk);
    startRow += chunk.length;
  }

  sheet.setFrozenRows(1);

  console.log(`ADP export refreshed: ${rows.length} rows in ${(Date.now() - t0) / 1000}s`);
}


/**
 * Creates a time-driven trigger to refresh daily.
 * Default: every day at 6am in the spreadsheet's timezone.
 */
function createDailyAdpRefreshTrigger() {
  // Remove existing triggers for this function to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'refreshAdpExport') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('refreshAdpExport')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();

  SpreadsheetApp.getUi().alert('Daily trigger created: refreshAdpExport will run every day at ~6am.');
}
