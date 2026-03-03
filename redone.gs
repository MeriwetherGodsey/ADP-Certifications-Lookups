function getFPMJobDescriptions2() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`Training Info`);
  var fpmJobDescriptions = _.flattenDeep(adpInfoSheet.getRange("I3:I").getValues().filter(function (n) { return n != '' }));
  // var fpmJobDescriptions2 = getJobDescriptionsByCategory('FPM')
  console.log('1: ' + fpmJobDescriptions);
  // return fpmJobDescriptions;
  console.log('2: ' + getJobDescriptionsByCategory('FPM'))
}

function getFhJobDescriptions2() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`Training Info`);
  var fhJobDescriptions = _.flattenDeep(adpInfoSheet.getRange("J3:J").getValues().filter(function (n) { return n != '' }));
  console.log('1: ' + fhJobDescriptions);
  // return fhJobDescriptions;
  console.log('2: ' + getJobDescriptionsByCategory('FH'))
}

function getAlcJobDescriptions2() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`Training Info`);
  var alcJobDescriptions = _.flattenDeep(adpInfoSheet.getRange("K3:K").getValues().filter(function (n) { return n != '' }));
  console.log('1: ' + alcJobDescriptions);
  // return alcJobDescriptions;
  console.log('2: ' + getJobDescriptionsByCategory('ALC'))
}

function getAllergenJobDescriptions2() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`Training Info`);
  var allergenJobDescriptions = _.flattenDeep(adpInfoSheet.getRange("L3:L").getValues().filter(function (n) { return n != '' }));
  console.log('1: ' + allergenJobDescriptions);
  // return allergenJobDescriptions;
  console.log('2: ' + getJobDescriptionsByCategory('ATM'))
}

function getManagerSTOPJobDescriptions2() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`Training Info`);
  var managerSTOPJobDescriptions = _.flattenDeep(adpInfoSheet.getRange("N3:N").getValues().filter(function (n) { return n != '' }));
  console.log('1: ' + managerSTOPJobDescriptions);
  // return managerSTOPJobDescriptions;
  console.log('2: ' + getJobDescriptionsByCategory('MGR STOP'))
}


function mergeCellsInRow() {
  var sheetName = '24-25 Required Choice by Group Inservices on Time';
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var row = 1; // Change this to the row number where you want to start merging
  var startColumn = 6; // Column F corresponds to the 6th column
  var numCellsToMerge = 2; // Number of cells to merge together
  var lastColumn = sheet.getLastColumn();

  for (var i = startColumn; i <= lastColumn; i += numCellsToMerge) {
    var range = sheet.getRange(row, i, 1, numCellsToMerge);
    range.merge();
  }
}
