const today = new Date();

function lookThroughInservicesForCurrentPeriod() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setupSheet = ss.getSheetByName('Setup');
  const requiredSheet = ss.getSheetByName('Required Inservices on Time');
  const rosterSheet = ss.getSheetByName("Roster");

  const thisPeriod = setupSheet.getRange("B3").getValue();
  console.log(`Current period from Setup!B3 = ${thisPeriod}`);

  // Build unique accounts from roster column C
  const accountsArray = rosterSheet
    .getRange("C2:C")
    .getValues()
    .flat()
    .filter(Boolean)
    .map(v => v.toString().trim());

  const uniqueAccounts = [...new Set(accountsArray)].sort();
  console.log(`Unique account headers found in Roster!C2:C = ${uniqueAccounts.length}`);

  // Find last row using column A values
  const columnA = requiredSheet.getRange("A:A").getValues();
  const lastRow = getLastRowSpecial(columnA);
  console.log(`Last row detected in Required sheet = ${lastRow}`);
  if (lastRow < 3) return;

  const rows = requiredSheet.getRange(3, 1, lastRow - 2, 3).getValues(); // A..C
  let matched = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowPeriod = rows[i][2]; // column C
    if (rowPeriod == thisPeriod) {
      matched++;
      console.log(`MATCH current period: sheetRow=${i + 3}, inserviceCode=${rows[i][0]}, periodDue=${rowPeriod}`);
      processThisRow(rows, i, uniqueAccounts);
    }
  }

  console.log(`Total rows processed for current period = ${matched}`);
}

function processThisRow(rows, i, uniqueAccounts) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Required Inservices on Time");
  const r = i + 3; // target row

  // Header ref for merged 2-col headers in row 1
  const hdr = 'TRIM(IF(LEN(INDEX($1:$1,COLUMN()))=0,INDEX($1:$1,COLUMN()-1),INDEX($1:$1,COLUMN())))';

  // ✅ Attendance: robust unique Associate IDs count (avoids phantom 1s)
  // Uses IFNA(ROWS(...),0) instead of COUNTA(...) and avoids full-column ranges for stability/perf.
  const fFormula =
    `=IF(` +
      `OR(LEN(${hdr})=0,LEN($A${r})=0,$D${r}="", $E${r}=""),` +
      `0,` +
      `IFNA(` +
        `ROWS(` +
          `UNIQUE(` +
            `FILTER(` +
              `'Inservice Data'!$H$2:$H,` +
              `LEN(TRIM('Inservice Data'!$H$2:$H))>0,` +
              `UPPER(TRIM('Inservice Data'!$K$2:$K))=UPPER(TRIM(${hdr})),` +
              `IFERROR(VALUE('Inservice Data'!$F$2:$F),'Inservice Data'!$F$2:$F)>=$D${r},` +
              `IFERROR(VALUE('Inservice Data'!$F$2:$F),'Inservice Data'!$F$2:$F)<=$E${r},` +
              `UPPER(TRIM('Inservice Data'!$C$2:$C))=UPPER(TRIM($A${r})),` +
              `((TRIM('Inservice Data'!$I$2:$I)="Certification") + (TRIM('Inservice Data'!$I$2:$I)="Proctor"))>0` +
            `)` +
          `)` +
        `),` +
      `0)` +
    `)`;

  // Census: roster count for that account header (counts rows with that account code in Roster!C)
  const gFormula =
    `=IF(LEN(${hdr})=0,0,COUNTIF(FILTER(Roster!$C$2:$C,Roster!$C$2:$C<>""),${hdr}))`;

  // Debug logs
  const inserviceCode = sheet.getRange(r, 1).getValue();
  const start = sheet.getRange(r, 4).getValue();
  const end = sheet.getRange(r, 5).getValue();
  const periodDue = sheet.getRange(r, 3).getValue();
  console.log(`processThisRow -> row=${r}, periodDue=${periodDue}, inservice=${inserviceCode}, start=${start}, end=${end}`);
  console.log(`fFormula(row ${r}): ${fFormula}`);

  // Write formulas
  sheet.getRange(r, 6).setFormula(fFormula);
  sheet.getRange(r, 7).setFormula(gFormula);

  // Copy across pairs (Attendance/Census)
  const pairsToCopy = Math.max(0, (uniqueAccounts.length - 1) * 2);
  if (pairsToCopy > 0) {
    sheet.getRange(r, 6, 1, 2).copyTo(sheet.getRange(r, 8, 1, pairsToCopy));
  }

  // Calculate then freeze
  SpreadsheetApp.flush();
  Utilities.sleep(1500);

  const totalWidth = Math.max(2, uniqueAccounts.length * 2);
  sheet.getRange(r, 6, 1, totalWidth)
    .copyTo(sheet.getRange(r, 6), SpreadsheetApp.CopyPasteType.PASTE_VALUES, false);

  SpreadsheetApp.flush();
}




