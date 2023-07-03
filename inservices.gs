const today = new Date();

function lookThroughInservicesForCurrentPeriod() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const setupSheet = spreadsheet.getSheetByName('Setup');
  const inserviceDataSheet = spreadsheet.getSheetByName('Inservice Data');
  const requiredInservicesSheet = spreadsheet.getSheetByName('Required Inservices on Time');
  const thisPeriod = setupSheet.getRange("B3").getValue();
  // const thisPeriod = 2;
  const rosterSpreadsheet = spreadsheet.getSheetByName("Roster");
  const rosterArray = rosterSpreadsheet.getRange("C2:C").getValues();
  var accountsArray = rosterArray.flat();
  var uniqueAccounts = [...new Set(accountsArray)].sort();
  var blankAccount = uniqueAccounts.shift();

  var columnToCheck = requiredInservicesSheet.getRange("A:A").getValues();
  var requiredInservicesLastRow = getLastRowSpecial(columnToCheck);
  var requiredInservicesArray = requiredInservicesSheet.getRange(3, 1, requiredInservicesLastRow - 2, 3).getValues();
  for (i = 0; i < requiredInservicesLastRow - 2; i++) {
    if (requiredInservicesArray[i][2] == thisPeriod) {
      processThisRow(requiredInservicesArray, i, uniqueAccounts);
    }
  }
}

function getLastRowSpecial(range) {
  var rowNum = 0;
  var blank = false;
  for (var row = 0; row < range.length; row++) {

    if (range[row][0] === "" && !blank) {
      rowNum = row;
      blank = true;

    } else if (range[row][0] !== "") {
      blank = false;
    };
  };
  return rowNum;
};

function processThisRow(array, i, uniqueAccounts) {
  console.log(array[i][0] + ":" + array[i][1] + " // Period: " + array[i][2] + " // row#: " + (i + 3));
  var fiscalYear = getFiscalYear();
  console.log("Fiscal Year = " + fiscalYear);

  var requiredInservicesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Required Inservices on Time");
  requiredInservicesSheet.getRange(i+3,6).setFormula(`=COUNTIFS('Inservice Data'!$L:$L, "=${fiscalYear}",'Inservice Data'!$C:$C, "="&$A${i+3},'Inservice Data'!$G:$G, ">="&$D${i+3},'Inservice Data'!$G:$G, "<="&$E${i+3}, 'Inservice Data'!$K:$K, "="&LEFT(F$2, FIND(" ", F$2)-1))`);
  requiredInservicesSheet.getRange(i+3,7).setFormula(`=COUNTIF(Roster!$C2:$C,LEFT(G$2, FIND(" ", G$2)-1))`);

  //==COUNTIFS('Inservice Data'!$C:$C, "="&$A3,'Inservice Data'!$G:$G, ">="&$D3,'Inservice Data'!$G:$G, "<="&$E3, 'Inservice Data'!$K:$K, "="&LEFT(F$2, FIND(" ", F$2)-1))
  //=COUNTIF(Roster!C2:C,LEFT(F$2, FIND(" ", F$2)-1))

  var rangeToCopy = requiredInservicesSheet.getRange(i+3,6,1,2);
  rangeToCopy.copyTo(requiredInservicesSheet.getRange(i+3,8,1,(uniqueAccounts.length-1)*2));
  SpreadsheetApp.flush();
  Utilities.sleep(2000);
  SpreadsheetApp.flush();
  // var rangeToCopyPasteValues = requiredInservicesSheet.getRange(i+3,6,1,(uniqueAccounts.length*2));
  // rangeToCopyPasteValues.copyTo(requiredInservicesSheet.getRange(i+3,6),SpreadsheetApp.CopyPasteType.PASTE_VALUES,false);
}

function testDates() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Required Inservices on Time");
  var startDate = new Date(sheet.getRange("C27").getValue());
  var endDate = new Date(sheet.getRange("D27").getValue());
  var today = new Date();

  (today > startDate) ? (console.log('after start')) : (console.log('before start'));
  (today < endDate) ? (console.log('before end')) : (console.log('after end'));
}

function testPasteValues(){
  var requiredInservicesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Required Inservices on Time");
  var rangeToCopyPasteValues = requiredInservicesSheet.getRange(27,5,1,36)
  rangeToCopyPasteValues.copyTo(requiredInservicesSheet.getRange(27,5),SpreadsheetApp.CopyPasteType.PASTE_VALUES,false);
}


function getFiscalYear(){
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