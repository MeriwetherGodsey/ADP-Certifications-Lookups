// function getNAFoodCardCerts() {
//   var roster = retrieveRoster();
//   var today = new Date();
//   const pluralize = (count, noun, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;
//   var naFoodCardJobDescriptions = getRegionalDataByFilter('NA Food Card');
//   // console.log(naFoodCardJobDescriptions);
//   var naCrew = _.filter(roster.employees, { "account": "NA" });
//   // console.log(naCrew);
//   var naFoodCardCrew = _.filter(naCrew, (v) => _.includes(naFoodCardJobDescriptions, v.jobTitle));
//   // console.log(naFoodCardCrew);
//   // var floatRegionalJobDescriptions = getRegionalDataByFilter('Floating/Regional Support');
//   // var floatRegionalCrew = _.filter(roster.employees, (v) => _.includes(floatRegionalJobDescriptions, v.jobTitle));
//   // var naEmployees = _.concat(naFoodCardCrew, floatRegionalCrew)
//   var naEmployees = naFoodCardCrew;
//   var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Norfolk Food Cards");
//   var lastRow = sheet.getLastRow();
//   sheet.getRange(2, 1, lastRow, 7).clearContent();
//   var row = 2;
//   console.log(`NA Employees: ` + naEmployees.length);
//   for (var i = 0; i < naEmployees.length; i++) {
//     var found = false;
//     sheet.getRange(row, 1).setValue(naEmployees[i].name);
//     console.log((i + 1) + `/` + naEmployees.length + ` - ` + naEmployees[i].name);
//     sheet.getRange(row, 2).setValue(naEmployees[i].aoid);
//     sheet.getRange(row, 3).setValue(naEmployees[i].account);
//     sheet.getRange(row, 4).setValue(naEmployees[i].jobTitle);
//     var employeeCertifications = lookupSingleEmployeeCertifications(naEmployees[i].aoid);
//     var employeeCertData;
//     if (employeeCertifications.hasOwnProperty("data")) {
//       employeeCertData = employeeCertifications.data.associateCertifications;
//     } else {
//       employeeCertData = {}
//     }
//     if (JSON.stringify(employeeCertData) !== `{}`) {
//       // console.log(JSON.stringify(employeeCertData))
//       for (j = 0; j < employeeCertData.length; j++) {
//         if (employeeCertData[j].hasOwnProperty("categoryCode")) {
//           if (
//             employeeCertData[j].certificationNameCode.longName ==
//             `Food Protection Manager` &&
//             employeeCertData[j].categoryCode.codeValue == "C" &&
//             found == false
//           ) {
//             sheet
//               .getRange(row, 5)
//               .setValue(employeeCertData[j].certificationNameCode.longName);
//             sheet.getRange(row, 6).setValue(employeeCertData[j].expirationDate);
//             found = true;
//             if (employeeCertData[j].expirationDate !== undefined) {
//               var expDate = new Date(employeeCertData[j].expirationDate);
//               var dateDiff = (expDate - today) / (1000 * 60 * 60 * 24);
//               if (dateDiff > 180) {
//                 sheet.getRange(row, 7).setValue(`Current`);
//               } else if (dateDiff > 0) {
//                 sheet
//                   .getRange(row, 7)
//                   .setValue(
//                     `Expiring in ` +
//                     pluralize(Math.floor(dateDiff / 30), `month`)
//                   );
//               } else {
//                 sheet.getRange(row, 7).setValue(`EXPIRED`);
//               }
//             } else {
//               sheet.getRange(row, 7).setValue(`EXPIRED`);
//             }
//           } else if (employeeCertData[j].certificationNameCode.longName == `Norfolk Food Safety Card` && employeeCertData[j].categoryCode.codeValue == "C" &&
//             found == false) {
//             sheet.getRange(row, 5).setValue(employeeCertData[j].certificationNameCode.longName);
//             sheet.getRange(row, 6).setValue(employeeCertData[j].expirationDate);
//             found = true;
//             // console.log(employeeCertData[j].expirationDate)
//             if (employeeCertData[j].expirationDate !== undefined) {
//               var expDate = new Date(employeeCertData[j].expirationDate);
//               var dateDiff = ((expDate - today) / (1000 * 60 * 60 * 24));
//               if (dateDiff > 180) {
//                 sheet.getRange(row, 7).setValue(`Current`);
//               } else if (dateDiff > 0) {
//                 sheet.getRange(row, 7).setValue(`Expiring in ` + pluralize(Math.floor(dateDiff / 30), `month`));
//               } else {
//                 sheet.getRange(row, 7).setValue(`EXPIRED`);
//               }
//             } else {
//               sheet.getRange(row, 7).setValue(`NEEDS`);
//             };
//           }
//         } else if (employeeCertData[j].certificationNameCode.longName == `Norfolk Food Safety Card` && found == false) {
//           sheet.getRange(row, 7).setValue(`NEEDS`);
//         };
//       };
//       if (!found) {
//         sheet.getRange(row, 5).setValue(`Norfolk Food Safety Card`)
//         sheet.getRange(row, 7).setValue(`NEEDS`)
//         // console.log(found)
//       }
//       found = false;
//     } else {
//       console.log('no cert data')
//       sheet.getRange(row, 7).setValue(`NEEDS`);
//     }
//     row++;
//   }
// }