function testDates() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Required Inservices on Time");
  var startDate = new Date(sheet.getRange("C27").getValue());
  var endDate = new Date(sheet.getRange("D27").getValue());
  var today = new Date();

  (today > startDate) ? (console.log('after start')) : (console.log('before start'));
  (today < endDate) ? (console.log('before end')) : (console.log('after end'));
}

function testPasteValues() {
  var requiredInservicesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Required Inservices on Time");
  var rangeToCopyPasteValues = requiredInservicesSheet.getRange(27, 5, 1, 36)
  rangeToCopyPasteValues.copyTo(requiredInservicesSheet.getRange(27, 5), SpreadsheetApp.CopyPasteType.PASTE_VALUES, false);
}


function getFiscalYear() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const setupSheet = spreadsheet.getSheetByName('Setup');
  var fiscalCell = setupSheet.getRange("B1").getValue();
  var dateCell = new Date(fiscalCell);
  var year = dateCell.getFullYear();
  console.log(year)
  var yearPt2 = year - 2000 + 1;
  console.log(yearPt2);
  var fullFiscalYear = year + "-" + yearPt2;
  console.log(fullFiscalYear);
  return fullFiscalYear;
}

function getLastRowSpecial(colValues2D) {
  // colValues2D looks like [[v1],[v2],...]
  for (let r = colValues2D.length - 1; r >= 0; r--) {
    const v = (colValues2D[r] && colValues2D[r][0]);
    if (v !== '' && v !== null && v !== undefined) return r + 1; // sheet row number
  }
  return 1; // nothing below row 1
}

function lookThroughInservicesUpToCurrentPeriod() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setupSheet = ss.getSheetByName('Setup');
  const requiredSheet = ss.getSheetByName('Required Inservices on Time');
  const rosterSheet = ss.getSheetByName("Roster");

  const thisPeriod = setupSheet.getRange("B3").getValue(); // e.g. period number or date

  // Build unique accounts
  const accountsArray = rosterSheet.getRange("C2:C").getValues().flat().filter(Boolean);
  const uniqueAccounts = [...new Set(accountsArray)].sort();

  // Find last row using column A values
  const columnA = requiredSheet.getRange("A:A").getValues();
  const lastRow = getLastRowSpecial(columnA);
  if (lastRow < 3) return; // nothing to process

  const rows = requiredSheet.getRange(3, 1, lastRow - 2, 3).getValues(); // A..C

  for (let i = 0; i < rows.length; i++) {
    const rowPeriod = rows[i][2]; // column C
    if (!rowPeriod) continue;

    // If periods are numeric or dates, this works as "up to current period"
    if (rowPeriod <= thisPeriod) {
      processThisRow(rows, i, uniqueAccounts);
    }
  }
}

function testEmployeeNamesForHeader() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const roster = ss.getSheetByName("Roster");

  const headerValue = "VCCA";  // change this to test another account

  // Column A = Employee Name
  const names = roster.getRange("A2:A").getValues().flat();

  // Column C = Account Code
  const accounts = roster.getRange("C2:C").getValues().flat();

  let matches = [];

  for (let i = 0; i < accounts.length; i++) {
    if (accounts[i] && accounts[i].toString().trim() === headerValue) {
      matches.push({
        row: i + 2,
        employee: names[i],
        account: accounts[i]
      });
    }
  }

  console.log(`\n=== Employees Assigned to ${headerValue} ===`);
  matches.forEach(m =>
    console.log(`Row ${m.row} — ${m.employee} (${m.account})`)
  );
  console.log(`TOTAL employees found: ${matches.length}`);
}

