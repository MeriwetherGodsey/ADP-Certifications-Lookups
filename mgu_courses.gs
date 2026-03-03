function updateProd101(){
  var roster = retrieveRoster();
  var prod101JobDescriptions = getMGUCourseRoleByCode('PROD101');
  var prod101Employees = _.filter(roster.employees, (v) => _.includes(prod101JobDescriptions, v.jobTitle));
  console.log(typeof prod101Employees[0].positionStartDate);
  var inserviceDataObject = getInserviceDataAsObject();
  let prod101EmployeeInfo = _.filter(inserviceDataObject, {courseNameCode: 'PROD101'});
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("PROD 101");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 10).clearContent();
  var prod101EmployeeData = [];
  console.log(`Prod 101 Employees: ` + prod101Employees.length);
  for (var i = 0; i < prod101Employees.length; i++) {
    let thisEmployee = _.filter(prod101EmployeeInfo, {associateId: prod101Employees[i].associateId});
    if (thisEmployee.length === 0) {
      prod101EmployeeData.push([prod101Employees[i].name, prod101Employees[i].aoid, prod101Employees[i].associateId, prod101Employees[i].account, prod101Employees[i].jobTitle, formatDate(prod101Employees[i].originalHireDate), formatDate(prod101Employees[i].positionStartDate),'none' , 'none', 'not compliant'])
    } else {
      let block = [prod101Employees[i].name,prod101Employees[i].aoid,prod101Employees[i].associateId, prod101Employees[i].account, prod101Employees[i].jobTitle, formatDate(prod101Employees[i].originalHireDate), formatDate(prod101Employees[i].positionStartDate), Utilities.formatDate(new Date(+thisEmployee[0].startDate), "GMT-0500", "MM/dd/yyyy"), Utilities.formatDate(new Date(+thisEmployee[0].completionDate),"GMT-0500", "MM/dd/yyyy"), 'compliant'];
      prod101EmployeeData.push(block)
    }
  }
  sheet.getRange(2,1,prod101EmployeeData.length,10).setValues(prod101EmployeeData)
}

function updateChef101(){
  var roster = retrieveRoster();
  var chef101JobDescriptions = getMGUCourseRoleByCode('CHEF101');
  var chef101Employees = _.filter(roster.employees, (v) => _.includes(chef101JobDescriptions, v.jobTitle));
  var inserviceDataObject = getInserviceDataAsObject();
  let chef101EmployeeInfo = _.filter(inserviceDataObject, {courseNameCode: 'CHEF101'});
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("CHEF 101");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 10).clearContent();
  var chef101EmployeeData = [];
  console.log(`Chef 101 Employees: ` + chef101Employees.length);
  for (var i = 0; i < chef101Employees.length; i++) {
    let thisEmployee = _.filter(chef101EmployeeInfo, {associateId: chef101Employees[i].associateId});
    if (thisEmployee.length === 0) {
      chef101EmployeeData.push([chef101Employees[i].name, chef101Employees[i].aoid, chef101Employees[i].associateId, chef101Employees[i].account, chef101Employees[i].jobTitle, formatDate(chef101Employees[i].originalHireDate), formatDate(chef101Employees[i].positionStartDate), 'none' , 'none', 'not compliant'])
    } else {
      let block = [chef101Employees[i].name,chef101Employees[i].aoid,chef101Employees[i].associateId, chef101Employees[i].account, chef101Employees[i].jobTitle, formatDate(chef101Employees[i].originalHireDate), formatDate(chef101Employees[i].positionStartDate), Utilities.formatDate(new Date(+thisEmployee[0].startDate), "GMT-0500", "MM/dd/yyyy"), Utilities.formatDate(new Date(+thisEmployee[0].completionDate),"GMT-0500", "MM/dd/yyyy"), 'compliant'];
      chef101EmployeeData.push(block)
    }
  }
  sheet.getRange(2,1,chef101EmployeeData.length,10).setValues(chef101EmployeeData)
}