// function getMocoFoodCardCerts(){
//   var roster = retrieveRoster();
//   var today = new Date();
//   const pluralize = (count, noun, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;
//   var fpmJobDescriptions = getJobDescriptionsByCategory('FPM');
//   var mocoAccounts = getRegionalDataByFilter('Moco Accounts');
//   var fpmEmployees = _.filter(roster.employees, (v) => _.includes(fpmJobDescriptions, v.jobTitle));
//   var mocoFpmEployees = _.filter(fpmEmployees, (v) => _.includes(mocoAccounts, v.account));
//   var sflsSupportJobDescriptions = getRegionalDataByFilter('SFLS Support');
//   var sflsSupportEmployees = _.filter(roster.employees, (v) => _.includes(sflsSupportJobDescriptions, v.jobTitle));
//   var sflsSupport = _.filter(sflsSupportEmployees, {"account": "SFUS"});
//   // var floatRegionalJobDescriptions = getRegionalDataByFilter('Floating/Regional Support');
//   // var floatRegionalCrew = _.filter(roster.employees, (v) => _.includes(floatRegionalJobDescriptions, v.jobTitle));
//   // var mocoFoodCardEmployees = _.concat(mocoFpmEployees, sflsSupport, floatRegionalCrew)
//   var mocoFoodCardEmployees = _.concat(mocoFpmEployees, sflsSupport)
//   var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("MoCo MD Food Cards");
//   var lastRow = sheet.getLastRow();
//   sheet.getRange(2, 1, lastRow, 7).clearContent();
//   var row = 2;
//   console.log(`MoCo FoodCard Employees: ` + mocoFoodCardEmployees.length);
//   for (var i = 0; i < mocoFoodCardEmployees.length; i++) {
//     var found = false;
//     sheet.getRange(row, 1).setValue(mocoFoodCardEmployees[i].name);
//     console.log((i + 1) + `/` + mocoFoodCardEmployees.length + ` - ` + mocoFoodCardEmployees[i].name);
//     sheet.getRange(row, 2).setValue(mocoFoodCardEmployees[i].aoid);
//     sheet.getRange(row, 3).setValue(mocoFoodCardEmployees[i].account);
//     sheet.getRange(row, 4).setValue(mocoFoodCardEmployees[i].jobTitle);
//     var employeeCertifications = lookupSingleEmployeeCertifications(mocoFoodCardEmployees[i].aoid);
//     var employeeCertData;
//     if (employeeCertifications.hasOwnProperty("data")) {
//       employeeCertData = employeeCertifications.data.associateCertifications;
//     } else {
//       employeeCertData = {}
//     }
//     if (JSON.stringify(employeeCertData) !== `{}`) {
//       // console.log(JSON.stringify(employeeCertData))
//       for (j = 0; j < employeeCertData.length; j++) {
//         if (employeeCertData[j].hasOwnProperty("categoryCode")) {
//           if (employeeCertData[j].certificationNameCode.longName == `Montgomery Co MD- Food Safety Card` && employeeCertData[j].categoryCode.codeValue == "C" &&
//             found == false) {
//             sheet.getRange(row, 5).setValue(employeeCertData[j].certificationNameCode.longName);
//             sheet.getRange(row, 6).setValue(employeeCertData[j].expirationDate);
//             found = true;
//             // console.log(employeeCertData[j].expirationDate)
//             if (employeeCertData[j].expirationDate !== undefined) {
//               var expDate = new Date(employeeCertData[j].expirationDate);
//               var dateDiff = ((expDate - today) / (1000 * 60 * 60 * 24));
//               if (dateDiff > 180) {
//                 sheet.getRange(row, 7).setValue(`Current`);
//               } else if (dateDiff > 0) {
//                 sheet.getRange(row, 7).setValue(`Expiring in ` + pluralize(Math.floor(dateDiff / 30), `month`));
//               } else {
//                 sheet.getRange(row, 7).setValue(`EXPIRED`);
//               }
//             } else {
//               sheet.getRange(row, 7).setValue(`NEEDS`);
//             };
//           }
//         } else if (employeeCertData[j].certificationNameCode.longName == `Montgomery Co MD- Food Safety Card` && found == false) {
//           sheet.getRange(row, 7).setValue(`NEEDS`);
//         };
//       };
//       if (!found) {
//         sheet.getRange(row, 5).setValue(`Montgomery Co MD- Food Safety Card`)
//         sheet.getRange(row, 7).setValue(`NEEDS`)
//         // console.log(found)
//       }
//       found = false;
//     } else {
//       console.log('no cert data')
//       sheet.getRange(row, 7).setValue(`NEEDS`);
//     }
//     row++;
//   }
// }

