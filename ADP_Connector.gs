const _ = LodashGS.load();

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('Manually Update ADP')
    .addItem('Update Roster', 'allActiveEmployees')
    .addSeparator()
    .addItem('Update Food Protection Managers', 'filterFPM')
    .addItem('Update Food Handlers', 'filterFoodHandlers')
    .addItem('Update Alcohol Training', 'filterAlcoholTraining')
    .addItem('Update Allergen Training Managers', 'filterAllergenTraining')
    .addItem('Update Manager STOP Training', 'filterManagerSTOP')
    .addItem('Update Employee STOP Training', 'filterEmployeeSTOP')
    .addItem('Update NA Food Cards', 'getNAFoodCardCerts')
    .addItem('Update DC Food Cards', 'getDCFoodCardCerts')
    .addItem('Update MoCo Food Cards', 'getMocoFoodCardCerts')
    .addItem('Update PROD 101', 'updateProd101')
    .addItem('Update CHEF 101', 'updateChef101')
    .addItem('Update DIR 101', 'updateDir101')
    .addItem('Update MGR 101', 'updateMgr101')
    .addItem('Update MGR 203', 'updateMgr203')
    .addToUi();
}

function postAdp(data) {
  const API_URL = "https://bcinfni2wc.execute-api.us-east-1.amazonaws.com/default/";
  var options = {
    'method': 'post',
    'payload': JSON.stringify(data)
  };
  const response = UrlFetchApp.fetch(API_URL, options);
  console.log(response.getResponseCode())
  const content = JSON.parse(response.getContentText());
  return content;
}

function testHUListEmployees() {
  var data = {
    "data": {
      "method": "GET",
      "domain": "https://api.adp.com",
      "uri": "/hr/v2/workers?",
      "filter": "$filter=workers/workAssignments/homeWorkLocation eq 'NA' and workers/workAssignments/assignmentStatus/statusCode/codeValue eq 'A'"
    }
  };
  var response = postAdp(data);
  var workers = response.data.workers;
  for (i = 0; i < workers.length; i++) {
    console.log(workers[i].person.legalName.familyName1 + `, ` + workers[i].person.legalName.nickName + ` - ` + workers[i].workAssignments[0].positionID);
  }

}

