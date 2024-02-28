function updateProd101(){
  var roster = retrieveRoster();
  var prod101JobDescriptions = getProd101JobDescriptions();
  var prod101Employees = _.filter(roster.employees, (v) => _.includes(prod101JobDescriptions, v.jobTitle));
  var inserviceDataObject = getInserviceDataAsObject();
  let prod101EmployeeInfo = _.filter(inserviceDataObject, {courseNameCode: 'PROD101'});
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("PROD 101");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 9).clearContent();
  var prod101EmployeeData = [];
  console.log(`Prod 101 Employees: ` + prod101Employees.length);
  for (var i = 0; i < prod101Employees.length; i++) {
  // for (var i = 12; i < 13; i++) {
    let thisEmployee = _.filter(prod101EmployeeInfo, {associateId: prod101Employees[i].associateId});
    if (thisEmployee.length === 0) {
      prod101EmployeeData.push([prod101Employees[i].name, prod101Employees[i].aoid, prod101Employees[i].associateId, prod101Employees[i].account, prod101Employees[i].jobTitle, prod101Employees[i].originalHireDate, 'none' , 'none', 'not compliant'])
    } else {
      let block = [prod101Employees[i].name,prod101Employees[i].aoid,prod101Employees[i].associateId, prod101Employees[i].account, prod101Employees[i].jobTitle, prod101Employees[i].originalHireDate, Utilities.formatDate(new Date(+thisEmployee[0].startDate), "GMT-0500", "MM/dd/yyyy"), Utilities.formatDate(new Date(+thisEmployee[0].completionDate),"GMT-0500", "MM/dd/yyyy"), 'compliant'];
      prod101EmployeeData.push(block)
    }
  }
  sheet.getRange(2,1,prod101EmployeeData.length,9).setValues(prod101EmployeeData)
}

function updateChef101(){
  var roster = retrieveRoster();
  var chef101JobDescriptions = getChef101JobDescriptions();
  var chef101Employees = _.filter(roster.employees, (v) => _.includes(chef101JobDescriptions, v.jobTitle));
  var inserviceDataObject = getInserviceDataAsObject();
  let chef101EmployeeInfo = _.filter(inserviceDataObject, {courseNameCode: 'CHEF101'});
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("CHEF 101");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 9).clearContent();
  var chef101EmployeeData = [];
  console.log(`Chef 101 Employees: ` + chef101Employees.length);
  for (var i = 0; i < chef101Employees.length; i++) {
  // for (var i = 12; i < 13; i++) {
    let thisEmployee = _.filter(chef101EmployeeInfo, {associateId: chef101Employees[i].associateId});
    if (thisEmployee.length === 0) {
      chef101EmployeeData.push([chef101Employees[i].name, chef101Employees[i].aoid, chef101Employees[i].associateId, chef101Employees[i].account, chef101Employees[i].jobTitle, chef101Employees[i].originalHireDate, 'none' , 'none', 'not compliant'])
    } else {
      let block = [chef101Employees[i].name,chef101Employees[i].aoid,chef101Employees[i].associateId, chef101Employees[i].account, chef101Employees[i].jobTitle, chef101Employees[i].originalHireDate, Utilities.formatDate(new Date(+thisEmployee[0].startDate), "GMT-0500", "MM/dd/yyyy"), Utilities.formatDate(new Date(+thisEmployee[0].completionDate),"GMT-0500", "MM/dd/yyyy"), 'compliant'];
      chef101EmployeeData.push(block)
    }
  }
  sheet.getRange(2,1,chef101EmployeeData.length,9).setValues(chef101EmployeeData)
}

function updateDir101(){
  var roster = retrieveRoster();
  var dir101JobDescriptions = getDir101JobDescriptions();
  var dir101Employees = _.filter(roster.employees, (v) => _.includes(dir101JobDescriptions, v.jobTitle));
  var inserviceDataObject = getInserviceDataAsObject();
  let dir101EmployeeInfo = _.filter(inserviceDataObject, {courseNameCode: 'DIR101'});
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DIR 101");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 9).clearContent();
  var dir101EmployeeData = [];
  console.log(`Dir 101 Employees: ` + dir101Employees.length);
  for (var i = 0; i < dir101Employees.length; i++) {
  // for (var i = 12; i < 13; i++) {
    let thisEmployee = _.filter(dir101EmployeeInfo, {associateId: dir101Employees[i].associateId});
    if (thisEmployee.length === 0) {
      dir101EmployeeData.push([dir101Employees[i].name, dir101Employees[i].aoid, dir101Employees[i].associateId, dir101Employees[i].account, dir101Employees[i].jobTitle, dir101Employees[i].originalHireDate, 'none' , 'none', 'not compliant'])
    } else {
      let block = [dir101Employees[i].name, dir101Employees[i].aoid, dir101Employees[i].associateId, dir101Employees[i].account, dir101Employees[i].jobTitle, dir101Employees[i].originalHireDate, Utilities.formatDate(new Date(+thisEmployee[0].startDate), "GMT-0500", "MM/dd/yyyy"), Utilities.formatDate(new Date(+thisEmployee[0].completionDate),"GMT-0500", "MM/dd/yyyy"), 'compliant'];
      dir101EmployeeData.push(block)
    }
  }
  sheet.getRange(2,1,dir101EmployeeData.length,9).setValues(dir101EmployeeData)
}