// function getDCFoodCardCerts(){
//   var roster = retrieveRoster();
//   var today = new Date();
//   const pluralize = (count, noun, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;
//   var fpmJobDescriptions = getJobDescriptionsByCategory('FPM');
//   var dcAccounts = getRegionalDataByFilter('DC Accounts');
//   var fpmEmployees = _.filter(roster.employees, (v) => _.includes(fpmJobDescriptions, v.jobTitle));
//   var dcFpmEployees = _.filter(fpmEmployees, (v) => _.includes(dcAccounts, v.account));
//   // var floatRegionalJobDescriptions = getRegionalDataByFilter('Floating/Regional Support');
//   // var floatRegionalCrew = _.filter(roster.employees, (v) => _.includes(floatRegionalJobDescriptions, v.jobTitle));
//   // var dcFoodCardEmployees = _.concat(dcFpmEployees, floatRegionalCrew)
//   var dcFoodCardEmployees = dcFpmEployees;
//   var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DC Food Cards");
//   var lastRow = sheet.getLastRow();
//   sheet.getRange(2, 1, lastRow, 7).clearContent();
//   var row = 2;
//   console.log(`DC FoodCard Employees: ` + dcFoodCardEmployees.length);
//   for (var i = 0; i < dcFoodCardEmployees.length; i++) {
//     var found = false;
//     sheet.getRange(row, 1).setValue(dcFoodCardEmployees[i].name);
//     console.log((i + 1) + `/` + dcFoodCardEmployees.length + ` - ` + dcFoodCardEmployees[i].name);
//     sheet.getRange(row, 2).setValue(dcFoodCardEmployees[i].aoid);
//     sheet.getRange(row, 3).setValue(dcFoodCardEmployees[i].account);
//     sheet.getRange(row, 4).setValue(dcFoodCardEmployees[i].jobTitle);
//     var employeeCertifications = lookupSingleEmployeeCertifications(dcFoodCardEmployees[i].aoid);
//     var employeeCertData;
//     if (employeeCertifications.hasOwnProperty("data")) {
//       employeeCertData = employeeCertifications.data.associateCertifications;
//     } else {
//       employeeCertData = {}
//     }
//     if (JSON.stringify(employeeCertData) !== `{}`) {
//       // console.log(JSON.stringify(employeeCertData))
//       for (j = 0; j < employeeCertData.length; j++) {
//         if (employeeCertData[j].hasOwnProperty("categoryCode")) {
//           if (employeeCertData[j].certificationNameCode.longName == `DC Food Safety Card` && employeeCertData[j].categoryCode.codeValue == "C" &&
//             found == false) {
//             sheet.getRange(row, 5).setValue(employeeCertData[j].certificationNameCode.longName);
//             sheet.getRange(row, 6).setValue(employeeCertData[j].expirationDate);
//             found = true;
//             // console.log(employeeCertData[j].expirationDate)
//             if (employeeCertData[j].expirationDate !== undefined) {
//               var expDate = new Date(employeeCertData[j].expirationDate);
//               var dateDiff = ((expDate - today) / (1000 * 60 * 60 * 24));
//               if (dateDiff > 180) {
//                 sheet.getRange(row, 7).setValue(`Current`);
//               } else if (dateDiff > 0) {
//                 sheet.getRange(row, 7).setValue(`Expiring in ` + pluralize(Math.floor(dateDiff / 30), `month`));
//               } else {
//                 sheet.getRange(row, 7).setValue(`EXPIRED`);
//               }
//             } else {
//               sheet.getRange(row, 7).setValue(`NEEDS`);
//             };
//           }
//         } else if (employeeCertData[j].certificationNameCode.longName == `DC Food Safety Card` && found == false) {
//           sheet.getRange(row, 7).setValue(`NEEDS`);
//         };
//       };
//       if (!found) {
//         sheet.getRange(row, 5).setValue(`DC Food Safety Card`)
//         sheet.getRange(row, 7).setValue(`NEEDS`)
//         // console.log(found)
//       }
//       found = false;
//     } else {
//       console.log('no cert data')
//       sheet.getRange(row, 7).setValue(`NEEDS`);
//     }
//     row++;
//   }
// }