function allActiveEmployees() {
  var roster = {
    "employees": []
  }
  var data = {
    "data": {
      "method": "GET",
      "domain": "https://api.adp.com",
      "uri": "/hr/v2/workers?count=true&$top=100",
      // "filter": "$filter=workers/workAssignments/assignmentStatus/statusCode/codeValue eq 'A'"
      // "filter": "/"
    }
  };
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Roster");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 8).clearContent();
  var response = postAdp(data);
  var totalCount = response.data.meta.totalNumber;
  var workers = response.data.workers;
  var row = 2;
  console.log(`totalCount = ` + totalCount);
  for (i = 0; i < workers.length; i++) {
    for (j = 0; j < workers[i].workAssignments.length; j++) {
      if (workers[i].workAssignments[j].hasOwnProperty((`homeWorkLocation`))) {
        if (workers[i].workAssignments[j].assignmentStatus.statusCode.codeValue == `A`) {
          sheet.getRange(row, 1).setValue(workers[i].person.legalName.familyName1 + `, ` + workers[i].person.legalName.nickName);
          sheet.getRange(row, 2).setValue(workers[i].associateOID);
          sheet.getRange(row, 3).setValue(workers[i].workAssignments[j].homeWorkLocation.nameCode.codeValue);
          sheet.getRange(row, 4).setValue(j);
          sheet.getRange(row, 5).setValue(workers[i].workAssignments[j].jobTitle);
          sheet.getRange(row, 6).setValue(workers[i].workAssignments[j].assignmentStatus.statusCode.codeValue);
          sheet.getRange(row, 7).setValue(workers[i].workerID.idValue);
          sheet.getRange(row, 8).setValue(workers[i].workerDates.originalHireDate);
          console.log(workers[i].person.legalName.familyName1 + `, ` + workers[i].person.legalName.nickName + ` - ` + workers[i].workAssignments[j].assignmentStatus.statusCode.codeValue);
          var employee = {
            "name": workers[i].person.legalName.familyName1 + `, ` + workers[i].person.legalName.nickName,
            "aoid": workers[i].associateOID,
            "account": workers[i].workAssignments[j].homeWorkLocation.nameCode.codeValue,
            "jobTitle": workers[i].workAssignments[j].jobTitle,
            "associateId": workers[i].workerID.idValue,
            "originalHireDate": workers[i].workerDates.originalHireDate
          }
          roster.employees.push(employee);
          row++;
        }
      }
    }
  };
  var loops = Math.floor(totalCount / 100);
  var remainder = totalCount % 100;
  console.log(`Loops: ` + loops);
  console.log(`Remainder: ` + remainder);
  for (var loopCount = 0; loopCount < loops; loopCount++) {
    var data = {
      "data": {
        "method": "GET",
        "domain": "https://api.adp.com",
        "uri": "/hr/v2/workers?count=true&$top=100&$skip=" + (loopCount + 1) * 100 + "",
        // "filter": "$filter=workers/workAssignments/assignmentStatus/statusCode/codeValue eq 'A'"
      }
    }
    console.log(data);
    console.log(loopCount);
    var response = postAdp(data);
    var workers = response.data.workers;
    for (i = 0; i < workers.length; i++) {
      for (j = 0; j < workers[i].workAssignments.length; j++) {
        if (workers[i].workAssignments[j].hasOwnProperty((`homeWorkLocation`))) {
          if (workers[i].workAssignments[j].assignmentStatus.statusCode.codeValue == `A`) {
            sheet.getRange(row, 1).setValue(workers[i].person.legalName.familyName1 + `, ` + workers[i].person.legalName.nickName);
            sheet.getRange(row, 2).setValue(workers[i].associateOID);
            sheet.getRange(row, 3).setValue(workers[i].workAssignments[j].homeWorkLocation.nameCode.codeValue);
            sheet.getRange(row, 4).setValue(j);
            sheet.getRange(row, 5).setValue(workers[i].workAssignments[j].jobTitle);
            sheet.getRange(row, 6).setValue(workers[i].workAssignments[j].assignmentStatus.statusCode.codeValue);
            sheet.getRange(row, 7).setValue(workers[i].workerID.idValue);
            sheet.getRange(row, 8).setValue(workers[i].workerDates.originalHireDate);
            console.log(workers[i].person.legalName.familyName1 + `, ` + workers[i].person.legalName.nickName + ` - ` + workers[i].workAssignments[j].assignmentStatus.statusCode.codeValue);
            var employee = {
              "name": workers[i].person.legalName.familyName1 + `, ` + workers[i].person.legalName.nickName,
              "aoid": workers[i].associateOID,
              "account": workers[i].workAssignments[j].homeWorkLocation.nameCode.codeValue,
              "jobTitle": workers[i].workAssignments[j].jobTitle,
              "associateId": workers[i].workerID.idValue,
              "originalHireDate": workers[i].workerDates.originalHireDate
            }
            roster.employees.push(employee);
            row++;
          }
        }
      }
    };
  }
  var data = {
    "data": {
      "method": "GET",
      "domain": "https://api.adp.com",
      "uri": "/hr/v2/workers?$top=100&$skip=" + loops * 100 + "",
      // "filter": "$filter=workers/workAssignments/assignmentStatus/statusCode/codeValue eq 'A'"
    }
  }
  PropertiesService.getScriptProperties().setProperty("roster", JSON.stringify(roster));
}

//THIS CAUSES AN ERROR BECAUSE totalCount includes employees with `T` StatusCode, without filter commented out

function getFPMJobDescriptions() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`Training Info`);
  var fpmJobDescriptions = _.flattenDeep(adpInfoSheet.getRange("I3:I").getValues().filter(function (n) { return n != '' }));
  // console.log(fpmJobDescriptions);
  return fpmJobDescriptions;
}

function getFhJobDescriptions() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`Training Info`);
  var fhJobDescriptions = _.flattenDeep(adpInfoSheet.getRange("J3:J").getValues().filter(function (n) { return n != '' }));
  console.log(fhJobDescriptions);
  return fhJobDescriptions;
}

function getAlcJobDescriptions() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`Training Info`);
  var alcJobDescriptions = _.flattenDeep(adpInfoSheet.getRange("K3:K").getValues().filter(function (n) { return n != '' }));
  console.log(alcJobDescriptions);
  return alcJobDescriptions;
}

function getAllergenJobDescriptions() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`Training Info`);
  var allergenJobDescriptions = _.flattenDeep(adpInfoSheet.getRange("L3:L").getValues().filter(function (n) { return n != '' }));
  console.log(allergenJobDescriptions);
  return allergenJobDescriptions;
}

function getManagerSTOPJobDescriptions() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`Training Info`);
  var managerSTOPJobDescriptions = _.flattenDeep(adpInfoSheet.getRange("N3:N").getValues().filter(function (n) { return n != '' }));
  return managerSTOPJobDescriptions;
}

function getFloatRegionalJobDescriptions() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`Training Info`);
  var floatRegionalJobDescriptions = _.flattenDeep(adpInfoSheet.getRange("O3:O").getValues().filter(function (n) { return n != '' }));
  return floatRegionalJobDescriptions;
}