function updateMgr101(){
  var roster = retrieveRoster();
  var mgr101JobDescriptions = getMgr101JobDescriptions();
  var mgr101Employees = _.filter(roster.employees, (v) => _.includes(mgr101JobDescriptions, v.jobTitle));
  var inserviceDataObject = getInserviceDataAsObject();
  let mgr101EmployeeInfo = _.filter(inserviceDataObject, {courseNameCode: 'MGR101'});
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("MGR 101");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 9).clearContent();
  var mgr101EmployeeData = [];
  console.log(`MGR 101 Employees: ` + mgr101Employees.length);
  for (var i = 0; i < mgr101Employees.length; i++) {
  // for (var i = 12; i < 13; i++) {
    let thisEmployee = _.filter(mgr101EmployeeInfo, {associateId: mgr101Employees[i].associateId});
    if (thisEmployee.length === 0) {
      mgr101EmployeeData.push([mgr101Employees[i].name, mgr101Employees[i].aoid, mgr101Employees[i].associateId, mgr101Employees[i].account, mgr101Employees[i].jobTitle, mgr101Employees[i].originalHireDate, 'none' , 'none', 'not compliant'])
    } else {
      let block = [mgr101Employees[i].name, mgr101Employees[i].aoid, mgr101Employees[i].associateId, mgr101Employees[i].account, mgr101Employees[i].jobTitle, mgr101Employees[i].originalHireDate, Utilities.formatDate(new Date(+thisEmployee[0].startDate), "GMT-0500", "MM/dd/yyyy"), Utilities.formatDate(new Date(+thisEmployee[0].completionDate),"GMT-0500", "MM/dd/yyyy"), 'compliant'];
      mgr101EmployeeData.push(block)
    }
  }
  sheet.getRange(2,1,mgr101EmployeeData.length,9).setValues(mgr101EmployeeData)
}

function updateMgr203(){
  var roster = retrieveRoster();
  var mgr203JobDescriptions = getMgr203JobDescriptions();
  var mgr203Employees = _.filter(roster.employees, (v) => _.includes(mgr203JobDescriptions, v.jobTitle));
  var inserviceDataObject = getInserviceDataAsObject();
  let mgr203EmployeeInfo = _.filter(inserviceDataObject, {courseNameCode: 'MGR203'});
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("MGR 203");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 9).clearContent();
  var mgr203EmployeeData = [];
  console.log(`MGR 203 Employees: ` + mgr203Employees.length);
  for (var i = 0; i < mgr203Employees.length; i++) {
  // for (var i = 12; i < 13; i++) {
    let thisEmployee = _.filter(mgr203EmployeeInfo, {associateId: mgr203Employees[i].associateId});
    if (thisEmployee.length === 0) {
      mgr203EmployeeData.push([mgr203Employees[i].name, mgr203Employees[i].aoid, mgr203Employees[i].associateId, mgr203Employees[i].account, mgr203Employees[i].jobTitle, mgr203Employees[i].originalHireDate, 'none' , 'none', 'not compliant'])
    } else {
      let block = [mgr203Employees[i].name, mgr203Employees[i].aoid, mgr203Employees[i].associateId, mgr203Employees[i].account, mgr203Employees[i].jobTitle, mgr203Employees[i].originalHireDate, Utilities.formatDate(new Date(+thisEmployee[0].startDate), "GMT-0500", "MM/dd/yyyy"), Utilities.formatDate(new Date(+thisEmployee[0].completionDate),"GMT-0500", "MM/dd/yyyy"), 'compliant'];
      mgr203EmployeeData.push(block)
    }
  }
  sheet.getRange(2,1,mgr203EmployeeData.length,9).setValues(mgr203EmployeeData)
}

function getProd101JobDescriptions() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`MGU Courses by Role`);
  var prod101JobDescriptions = _.flattenDeep(adpInfoSheet.getRange("A2:A").getValues().filter(function (n) { return n != '' }));
  // console.log(prod101JobDescriptions);
  return prod101JobDescriptions;
}

function getChef101JobDescriptions() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`MGU Courses by Role`);
  var chef101JobDescriptions = _.flattenDeep(adpInfoSheet.getRange("B2:B").getValues().filter(function (n) { return n != '' }));
  // console.log(chef101JobDescriptions);
  return chef101JobDescriptions;
}

function getDir101JobDescriptions() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`MGU Courses by Role`);
  var dir101JobDescriptions = _.flattenDeep(adpInfoSheet.getRange("C2:C").getValues().filter(function (n) { return n != '' }));
  // console.log(dir101JobDescriptions);
  return dir101JobDescriptions;
}

function getMgr101JobDescriptions() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`MGU Courses by Role`);
  var mgr101JobDescriptions = _.flattenDeep(adpInfoSheet.getRange("D2:D").getValues().filter(function (n) { return n != '' }));
  // console.log(mgr101JobDescriptions);
  return mgr101JobDescriptions;
}

function getMgr203JobDescriptions() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`MGU Courses by Role`);
  var mgr203JobDescriptions = _.flattenDeep(adpInfoSheet.getRange("E2:E").getValues().filter(function (n) { return n != '' }));
  // console.log(mgr203JobDescriptions);
  return mgr203JobDescriptions;
}

function getInserviceDataAsObject(){
  // var inserviceObject = {}
  // var inserviceData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inservice Data").getRange("A2:L").getValues();
  // var inserviceHeaders = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inservice Data").getRange("A1:L1").getValues();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inservice Data');
  var [headers, ...rows] = sheet.getDataRange().getValues();
  headers = ['legalFirstName', 'legalLastName', 'courseNameCode', 'courseNameDescription', 'subjectDescription', 'startDate', 'completionDate', 'associateId', 'categoryDescription', 'comment', 'locationCode', 'fiscalYear']
  var objects = convertToObjects(headers, rows);
  // console.log(objects)
  return objects
}

function convertToObjects(headers, rows) {
  return rows.reduce((ctx, row) => {
    ctx.objects.push(ctx.headers.reduce((item, header, index) => {
      item[header] = row[index];
      return item;
    }, {}));
    return ctx;
  }, { objects: [], headers}).objects;
}