// function getMocoPaFoodCardCerts(){
//   var roster = retrieveRoster();
//   var today = new Date();
//   const pluralize = (count, noun, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;
//   var fpmJobDescriptions = getJobDescriptionsByCategory('FPM');
//   var mocoPaAccounts = getRegionalDataByFilter('MCPA Accounts');
//   var fpmEmployees = _.filter(roster.employees, (v) => _.includes(fpmJobDescriptions, v.jobTitle));
//   var mcpaFpmEployees = _.filter(fpmEmployees, (v) => _.includes(mocoPaAccounts, v.account));
//   // var floatRegionalJobDescriptions = getRegionalDataByFilter('Floating/Regional Support');
//   // var floatRegionalCrew = _.filter(roster.employees, (v) => _.includes(floatRegionalJobDescriptions, v.jobTitle));
//   // var mocoPaFoodCardEmployees = _.concat(mcpaFpmEployees, floatRegionalCrew)
//   var mocoPaFoodCardEmployees = mcpaFpmEployees;
//   var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("MoCo PA Food Cards");
//   var lastRow = sheet.getLastRow();
//   sheet.getRange(2, 1, lastRow, 7).clearContent();
//   var row = 2;
//   console.log(`MoCoPa FoodCard Employees: ` + mocoPaFoodCardEmployees.length);
//   for (var i = 0; i < mocoPaFoodCardEmployees.length; i++) {
//     var found = false;
//     sheet.getRange(row, 1).setValue(mocoPaFoodCardEmployees[i].name);
//     console.log((i + 1) + `/` + mocoPaFoodCardEmployees.length + ` - ` + mocoPaFoodCardEmployees[i].name);
//     sheet.getRange(row, 2).setValue(mocoPaFoodCardEmployees[i].aoid);
//     sheet.getRange(row, 3).setValue(mocoPaFoodCardEmployees[i].account);
//     sheet.getRange(row, 4).setValue(mocoPaFoodCardEmployees[i].jobTitle);
//     var employeeCertifications = lookupSingleEmployeeCertifications(mocoPaFoodCardEmployees[i].aoid);
//     var employeeCertData;
//     if (employeeCertifications.hasOwnProperty("data")) {
//       employeeCertData = employeeCertifications.data.associateCertifications;
//     } else {
//       employeeCertData = {}
//     }
//     if (JSON.stringify(employeeCertData) !== `{}`) {
//       // console.log(JSON.stringify(employeeCertData))
//       for (j = 0; j < employeeCertData.length; j++) {
//         if (employeeCertData[j].hasOwnProperty("categoryCode")) {
//           if (employeeCertData[j].certificationNameCode.longName == `Montgomery County PA - Food Safety Card` && employeeCertData[j].categoryCode.codeValue == "C" &&
//             found == false) {
//             sheet.getRange(row, 5).setValue(employeeCertData[j].certificationNameCode.longName);
//             sheet.getRange(row, 6).setValue(employeeCertData[j].expirationDate);
//             found = true;
//             // console.log(employeeCertData[j].expirationDate)
//             if (employeeCertData[j].expirationDate !== undefined) {
//               var expDate = new Date(employeeCertData[j].expirationDate);
//               var dateDiff = ((expDate - today) / (1000 * 60 * 60 * 24));
//               if (dateDiff > 180) {
//                 sheet.getRange(row, 7).setValue(`Current`);
//               } else if (dateDiff > 0) {
//                 sheet.getRange(row, 7).setValue(`Expiring in ` + pluralize(Math.floor(dateDiff / 30), `month`));
//               } else {
//                 sheet.getRange(row, 7).setValue(`EXPIRED`);
//               }
//             } else {
//               sheet.getRange(row, 7).setValue(`NEEDS`);
//             };
//           }
//         } else if (employeeCertData[j].certificationNameCode.longName == `Montgomery County PA - Food Safety Card` && found == false) {
//           sheet.getRange(row, 7).setValue(`NEEDS`);
//         };
//       };
//       if (!found) {
//         sheet.getRange(row, 5).setValue(`Montgomery County PA - Food Safety Card`)
//         sheet.getRange(row, 7).setValue(`NEEDS`)
//         // console.log(found)
//       }
//       found = false;
//     } else {
//       console.log('no cert data')
//       sheet.getRange(row, 7).setValue(`NEEDS`);
//     }
//     row++;
//   }
// }