function updateDir101(){
  var roster = retrieveRoster();
  var dir101JobDescriptions = getMGUCourseRoleByCode('DIR101');
  var dir101Employees = _.filter(roster.employees, (v) => _.includes(dir101JobDescriptions, v.jobTitle));
  var inserviceDataObject = getInserviceDataAsObject();
  let dir101EmployeeInfo = _.filter(inserviceDataObject, {courseNameCode: 'DIR101'});
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DIR 101");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 10).clearContent();
  var dir101EmployeeData = [];
  console.log(`Dir 101 Employees: ` + dir101Employees.length);
  for (var i = 0; i < dir101Employees.length; i++) {
    let thisEmployee = _.filter(dir101EmployeeInfo, {associateId: dir101Employees[i].associateId});
    if (thisEmployee.length === 0) {
      dir101EmployeeData.push([dir101Employees[i].name, dir101Employees[i].aoid, dir101Employees[i].associateId, dir101Employees[i].account, dir101Employees[i].jobTitle, formatDate(dir101Employees[i].originalHireDate), formatDate(dir101Employees[i].positionStartDate), 'none' , 'none', 'not compliant'])
    } else {
      let block = [dir101Employees[i].name, dir101Employees[i].aoid, dir101Employees[i].associateId, dir101Employees[i].account, dir101Employees[i].jobTitle, formatDate(dir101Employees[i].originalHireDate), formatDate(dir101Employees[i].positionStartDate), Utilities.formatDate(new Date(+thisEmployee[0].startDate), "GMT-0500", "MM/dd/yyyy"), Utilities.formatDate(new Date(+thisEmployee[0].completionDate),"GMT-0500", "MM/dd/yyyy"), 'compliant'];
      dir101EmployeeData.push(block)
    }
  }
  sheet.getRange(2,1,dir101EmployeeData.length,10).setValues(dir101EmployeeData)
}

function updateMgr101(){
  var roster = retrieveRoster();
  var mgr101JobDescriptions = getMGUCourseRoleByCode('MGR101');
  var mgr101Employees = _.filter(roster.employees, (v) => _.includes(mgr101JobDescriptions, v.jobTitle));
  var inserviceDataObject = getInserviceDataAsObject();
  let mgr101EmployeeInfo = _.filter(inserviceDataObject, {courseNameCode: 'MGR101'});
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("MGR 101");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 10).clearContent();
  var mgr101EmployeeData = [];
  console.log(`MGR 101 Employees: ` + mgr101Employees.length);
  for (var i = 0; i < mgr101Employees.length; i++) {
    let thisEmployee = _.filter(mgr101EmployeeInfo, {associateId: mgr101Employees[i].associateId});
    if (thisEmployee.length === 0) {
      mgr101EmployeeData.push([mgr101Employees[i].name, mgr101Employees[i].aoid, mgr101Employees[i].associateId, mgr101Employees[i].account, mgr101Employees[i].jobTitle, formatDate(mgr101Employees[i].originalHireDate), formatDate(mgr101Employees[i].positionStartDate), 'none' , 'none', 'not compliant'])
    } else {
      let block = [mgr101Employees[i].name, mgr101Employees[i].aoid, mgr101Employees[i].associateId, mgr101Employees[i].account, mgr101Employees[i].jobTitle, formatDate(mgr101Employees[i].originalHireDate), formatDate(mgr101Employees[i].positionStartDate), Utilities.formatDate(new Date(+thisEmployee[0].startDate), "GMT-0500", "MM/dd/yyyy"), Utilities.formatDate(new Date(+thisEmployee[0].completionDate),"GMT-0500", "MM/dd/yyyy"), 'compliant'];
      mgr101EmployeeData.push(block)
    }
  }
  sheet.getRange(2,1,mgr101EmployeeData.length,10).setValues(mgr101EmployeeData)
}

