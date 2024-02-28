function getNAFoodCardCerts() {
  var roster = retrieveRoster();
  var today = new Date();
  const pluralize = (count, noun, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;
  var naFoodCardJobDescriptions = getNaFoodCardJobDescriptions();
  // console.log(naFoodCardJobDescriptions);
  var naCrew = _.filter(roster.employees, { "account": "NA" });
  // console.log(naCrew);
  var naFoodCardCrew = _.filter(naCrew, (v) => _.includes(naFoodCardJobDescriptions, v.jobTitle));
  // console.log(naFoodCardCrew);
  var floatRegionalJobDescriptions = getFloatRegionalJobDescriptions();
  var floatRegionalCrew = _.filter(roster.employees, (v) => _.includes(floatRegionalJobDescriptions, v.jobTitle));
  var naEmployees = _.concat(naFoodCardCrew, floatRegionalCrew)
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Norfolk Food Cards");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 7).clearContent();
  var row = 2;
  console.log(`NA Employees: ` + naEmployees.length);
  for (var i = 0; i < naEmployees.length; i++) {
    var found = false;
    sheet.getRange(row, 1).setValue(naEmployees[i].name);
    console.log((i + 1) + `/` + naEmployees.length + ` - ` + naEmployees[i].name);
    sheet.getRange(row, 2).setValue(naEmployees[i].aoid);
    sheet.getRange(row, 3).setValue(naEmployees[i].account);
    sheet.getRange(row, 4).setValue(naEmployees[i].jobTitle);
    var employeeCertifications = lookupSingleEmployeeCertifications(naEmployees[i].aoid);
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
          if (
            employeeCertData[j].certificationNameCode.longName ==
            `Food Protection Manager` &&
            employeeCertData[j].categoryCode.codeValue == "C" &&
            found == false
          ) {
            sheet
              .getRange(row, 5)
              .setValue(employeeCertData[j].certificationNameCode.longName);
            sheet.getRange(row, 6).setValue(employeeCertData[j].expirationDate);
            found = true;
            if (employeeCertData[j].expirationDate !== undefined) {
              var expDate = new Date(employeeCertData[j].expirationDate);
              var dateDiff = (expDate - today) / (1000 * 60 * 60 * 24);
              if (dateDiff > 180) {
                sheet.getRange(row, 7).setValue(`Current`);
              } else if (dateDiff > 0) {
                sheet
                  .getRange(row, 7)
                  .setValue(
                    `Expiring in ` +
                    pluralize(Math.floor(dateDiff / 30), `month`)
                  );
              } else {
                sheet.getRange(row, 7).setValue(`EXPIRED`);
              }
            } else {
              sheet.getRange(row, 7).setValue(`EXPIRED`);
            }
          } else if (employeeCertData[j].certificationNameCode.longName == `Norfolk Food Safety Card` && employeeCertData[j].categoryCode.codeValue == "C" &&
            found == false) {
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
        } else if (employeeCertData[j].certificationNameCode.longName == `Norfolk Food Safety Card` && found == false) {
          sheet.getRange(row, 7).setValue(`NEEDS`);
        };
      };
      if (!found) {
        sheet.getRange(row, 5).setValue(`Norfolk Food Safety Card`)
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

function getMocoFoodCardCerts(){
  var roster = retrieveRoster();
  var today = new Date();
  const pluralize = (count, noun, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;
  var fpmJobDescriptions = getFPMJobDescriptions();
  var mocoAccounts = getMocoAccounts();
  var fpmEmployees = _.filter(roster.employees, (v) => _.includes(fpmJobDescriptions, v.jobTitle));
  var mocoFpmEployees = _.filter(fpmEmployees, (v) => _.includes(mocoAccounts, v.account));
  var sflsSupportJobDescriptions = getSflsSupportJobDescriptions();
  var sflsSupportEmployees = _.filter(roster.employees, (v) => _.includes(sflsSupportJobDescriptions, v.jobTitle));
  var sflsSupport = _.filter(sflsSupportEmployees, {"account": "SFUS"});
  var floatRegionalJobDescriptions = getFloatRegionalJobDescriptions();
  var floatRegionalCrew = _.filter(roster.employees, (v) => _.includes(floatRegionalJobDescriptions, v.jobTitle));
  var mocoFoodCardEmployees = _.concat(mocoFpmEployees, sflsSupport, floatRegionalCrew)
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("MoCo MD Food Cards");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 7).clearContent();
  var row = 2;
  console.log(`MoCo FoodCard Employees: ` + mocoFoodCardEmployees.length);
  for (var i = 0; i < mocoFoodCardEmployees.length; i++) {
    var found = false;
    sheet.getRange(row, 1).setValue(mocoFoodCardEmployees[i].name);
    console.log((i + 1) + `/` + mocoFoodCardEmployees.length + ` - ` + mocoFoodCardEmployees[i].name);
    sheet.getRange(row, 2).setValue(mocoFoodCardEmployees[i].aoid);
    sheet.getRange(row, 3).setValue(mocoFoodCardEmployees[i].account);
    sheet.getRange(row, 4).setValue(mocoFoodCardEmployees[i].jobTitle);
    var employeeCertifications = lookupSingleEmployeeCertifications(mocoFoodCardEmployees[i].aoid);
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
          if (employeeCertData[j].certificationNameCode.longName == `Montgomery Co Food Safety Card` && employeeCertData[j].categoryCode.codeValue == "C" &&
            found == false) {
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
        } else if (employeeCertData[j].certificationNameCode.longName == `Montgomery Co Food Safety Card` && found == false) {
          sheet.getRange(row, 7).setValue(`NEEDS`);
        };
      };
      if (!found) {
        sheet.getRange(row, 5).setValue(`Montgomery Co Food Safety Card`)
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

function getDCFoodCardCerts(){
  var roster = retrieveRoster();
  var today = new Date();
  const pluralize = (count, noun, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;
  var fpmJobDescriptions = getFPMJobDescriptions();
  var dcAccounts = getDCAccounts();
  var fpmEmployees = _.filter(roster.employees, (v) => _.includes(fpmJobDescriptions, v.jobTitle));
  var dcFpmEployees = _.filter(fpmEmployees, (v) => _.includes(dcAccounts, v.account));
  var floatRegionalJobDescriptions = getFloatRegionalJobDescriptions();
  var floatRegionalCrew = _.filter(roster.employees, (v) => _.includes(floatRegionalJobDescriptions, v.jobTitle));
  var dcFoodCardEmployees = _.concat(dcFpmEployees, floatRegionalCrew)
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DC Food Cards");
  var lastRow = sheet.getLastRow();
  sheet.getRange(2, 1, lastRow, 7).clearContent();
  var row = 2;
  console.log(`DC FoodCard Employees: ` + dcFoodCardEmployees.length);
  for (var i = 0; i < dcFoodCardEmployees.length; i++) {
    var found = false;
    sheet.getRange(row, 1).setValue(dcFoodCardEmployees[i].name);
    console.log((i + 1) + `/` + dcFoodCardEmployees.length + ` - ` + dcFoodCardEmployees[i].name);
    sheet.getRange(row, 2).setValue(dcFoodCardEmployees[i].aoid);
    sheet.getRange(row, 3).setValue(dcFoodCardEmployees[i].account);
    sheet.getRange(row, 4).setValue(dcFoodCardEmployees[i].jobTitle);
    var employeeCertifications = lookupSingleEmployeeCertifications(dcFoodCardEmployees[i].aoid);
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
          if (employeeCertData[j].certificationNameCode.longName == `DC Food Safety Card` && employeeCertData[j].categoryCode.codeValue == "C" &&
            found == false) {
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
        } else if (employeeCertData[j].certificationNameCode.longName == `DC Food Safety Card` && found == false) {
          sheet.getRange(row, 7).setValue(`NEEDS`);
        };
      };
      if (!found) {
        sheet.getRange(row, 5).setValue(`DC Food Safety Card`)
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