// function getPhiladelphiaFoodCardCerts(){
//   var roster = retrieveRoster();
//   var today = new Date();
//   const pluralize = (count, noun, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;
//   var fpmJobDescriptions = getJobDescriptionsByCategory('FPM');
//   var philadephiaAccounts = getRegionalDataByFilter('Philadelphia Accounts');
//   var fpmEmployees = _.filter(roster.employees, (v) => _.includes(fpmJobDescriptions, v.jobTitle));
//   var philadelphiaFpmEployees = _.filter(fpmEmployees, (v) => _.includes(philadephiaAccounts, v.account));
//   // var floatRegionalJobDescriptions = getRegionalDataByFilter('Floating/Regional Support');
//   // var floatRegionalCrew = _.filter(roster.employees, (v) => _.includes(floatRegionalJobDescriptions, v.jobTitle));
//   // var mocoPaFoodCardEmployees = _.concat(mcpaFpmEployees, floatRegionalCrew)
//   var philadelphiaFoodCardEmployees = philadelphiaFpmEployees;
//   var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Philadelphia Food Cards");
//   var lastRow = sheet.getLastRow();
//   sheet.getRange(2, 1, lastRow, 7).clearContent();
//   var row = 2;
//   console.log(`Philadelphia FoodCard Employees: ` + philadelphiaFoodCardEmployees.length);
//   for (var i = 0; i < philadelphiaFoodCardEmployees.length; i++) {
//     var found = false;
//     sheet.getRange(row, 1).setValue(philadelphiaFoodCardEmployees[i].name);
//     console.log((i + 1) + `/` + philadelphiaFoodCardEmployees.length + ` - ` + philadelphiaFoodCardEmployees[i].name);
//     sheet.getRange(row, 2).setValue(philadelphiaFoodCardEmployees[i].aoid);
//     sheet.getRange(row, 3).setValue(philadelphiaFoodCardEmployees[i].account);
//     sheet.getRange(row, 4).setValue(philadelphiaFoodCardEmployees[i].jobTitle);
//     var employeeCertifications = lookupSingleEmployeeCertifications(philadelphiaFoodCardEmployees[i].aoid);
//     var employeeCertData;
//     if (employeeCertifications.hasOwnProperty("data")) {
//       employeeCertData = employeeCertifications.data.associateCertifications;
//     } else {
//       employeeCertData = {}
//     }
//     if (JSON.stringify(employeeCertData) !== `{}`) {
//       // console.log(JSON.stringify(employeeCertData))
//       for (j = 0; j < employeeCertData.length; j++) {
//         if (employeeCertData[j].hasOwnProperty("categoryCode")) {
//           if (employeeCertData[j].certificationNameCode.longName == `City of Philadelphia Food Card` && employeeCertData[j].categoryCode.codeValue == "C" &&
//             found == false) {
//             sheet.getRange(row, 5).setValue(employeeCertData[j].certificationNameCode.longName);
//             sheet.getRange(row, 6).setValue(employeeCertData[j].expirationDate);
//             found = true;
//             // console.log(employeeCertData[j].expirationDate)
//             if (employeeCertData[j].expirationDate !== undefined) {
//               var expDate = new Date(employeeCertData[j].expirationDate);
//               var dateDiff = ((expDate - today) / (1000 * 60 * 60 * 24));
//               if (dateDiff > 180) {
//                 sheet.getRange(row, 7).setValue(`Current`);
//               } else if (dateDiff > 0) {
//                 sheet.getRange(row, 7).setValue(`Expiring in ` + pluralize(Math.floor(dateDiff / 30), `month`));
//               } else {
//                 sheet.getRange(row, 7).setValue(`EXPIRED`);
//               }
//             } else {
//               sheet.getRange(row, 7).setValue(`NEEDS`);
//             };
//           }
//         } else if (employeeCertData[j].certificationNameCode.longName == `City of Philadelphia Food Card` && found == false) {
//           sheet.getRange(row, 7).setValue(`NEEDS`);
//         };
//       };
//       if (!found) {
//         sheet.getRange(row, 5).setValue(`City of Philadelphia Food Card`)
//         sheet.getRange(row, 7).setValue(`NEEDS`)
//         // console.log(found)
//       }
//       found = false;
//     } else {
//       console.log('no cert data')
//       sheet.getRange(row, 7).setValue(`NEEDS`);
//     }
//     row++;
//   }
// }