function updateMgr203(){
  var roster = retrieveRoster();
  var mgr203JobDescriptions = getMGUCourseRoleByCode('MGR203');
  var mgr203Employees = _.filter(roster.employees, (v) => _.includes(mgr203JobDescriptions, v.jobTitle));
  var inserviceDataObject = getInserviceDataAsObject();
  let mgr203EmployeeInfo = _.filter(inserviceDataObject, {courseNameCode: 'MGR203'});
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("MGR 203");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 10).clearContent();
  var mgr203EmployeeData = [];
  console.log(`MGR 203 Employees: ` + mgr203Employees.length);
  for (var i = 0; i < mgr203Employees.length; i++) {
    let thisEmployee = _.filter(mgr203EmployeeInfo, {associateId: mgr203Employees[i].associateId});
    if (thisEmployee.length === 0) {
      mgr203EmployeeData.push([mgr203Employees[i].name, mgr203Employees[i].aoid, mgr203Employees[i].associateId, mgr203Employees[i].account, mgr203Employees[i].jobTitle, formatDate(mgr203Employees[i].originalHireDate), formatDate(mgr203Employees[i].positionStartDate), 'none' , 'none', 'not compliant'])
    } else {
      let block = [mgr203Employees[i].name, mgr203Employees[i].aoid, mgr203Employees[i].associateId, mgr203Employees[i].account, mgr203Employees[i].jobTitle, formatDate(mgr203Employees[i].originalHireDate), formatDate(mgr203Employees[i].positionStartDate), Utilities.formatDate(new Date(+thisEmployee[0].startDate), "GMT-0500", "MM/dd/yyyy"), Utilities.formatDate(new Date(+thisEmployee[0].completionDate),"GMT-0500", "MM/dd/yyyy"), 'compliant'];
      mgr203EmployeeData.push(block)
    }
  }
  sheet.getRange(2,1,mgr203EmployeeData.length,10).setValues(mgr203EmployeeData)
}

function updateCat201(){
  var roster = retrieveRoster();
  var cat201JobDescriptions = getMGUCourseRoleByCode('CAT201');
  var cat201Employees = _.filter(roster.employees, (v) => _.includes(cat201JobDescriptions, v.jobTitle));
  var vaAccounts = getRegionalDataByFilter('VA Accounts');
  var cat201VAEmployees = _.filter(cat201Employees, (v) => _.includes(vaAccounts, v.account));
  var inserviceDataObject = getInserviceDataAsObject();
  let cat201EmployeeInfo = _.filter(inserviceDataObject, {courseNameCode: 'CAT201'});
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("CAT 201");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 10).clearContent();
  var cat201EmployeeData = [];
  console.log(`CAT 201 Employees: ` + cat201VAEmployees.length);
  for (var i = 0; i < cat201VAEmployees.length; i++) {
    let thisEmployee = _.filter(cat201EmployeeInfo, {associateId: cat201VAEmployees[i].associateId});
    if (thisEmployee.length === 0) {
      cat201EmployeeData.push([cat201VAEmployees[i].name, cat201VAEmployees[i].aoid, cat201VAEmployees[i].associateId, cat201VAEmployees[i].account, cat201VAEmployees[i].jobTitle, formatDate(cat201VAEmployees[i].originalHireDate), formatDate(cat201VAEmployees[i].positionStartDate), 'none' , 'none', 'not compliant'])
    } else {
      let block = [cat201VAEmployees[i].name, cat201VAEmployees[i].aoid, cat201VAEmployees[i].associateId, cat201VAEmployees[i].account, cat201VAEmployees[i].jobTitle, formatDate(cat201VAEmployees[i].originalHireDate), formatDate(cat201VAEmployees[i].positionStartDate), Utilities.formatDate(new Date(+thisEmployee[0].startDate), "GMT-0500", "MM/dd/yyyy"), Utilities.formatDate(new Date(+thisEmployee[0].completionDate),"GMT-0500", "MM/dd/yyyy"), 'compliant'];
      cat201EmployeeData.push(block)
    }
  }
  sheet.getRange(2,1,cat201EmployeeData.length,10).setValues(cat201EmployeeData)
}

function getInserviceDataAsObject(){
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

function formatDate(originalDateString) {
    // Parse the original date string to a Date object
    const date = new Date(originalDateString);

    // Ensure the date is valid
    if (!isNaN(date.getTime())) {
        // Extract the month, year, and day, adjusting month for 0-index
        let month = date.getMonth() + 1;
        let year = date.getFullYear();
        let day = date.getDate();

        // Format month and day to ensure two digits
        month = month < 10 ? '0' + month : month;
        day = day < 10 ? '0' + day : day;

        // Concatenate to get the desired format mm/yy/dddd
        // Note: Adjusted to mm/dd/yyyy as it seems to be the intended format
        return `${month}/${day}/${year}`;
    } else {
        return 'Invalid date';
    }
}