function getMocoAccounts() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`Training Info`);
  var mocoAccounts = _.flattenDeep(adpInfoSheet.getRange("P3:P").getValues().filter(function (n) { return n != '' }));
  return mocoAccounts;
}

function getSflsSupportJobDescriptions() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`Training Info`);
  var sflsSupport = _.flattenDeep(adpInfoSheet.getRange("Q3:Q").getValues().filter(function (n) { return n != '' }));
  return sflsSupport;
}

function getNaFoodCardJobDescriptions() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`Training Info`);
  var sflsSupport = _.flattenDeep(adpInfoSheet.getRange("S3:S").getValues().filter(function (n) { return n != '' }));
  return sflsSupport;
}

function getDCAccounts() {
  var adpInfoSheet = SpreadsheetApp.openById(`1fw8-K0oSyRKvCICvIEov4fPLlSPU_yMPKSibi5Z1yBE`).getSheetByName(`Training Info`);
  var dcAccounts = _.flattenDeep(adpInfoSheet.getRange("R3:R").getValues().filter(function (n) { return n != '' }));
  return dcAccounts;
}

function retrieveRoster() {
  var roster = PropertiesService.getScriptProperties().getProperties();
  return JSON.parse(roster.roster);
}

function filterHU() {
  var roster = retrieveRoster();
  var huEmployees = _.filter(roster.employees, { "account": "HU" });
  var fpmJobDescriptions = getFPMJobDescriptions();
  // console.log(huEmployees);
  var huFpmEmployees = _.filter(huEmployees, (v) => _.includes(fpmJobDescriptions, v.jobTitle));
  console.log(huFpmEmployees);
};

function lookupSingleEmployeeCertifications(aoid) {
  var data = {
    "data": {
      "method": "GET",
      "domain": "https://accounts.adp.com",
      "uri": `/talent/v2/associates/${aoid}/associate-certifications`
    }
  };

  var response = postAdp(data);
  return response;
}

function lookupOneEmployeeByAoid() {
  var empAoid = "G3HYJR7WTQ6ZAT4F";
  // var empAoid = "G3P2JAYP101VGQDS";
  var empCerts = lookupSingleEmployeeCertifications(empAoid);
  var empData = empCerts.data.associateCertifications;
  for (i = 0; i < empData.length; i++) {
    console.log(empData[i].certificationNameCode.longName + ` - ` + empData[i].expirationDate);
  }
}