function getCertificationStatus(expirationDate) {
  if (!expirationDate) return "EXPIRED";  // Covers undefined/null
  var today = new Date();
  var expDate = new Date(expirationDate);
  var dateDiff = (expDate - today) / (1000 * 60 * 60 * 24);  // Days difference

  if (dateDiff > 120) {
    return "Current";
  } else if (dateDiff > 0) {
    return "PENDING EXPIRATION";
  } else {
    return "EXPIRED";
  }
}

function getNAFoodCardCerts() {
  var roster = retrieveRoster();
  var naFoodCardJobDescriptions = getRegionalDataByFilter('NA Food Card');
  var naCrew = _.filter(roster.employees, { "account": "NA" });
  var naEmployees = _.filter(naCrew, (v) => _.includes(naFoodCardJobDescriptions, v.jobTitle));
  console.log(`NA Employees: ` + naEmployees.length);
  writeFoodCardSheet_('Norfolk Food Cards', naEmployees,
    ['Food Protection Manager', 'Norfolk Food Safety Card'], 'Norfolk Food Safety Card');
}

function getMocoFoodCardCerts() {
  var roster = retrieveRoster();
  var fpmJobDescriptions = getJobDescriptionsByCategory('FPM');
  var mocoAccounts = getRegionalDataByFilter('Moco Accounts');
  var fpmEmployees = _.filter(roster.employees, (v) => _.includes(fpmJobDescriptions, v.jobTitle));
  var mocoFpmEmployees = _.filter(fpmEmployees, (v) => _.includes(mocoAccounts, v.account));
  var sflsSupportJobDescriptions = getRegionalDataByFilter('SFLS Support');
  var sflsSupportEmployees = _.filter(roster.employees, (v) => _.includes(sflsSupportJobDescriptions, v.jobTitle));
  var sflsSupport = _.filter(sflsSupportEmployees, { 'account': 'SFUS' });
  var mocoFoodCardEmployees = _.concat(mocoFpmEmployees, sflsSupport);
  console.log(`MoCo FoodCard Employees: ` + mocoFoodCardEmployees.length);
  writeFoodCardSheet_('MoCo MD Food Cards', mocoFoodCardEmployees,
    ['Montgomery Co MD- Food Safety Card'], 'Montgomery Co MD- Food Safety Card');
}

