function getJobDescriptionsByCategory(category) {
  var adpInfoSheet = SpreadsheetApp.openById('1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE').getSheetByName('Global Job Title Requirements');
  var headers = adpInfoSheet.getRange("A1:Z1").getValues()[0];
  var columnIndex = headers.indexOf(category) + 1; // +1 because getRange is 1-based

  if (columnIndex === 0) {
    throw new Error('Category not found');
  }

  var jobDescriptions = _.flattenDeep(adpInfoSheet.getRange(3, columnIndex, adpInfoSheet.getLastRow() - 2, 1).getValues().filter(function (n) { return n[0] != '' }));
  var uniqueJobDescriptions = Array.from(new Set(jobDescriptions)); // De-duplicate the array
  return uniqueJobDescriptions;
}

function sampleJobDescription() {
  // Example usage:
  var fpmJobDescriptions = getJobDescriptionsByCategory('FPM');
  var fhJobDescriptions = getJobDescriptionsByCategory('FH');
  var alcJobDescriptions = getJobDescriptionsByCategory('ABC');
  var allergenJobDescriptions = getJobDescriptionsByCategory('ATM');
  var allergenLiteJobDescriptions = getJobDescriptionsByCategory('ATL');

  console.log('fpmJobDescriptions: ' + fpmJobDescriptions + ' // total: ' + fpmJobDescriptions.length);
  console.log('fhJobDescriptions: ' + fhJobDescriptions + ' // total: ' + fhJobDescriptions.length);
  console.log('alcJobDescriptions: ' + alcJobDescriptions + ' // total: ' + alcJobDescriptions.length);
  console.log('allergenJobDescriptions: ' + allergenJobDescriptions + ' // total: ' + allergenJobDescriptions.length);
  console.log('allergenLiteJobDescriptions: ' + allergenLiteJobDescriptions + ' // total: ' + allergenLiteJobDescriptions.length);
}

function getMGUCourseRoleByCode(code) {
  var adpInfoSheet = SpreadsheetApp.openById('1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE').getSheetByName('MGU Courses by Role');
  var headers = adpInfoSheet.getRange("A1:Z1").getValues()[0];
  var columnIndex = headers.indexOf(code) + 1; // +1 because getRange is 1-based

  if (columnIndex === 0) {
    throw new Error('Category not found');
  }

  var mguCourseJobTitles = _.flattenDeep(adpInfoSheet.getRange(3, columnIndex, adpInfoSheet.getLastRow() - 2, 1).getValues().filter(function (n) { return n[0] != '' }));
  var uniqueMguCourseJobTitles = Array.from(new Set(mguCourseJobTitles)); // De-duplicate the array
  return uniqueMguCourseJobTitles;
}

function sampleMGUCourseJobTitles() {
  // Example usage:
  var prod101JobTitles = getMGUCourseRoleByCode('PROD101');
  var chef101JobTitles = getMGUCourseRoleByCode('CHEF101');
  var dir101JobTitles = getMGUCourseRoleByCode('DIR101');
  var mgr101JobTitles = getMGUCourseRoleByCode('MGR101');
  var mgr203JobTitles = getMGUCourseRoleByCode('MGR203');

  console.log('prod101JobTitles: ' + prod101JobTitles + ' // total: ' + prod101JobTitles.length);
  console.log('chef101JobTitles: ' + chef101JobTitles + ' // total: ' + chef101JobTitles.length);
  console.log('dir101JobTitles: ' + dir101JobTitles + ' // total: ' + dir101JobTitles.length);
  console.log('mgr101JobTitles: ' + mgr101JobTitles + ' // total: ' + mgr101JobTitles.length);
  console.log('mgr203JobTitles: ' + mgr203JobTitles + ' // total: ' + mgr203JobTitles.length);
}

function getRegionalDataByFilter(category){
  var adpInfoSheet = SpreadsheetApp.openById('1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE').getSheetByName('Regional Job Title Requirements');
  var headers = adpInfoSheet.getRange("A1:Z1").getValues()[0];
  var columnIndex = headers.indexOf(category) + 1; // +1 because getRange is 1-based

  if (columnIndex === 0) {
    throw new Error('Category not found');
  }

  var regionalData = _.flattenDeep(adpInfoSheet.getRange(2, columnIndex, adpInfoSheet.getLastRow() - 2, 1).getValues().filter(function (n) { return n[0] != '' }));
  var uniqueRegionalData = Array.from(new Set(regionalData)); // De-duplicate the array
  return uniqueRegionalData;
}

function sampleRegionalData() {
  // Example usage:
  var floaterNames = getRegionalDataByFilter('Floater Name');
  var floatRegionalSupport = getRegionalDataByFilter('Floating/Regional Support');
  var mocoAccounts = getRegionalDataByFilter('Moco Accounts');
  var sflsSupport = getRegionalDataByFilter('SFLS Support');
  var dcAccounts = getRegionalDataByFilter('DC Accounts');
  var naFoodCardJobTitles = getRegionalDataByFilter('NA Food Card');

  console.log('floaterNames: ' + floaterNames + ' // total: ' + floaterNames.length);
  console.log('floatRegionalSupport: ' + floatRegionalSupport + ' // total: ' + floatRegionalSupport.length);
  console.log('mocoAccounts: ' + mocoAccounts + ' // total: ' + mocoAccounts.length);
  console.log('sflsSupport: ' + sflsSupport + ' // total: ' + sflsSupport.length);
  console.log('dcAccounts: ' + dcAccounts + ' // total: ' + dcAccounts.length);
  console.log('naFoodCardJobTitles: ' + naFoodCardJobTitles + ' // total: ' + naFoodCardJobTitles.length);
}