function filterFPM() {
  var roster = retrieveRoster();
  var today = new Date();
  const pluralize = (count, noun, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;
  var fpmJobDescriptions = getFPMJobDescriptions();
  // console.log(roster);
  var fpmEmployees = _.filter(roster.employees, (v) => _.includes(fpmJobDescriptions, v.jobTitle));
  // console.log(fpmEmployees);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Food Protection Manager");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 7).clearContent();
  var row = 2;
  console.log(`fpm Employees: ` + fpmEmployees.length);
  for (var i = 0; i < fpmEmployees.length; i++) {
    var found = false;
    sheet.getRange(row, 1).setValue(fpmEmployees[i].name);
    console.log((i + 1) + `/` + fpmEmployees.length + ` - ` + fpmEmployees[i].name);
    sheet.getRange(row, 2).setValue(fpmEmployees[i].aoid);
    sheet.getRange(row, 3).setValue(fpmEmployees[i].account);
    sheet.getRange(row, 4).setValue(fpmEmployees[i].jobTitle);
    var employeeCertifications = lookupSingleEmployeeCertifications(fpmEmployees[i].aoid);
    var employeeCertData;
    if (employeeCertifications.hasOwnProperty("data")) {
      employeeCertData = employeeCertifications.data.associateCertifications;
    } else {
      employeeCertData = {}
    }
    if (JSON.stringify(employeeCertData) !== `{}`) {
      // console.log(JSON.stringify(employeeCertData))
      for (j = 0; j < employeeCertData.length; j++) {
        if (employeeCertData[j].hasOwnProperty("categoryCode")) {
          if (employeeCertData[j].certificationNameCode.longName == `Food Protection Manager` && employeeCertData[j].categoryCode.codeValue == "C") {
            sheet.getRange(row, 5).setValue(employeeCertData[j].certificationNameCode.longName);
            sheet.getRange(row, 6).setValue(employeeCertData[j].expirationDate);
            found = true;
            // console.log(employeeCertData[j].expirationDate)
            if (employeeCertData[j].expirationDate !== undefined) {
              var expDate = new Date(employeeCertData[j].expirationDate);
              var dateDiff = ((expDate - today) / (1000 * 60 * 60 * 24));
              if (dateDiff > 180) {
                sheet.getRange(row, 7).setValue(`Current`);
              } else if (dateDiff > 0) {
                sheet.getRange(row, 7).setValue(`Expiring in ` + pluralize(Math.floor(dateDiff / 30), `month`));
              } else {
                sheet.getRange(row, 7).setValue(`EXPIRED`);
              }
            } else {
              sheet.getRange(row, 7).setValue(`NEEDS`);
            };
          }
        } else if (employeeCertData[j].certificationNameCode.longName == `Food Protection Manager`) {
          sheet.getRange(row, 7).setValue(`NEEDS`);
        };
      };
      if (!found) {
        sheet.getRange(row, 7).setValue(`NEEDS`)
        // console.log(found)
      }
      found = false;
    } else {
      console.log('no cert data')
      sheet.getRange(row, 7).setValue(`NEEDS`);
    }
    row++;
  }
}

function filterFoodHandlers() {
  //   var roster = retrieveRoster();
  //   var today = new Date();
  //   const pluralize = (count, noun, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;
  //   var fhJobDescriptions = getFhJobDescriptions();
  //   // console.log(roster);
  //   var fhEmployees = _.filter(roster.employees, (v) => _.includes(fhJobDescriptions, v.jobTitle));
  //   // console.log(fpmEmployees);
  //   var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Food Handler");
  //   var lastRow = sheet.getLastRow();
  //   sheet.getRange(2,1,lastRow, 7).clearContent();
  //   var row=2;
  //   console.log(`fh Employees: ` + fhEmployees.length);
  //   for (var i=0;i<fhEmployees.length;i++) {
  //     var found = false;
  //     sheet.getRange(row,1).setValue(fhEmployees[i].name);
  //     console.log((i+1) + `/`+ fhEmployees.length + ` - ` + fhEmployees[i].name);
  //     sheet.getRange(row,2).setValue(fhEmployees[i].aoid);
  //     sheet.getRange(row,3).setValue(fhEmployees[i].account);
  //     sheet.getRange(row,4).setValue(fhEmployees[i].jobTitle);
  //     var employeeCertifications = lookupSingleEmployeeCertifications(fhEmployees[i].aoid);
  //     var employeeCertData;
  //     if (employeeCertifications.hasOwnProperty("data")) {
  //       employeeCertData = employeeCertifications.data.associateCertifications;
  //     } else {
  //       employeeCertData = {}
  //     }
  //     if (JSON.stringify(employeeCertData) !== `{}`) {
  //       for (j=0;j<employeeCertData.length;j++) {
  //         if (employeeCertData[j].hasOwnProperty("categoryCode")) {
  //           if ((employeeCertData[j].certificationNameCode.longName == `Food Protection Manager` && employeeCertData[j].categoryCode.codeValue == "C" && !found)) {
  //             sheet.getRange(row,5).setValue(employeeCertData[j].certificationNameCode.longName);
  //             sheet.getRange(row,6).setValue(employeeCertData[j].expirationDate);
  //             found = true;
  //             if (employeeCertData[j].expirationDate !== undefined) {
  //               var expDate = new Date(employeeCertData[j].expirationDate);
  //               var dateDiff = ((expDate - today) / (1000 * 60 * 60 * 24));
  //               if (dateDiff > 180) {
  //                 sheet.getRange(row,7).setValue(`Current`);  
  //               } else if (dateDiff > 0) {
  //                 sheet.getRange(row,7).setValue(`Expiring in ` + pluralize(Math.floor(dateDiff/30),`month`));  
  //               } else {
  //                 sheet.getRange(row,7).setValue(`EXPIRED`);  
  //               }
  //             } else {
  //               sheet.getRange(row,7).setValue(`NEEDSFP`);
  //             };
  //           }
  //         } else if ((employeeCertData[j].certificationNameCode.longName == `Food Handler` && employeeCertData[j].categoryCode.codeValue == "C" && !found)) {
  //           sheet.getRange(row,5).setValue(employeeCertData[j].certificationNameCode.longName);
  //             sheet.getRange(row,6).setValue(employeeCertData[j].expirationDate);
  //             found = true;
  //             if (employeeCertData[j].expirationDate !== undefined) {
  //               var expDate = new Date(employeeCertData[j].expirationDate);
  //               var dateDiff = ((expDate - today) / (1000 * 60 * 60 * 24));
  //               if (dateDiff > 180) {
  //                 sheet.getRange(row,7).setValue(`Current`);  
  //               } else if (dateDiff > 0) {
  //                 sheet.getRange(row,7).setValue(`Expiring in ` + pluralize(Math.floor(dateDiff/30),`month`));  
  //               } else {
  //                 sheet.getRange(row,7).setValue(`EXPIRED`);  
  //               }
  //             } else {
  //               sheet.getRange(row,7).setValue(`NEEDSFH`);
  //             };  
  //         } else if (employeeCertData[j].certificationNameCode.longName == `Food Handler`&& !found) {
  //           sheet.getRange(row,7).setValue(`NEEDSELSE`);
  //         };  // if FoodHandler and C(urrent) status
  //       };  //if has categoryCode
  //       if (!found) {sheet.getRange(row,7).setValue(`NEEDSNF`)}
  //     } else {
  //     console.log('no cert data')
  //     sheet.getRange(row,7).setValue(`NEEDSX`);
  //   };  // j loop
  //     row++;
  //   } // if no employeeCertData
  // } // i loop
  var roster = retrieveRoster();
  var today = new Date();
  const pluralize = (count, noun, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;
  var fhJobDescriptions = getFhJobDescriptions();
  // console.log(roster);
  var fhEmployees = _.filter(roster.employees, (v) => _.includes(fhJobDescriptions, v.jobTitle));
  // console.log(fpmEmployees);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Food Handler");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 7).clearContent();
  var row = 2;
  console.log(`fh Employees: ` + fhEmployees.length);
  for (var i = 0; i < fhEmployees.length; i++) {
    var found = false;
    sheet.getRange(row, 1).setValue(fhEmployees[i].name);
    console.log((i + 1) + `/` + fhEmployees.length + ` - ` + fhEmployees[i].name);
    sheet.getRange(row, 2).setValue(fhEmployees[i].aoid);
    sheet.getRange(row, 3).setValue(fhEmployees[i].account);
    sheet.getRange(row, 4).setValue(fhEmployees[i].jobTitle);
    var employeeCertifications = lookupSingleEmployeeCertifications(fhEmployees[i].aoid);
    var employeeCertData;
    if (employeeCertifications.hasOwnProperty("data")) {
      employeeCertData = employeeCertifications.data.associateCertifications;
    } else {
      employeeCertData = {}
    }
    if (JSON.stringify(employeeCertData) !== `{}`) {
      for (j = 0; j < employeeCertData.length; j++) {
        if (employeeCertData[j].hasOwnProperty("categoryCode")) {
          if (employeeCertData[j].certificationNameCode.longName == `Food Protection Manager` && employeeCertData[j].categoryCode.codeValue == "C" && found == false) {
            sheet.getRange(row, 5).setValue(employeeCertData[j].certificationNameCode.longName);
            sheet.getRange(row, 6).setValue(employeeCertData[j].expirationDate);
            found = true;
            if (employeeCertData[j].expirationDate !== undefined) {
              var expDate = new Date(employeeCertData[j].expirationDate);
              var dateDiff = ((expDate - today) / (1000 * 60 * 60 * 24));
              if (dateDiff > 180) {
                sheet.getRange(row, 7).setValue(`Current`);
              } else if (dateDiff > 0) {
                sheet.getRange(row, 7).setValue(`Expiring in ` + pluralize(Math.floor(dateDiff / 30), `month`));
              } else {
                sheet.getRange(row, 7).setValue(`EXPIRED`);
              }
            } else {
              sheet.getRange(row, 7).setValue(`EXPIRED`);
            };
          } else if (employeeCertData[j].certificationNameCode.longName == `Food Handler` && employeeCertData[j].categoryCode.codeValue == "C" && found == false) {
            sheet.getRange(row, 5).setValue(employeeCertData[j].certificationNameCode.longName);
            sheet.getRange(row, 6).setValue(employeeCertData[j].expirationDate);
            found = true;
            if (employeeCertData[j].expirationDate !== undefined) {
              var expDate = new Date(employeeCertData[j].expirationDate);
              var dateDiff = ((expDate - today) / (1000 * 60 * 60 * 24));
              if (dateDiff > 180) {
                sheet.getRange(row, 7).setValue(`Current`);
              } else if (dateDiff > 0) {
                sheet.getRange(row, 7).setValue(`Expiring in ` + pluralize(Math.floor(dateDiff / 30), `month`));
              } else {
                sheet.getRange(row, 7).setValue(`EXPIRED`);
              }
            } else {
              sheet.getRange(row, 7).setValue(`EXPIRED`);
            };
            //   } else if (employeeCertData[j].certificationNameCode.longName == `Food Safety Card` && employeeCertData[j].categoryCode.codeValue == "C" && found == false) {
            //     sheet.getRange(row,5).setValue(employeeCertData[j].certificationNameCode.longName);
            //     sheet.getRange(row,6).setValue(employeeCertData[j].expirationDate);
            //     found = true;
            //     if (employeeCertData[j].expirationDate !== undefined) {
            //       var expDate = new Date(employeeCertData[j].expirationDate);
            //       var dateDiff = ((expDate - today) / (1000 * 60 * 60 * 24));
            //       if (dateDiff > 180) {
            //         sheet.getRange(row,7).setValue(`Current`);  
            //       } else if (dateDiff > 0) {
            //         sheet.getRange(row,7).setValue(`Expiring in ` + pluralize(Math.floor(dateDiff/30),`month`));  
            //       } else {
            //         sheet.getRange(row,7).setValue(`EXPIRED`);  
            //       }
            //     } else {
            //       sheet.getRange(row,7).setValue(`EXPIRED`);
            //     };
            //   }
          }
        } else if (employeeCertData[j].certificationNameCode.longName == `Food Handler`) {
          sheet.getRange(row, 7).setValue(`NEEDS`);
        };  // if FoodHandler and C(urrent) status
      };  //if has categoryCode
      if (!found) { sheet.getRange(row, 7).setValue(`NEEDS`) }
    } else {
      console.log('no cert data')
      sheet.getRange(row, 7).setValue(`NEEDS`);
    };  // j loop
    row++;
  } // if no employeeCertData
} // i loop



function filterAlcoholTraining() {
  var roster = retrieveRoster();
  var today = new Date();
  const pluralize = (count, noun, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;
  var alcJobDescriptions = getAlcJobDescriptions();
  // console.log(roster);
  var alcEmployees = _.filter(roster.employees, (v) => _.includes(alcJobDescriptions, v.jobTitle));
  // console.log(alcEmployees);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Alcohol Training");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 7).clearContent();
  var row = 2;
  console.log(`Alc Employees: ` + alcEmployees.length);
  for (var i = 0; i < alcEmployees.length; i++) {
    var found = false;
    sheet.getRange(row, 1).setValue(alcEmployees[i].name);
    console.log((i + 1) + `/` + alcEmployees.length + ` - ` + alcEmployees[i].name);
    sheet.getRange(row, 2).setValue(alcEmployees[i].aoid);
    sheet.getRange(row, 3).setValue(alcEmployees[i].account);
    sheet.getRange(row, 4).setValue(alcEmployees[i].jobTitle);
    var employeeCertifications = lookupSingleEmployeeCertifications(alcEmployees[i].aoid);
    var employeeCertData;
    if (employeeCertifications.hasOwnProperty("data")) {
      employeeCertData = employeeCertifications.data.associateCertifications;
    } else {
      employeeCertData = {}
    }
    if (JSON.stringify(employeeCertData) !== `{}`) {
      for (j = 0; j < employeeCertData.length; j++) {
        if (employeeCertData[j].hasOwnProperty("categoryCode")) {
          if (employeeCertData[j].certificationNameCode.longName == `Alcohol Training` && employeeCertData[j].categoryCode.codeValue == "C") {
            sheet.getRange(row, 5).setValue(employeeCertData[j].certificationNameCode.longName);
            sheet.getRange(row, 6).setValue(employeeCertData[j].expirationDate);
            found = true;
            if (employeeCertData[j].expirationDate !== undefined) {
              var expDate = new Date(employeeCertData[j].expirationDate);
              var dateDiff = ((expDate - today) / (1000 * 60 * 60 * 24));
              if (dateDiff > 180) {
                sheet.getRange(row, 7).setValue(`Current`);
              } else if (dateDiff > 0) {
                sheet.getRange(row, 7).setValue(`Expiring in ` + pluralize(Math.floor(dateDiff / 30), `month`));
              } else {
                sheet.getRange(row, 7).setValue(`EXPIRED`);
              }
            } else {
              sheet.getRange(row, 7).setValue(`NEEDS`);
            };
          };
        } else if (employeeCertData[j].certificationNameCode.longName == `Alcohol Training`) {
          sheet.getRange(row, 7).setValue(`NEEDS`)
        }
      }
      if (!found) {
        sheet.getRange(row, 7).setValue(`NEEDS`)
        // console.log(found)
      }
      found = false;
    } else {
      console.log('no cert data')
      sheet.getRange(row, 7).setValue(`NEEDS`);
    }
    row++;
  }
}

function filterAllergenTraining() {
  var roster = retrieveRoster();
  var today = new Date();
  const pluralize = (count, noun, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;
  var allergenJobDescriptions = getAllergenJobDescriptions();
  // console.log(roster);
  var allergenEmployees = _.filter(roster.employees, (v) => _.includes(allergenJobDescriptions, v.jobTitle));
  // console.log(allergenEmployees);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Allergen Training Manager");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 7).clearContent();
  var row = 2;
  console.log(`Allergen Employees: ` + allergenEmployees.length);
  for (var i = 0; i < allergenEmployees.length; i++) {
    var found = false;
    sheet.getRange(row, 1).setValue(allergenEmployees[i].name);
    console.log((i + 1) + `/` + allergenEmployees.length + ` - ` + allergenEmployees[i].name);
    sheet.getRange(row, 2).setValue(allergenEmployees[i].aoid);
    sheet.getRange(row, 3).setValue(allergenEmployees[i].account);
    sheet.getRange(row, 4).setValue(allergenEmployees[i].jobTitle);
    var employeeCertifications = lookupSingleEmployeeCertifications(allergenEmployees[i].aoid);
    var employeeCertData;
    if (employeeCertifications.hasOwnProperty("data")) {
      employeeCertData = employeeCertifications.data.associateCertifications;
    } else {
      employeeCertData = {}
    }
    if (JSON.stringify(employeeCertData) !== `{}`) {
      for (j = 0; j < employeeCertData.length; j++) {
        if (employeeCertData[j].hasOwnProperty("categoryCode")) {
          if (employeeCertData[j].certificationNameCode.longName == `Allergen Training Manager` && employeeCertData[j].categoryCode.codeValue == "C") {
            sheet.getRange(row, 5).setValue(employeeCertData[j].certificationNameCode.longName);
            sheet.getRange(row, 6).setValue(employeeCertData[j].expirationDate);
            found = true;
            if (employeeCertData[j].expirationDate !== undefined) {
              var expDate = new Date(employeeCertData[j].expirationDate);
              var dateDiff = ((expDate - today) / (1000 * 60 * 60 * 24));
              if (dateDiff > 90) {
                sheet.getRange(row, 7).setValue(`Current`);
              } else if (dateDiff > 0) {
                sheet.getRange(row, 7).setValue(`Expiring in ` + pluralize(Math.floor(dateDiff / 30), `month`));
              } else {
                sheet.getRange(row, 7).setValue(`EXPIRED`);
              }
            } else {
              sheet.getRange(row, 7).setValue(`NEEDS`);
            };
          }
        } else if (employeeCertData[j].certificationNameCode.longName == `Allergen Training Manager`) {
          sheet.getRange(row, 7).setValue(`NEEDS`);
        };
      }
      if (!found) {
        sheet.getRange(row, 7).setValue(`NEEDS`)
      }
      found = false;
    } else {
      console.log('no cert data')
      sheet.getRange(row, 7).setValue(`NEEDS`);
    };
    row++;
  }
}


function testPluralize() {
  const pluralize = (count, noun, suffix = 's') =>
    `${count} ${noun}${count !== 1 ? suffix : ''}`;
  console.log(pluralize(0, `month`));
  console.log(pluralize(1, `month`));
  console.log(pluralize(2, `month`));
}

function showAllFpmJobTitles() {
  var titles = getFPMJobDescriptions();
  console.log(JSON.stringify(titles));
}

function showAllMgrStTOPJobTitles() {
  var titles = getManagerSTOPJobDescriptions();
  console.log(JSON.stringify(titles));
}

function filterManagerSTOP() {
  var roster = retrieveRoster();
  var today = new Date();
  const pluralize = (count, noun, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;
  var managerSTOPJobDescription = getManagerSTOPJobDescriptions();
  // console.log(roster);
  var managerSTOPEmployees = _.filter(roster.employees, (v) => _.includes(managerSTOPJobDescription, v.jobTitle));
  // console.log(managerSTOPEmployees);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Manager STOP");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 7).clearContent();
  var row = 2;
  console.log(`managerSTOP Employees: ` + managerSTOPEmployees.length);
  for (var i = 0; i < managerSTOPEmployees.length; i++) {
    var found = false;
    sheet.getRange(row, 1).setValue(managerSTOPEmployees[i].name);
    console.log((i + 1) + `/` + managerSTOPEmployees.length + ` - ` + managerSTOPEmployees[i].name);
    sheet.getRange(row, 2).setValue(managerSTOPEmployees[i].aoid);
    sheet.getRange(row, 3).setValue(managerSTOPEmployees[i].account);
    sheet.getRange(row, 4).setValue(managerSTOPEmployees[i].jobTitle);
    var employeeCertifications = lookupSingleEmployeeCertifications(managerSTOPEmployees[i].aoid);
    var employeeCertData;
    if (employeeCertifications.hasOwnProperty("data")) {
      employeeCertData = employeeCertifications.data.associateCertifications;
    } else {
      employeeCertData = {}
    }
    if (JSON.stringify(employeeCertData) !== `{}`) {
      // console.log(JSON.stringify(employeeCertData))
      for (j = 0; j < employeeCertData.length; j++) {
        if (employeeCertData[j].hasOwnProperty("categoryCode")) {
          if (employeeCertData[j].certificationNameCode.longName == `MGR Sexual Harassment Prevention` && employeeCertData[j].categoryCode.codeValue == "C") {
            sheet.getRange(row, 5).setValue(employeeCertData[j].certificationNameCode.longName);
            sheet.getRange(row, 6).setValue(employeeCertData[j].expirationDate);
            found = true;
            // console.log(employeeCertData[j].expirationDate)
            if (employeeCertData[j].expirationDate !== undefined) {
              var expDate = new Date(employeeCertData[j].expirationDate);
              var dateDiff = ((expDate - today) / (1000 * 60 * 60 * 24));
              if (dateDiff > 180) {
                sheet.getRange(row, 7).setValue(`Current`);
              } else if (dateDiff > 0) {
                sheet.getRange(row, 7).setValue(`Expiring in ` + pluralize(Math.floor(dateDiff / 30), `month`));
              } else {
                sheet.getRange(row, 7).setValue(`EXPIRED`);
              }
            } else {
              sheet.getRange(row, 7).setValue(`NEEDS`);
            };
          }
        } else if (employeeCertData[j].certificationNameCode.longName == `MGR Sexual Harassment Prevention`) {
          sheet.getRange(row, 7).setValue(`NEEDS`);
        };
      };
      if (!found) {
        sheet.getRange(row, 7).setValue(`NEEDS`)
        // console.log(found)
      }
      found = false;
    } else {
      console.log('no cert data')
      sheet.getRange(row, 7).setValue(`NEEDS`);
    }
    row++;
  }
}

function filterEmployeeSTOP() {
  var fullRoster = retrieveRoster();
  var roster = fullRoster.employees;
  var today = new Date();
  const pluralize = (count, noun, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;
  // var managerSTOPEmployees = _.filter(roster.employees, (v) => _.includes(managerSTOPJobDescription, v.jobTitle));
  // console.log(managerSTOPEmployees);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Employee STOP");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 7).clearContent();
  var row = 2;
  console.log(`managerSTOP Employees: ` + roster.length);
  for (var i = 0; i < roster.length; i++) {
    var found = false;
    sheet.getRange(row, 1).setValue(roster[i].name);
    console.log((i + 1) + `/` + roster.length + ` - ` + roster[i].name);
    sheet.getRange(row, 2).setValue(roster[i].aoid);
    sheet.getRange(row, 3).setValue(roster[i].account);
    sheet.getRange(row, 4).setValue(roster[i].jobTitle);
    var employeeCertifications = lookupSingleEmployeeCertifications(roster[i].aoid);
    var employeeCertData;
    if (employeeCertifications.hasOwnProperty("data")) {
      employeeCertData = employeeCertifications.data.associateCertifications;
    } else {
      employeeCertData = {}
    }
    if (JSON.stringify(employeeCertData) !== `{}`) {
      // console.log(JSON.stringify(employeeCertData))
      for (j = 0; j < employeeCertData.length; j++) {
        if (employeeCertData[j].hasOwnProperty("categoryCode")) {
          if (employeeCertData[j].certificationNameCode.longName == `EMP Sexual Harassment Prevention` && employeeCertData[j].categoryCode.codeValue == "C") {
            sheet.getRange(row, 5).setValue(employeeCertData[j].certificationNameCode.longName);
            sheet.getRange(row, 6).setValue(employeeCertData[j].expirationDate);
            found = true;
            // console.log(employeeCertData[j].expirationDate)
            if (employeeCertData[j].expirationDate !== undefined) {
              var expDate = new Date(employeeCertData[j].expirationDate);
              var dateDiff = ((expDate - today) / (1000 * 60 * 60 * 24));
              if (dateDiff > 180) {
                sheet.getRange(row, 7).setValue(`Current`);
              } else if (dateDiff > 0) {
                sheet.getRange(row, 7).setValue(`Expiring in ` + pluralize(Math.floor(dateDiff / 30), `month`));
              } else {
                sheet.getRange(row, 7).setValue(`EXPIRED`);
              }
            } else {
              sheet.getRange(row, 7).setValue(`NEEDS`);
            };
          }
        } else if (employeeCertData[j].certificationNameCode.longName == `EMP Sexual Harassment Prevention`) {
          sheet.getRange(row, 7).setValue(`NEEDS`);
        };
      };
      if (!found) {
        sheet.getRange(row, 7).setValue(`NEEDS`)
        // console.log(found)
      }
      found = false;
    } else {
      console.log('no cert data')
      sheet.getRange(row, 7).setValue(`NEEDS`);
    }
    row++;
  }
}