function getDCFoodCardCerts() {
  var roster = retrieveRoster();
  var fpmJobDescriptions = getJobDescriptionsByCategory('FPM');
  var dcAccounts = getRegionalDataByFilter('DC Accounts');
  var fpmEmployees = _.filter(roster.employees, (v) => _.includes(fpmJobDescriptions, v.jobTitle));
  var dcFoodCardEmployees = _.filter(fpmEmployees, (v) => _.includes(dcAccounts, v.account));
  console.log(`DC FoodCard Employees: ` + dcFoodCardEmployees.length);
  writeFoodCardSheet_('DC Food Cards', dcFoodCardEmployees,
    ['DC Food Safety Card'], 'DC Food Safety Card');
}

function getMocoPaFoodCardCerts() {
  var roster = retrieveRoster();
  var fpmJobDescriptions = getJobDescriptionsByCategory('FPM');
  var mocoPaAccounts = getRegionalDataByFilter('MCPA Accounts');
  var fpmEmployees = _.filter(roster.employees, (v) => _.includes(fpmJobDescriptions, v.jobTitle));
  var mocoPaFoodCardEmployees = _.filter(fpmEmployees, (v) => _.includes(mocoPaAccounts, v.account));
  console.log(`MoCo PA FoodCard Employees: ` + mocoPaFoodCardEmployees.length);
  writeFoodCardSheet_('MoCo PA Food Cards', mocoPaFoodCardEmployees,
    ['Montgomery County PA - Food Safety Card'], 'Montgomery County PA - Food Safety Card');
}

function getPhiladelphiaFoodCardCerts() {
  var roster = retrieveRoster();
  var fpmJobDescriptions = getJobDescriptionsByCategory('FPM');
  var philadephiaAccounts = getRegionalDataByFilter('Philadelphia Accounts');
  var fpmEmployees = _.filter(roster.employees, (v) => _.includes(fpmJobDescriptions, v.jobTitle));
  var philadelphiaFoodCardEmployees = _.filter(fpmEmployees, (v) => _.includes(philadephiaAccounts, v.account));
  console.log(`Philadelphia FoodCard Employees: ` + philadelphiaFoodCardEmployees.length);
  writeFoodCardSheet_('Philadelphia Food Cards', philadelphiaFoodCardEmployees,
    ['City of Philadelphia Food Card'], 'City of Philadelphia Food Card');
}

/** =========================
 *  Shared food card sheet writer
 *  employees: array of { name, aoid, account, jobTitle }
 *  certNames: array of cert longNames to match
 *  defaultCertLabel: shown in col E when no cert found
 *  ========================= */
function writeFoodCardSheet_(sheetName, employees, certNames, defaultCertLabel) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 7).clearContent();
  if (!employees.length) return;

  var certNameSet = new Set(certNames);
  var certMap = lookupCertificationsForEmployeesBatch_(employees);
  var normAoid = (v) => decodeURIComponent(String(v || '')).trim();

  var output = employees.map(function(emp) {
    var aoid    = normAoid(emp.aoid);
    var entry   = certMap[aoid];
    var certData = entry && entry.statusCode === 200
      ? (entry.data.associateCertifications || []) : [];

    var certName = defaultCertLabel;
    var expDate  = '';
    var status   = 'EXPIRED';

    for (var j = 0; j < certData.length; j++) {
      var cert = certData[j];
      if (cert.categoryCode && cert.categoryCode.codeValue === 'C' &&
          certNameSet.has(cert.certificationNameCode.longName)) {
        certName = cert.certificationNameCode.longName;
        expDate  = cert.expirationDate || '';
        status   = getCertificationStatus(expDate);
        break;
      }
    }

    return [emp.name || '', aoid, emp.account || '', emp.jobTitle || '', certName, expDate, status];
  });

  output.sort(function(a, b) { return String(a[0]).localeCompare(String(b[0])); });
  sheet.getRange(2, 1, output.length, 7).setValues(output);
}
