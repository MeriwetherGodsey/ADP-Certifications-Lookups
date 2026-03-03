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
    .addItem('Update AllerTrain Lite', 'filterAllergenLite')
    .addItem('Update Manager STOP Training', 'filterManagerSTOP')
    .addItem('Update Employee STOP Training', 'filterEmployeeSTOP')
    .addItem('Update NA Food Cards', 'getNAFoodCardCerts')
    .addItem('Update DC Food Cards', 'getDCFoodCardCerts')
    .addItem('Update MoCo MD Food Cards', 'getMocoFoodCardCerts')
    .addItem('Update MoCo PA Food Cards', 'getMocoPaFoodCardCerts')
    .addItem('Update Philadelphia Food Cards', 'getPhiladelphiaFoodCardCerts')
    .addItem('Update PROD 101', 'updateProd101')
    .addItem('Update CHEF 101', 'updateChef101')
    .addItem('Update DIR 101', 'updateDir101')
    .addItem('Update MGR 101', 'updateMgr101')
    .addItem('Update MGR 203', 'updateMgr203')
    .addItem('Update Inservice Data', 'refreshAdpExport')
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

function postSnapshot(payload) {
  const props = PropertiesService.getScriptProperties();
  const SNAPSHOT_URL = props.getProperty('SNAPSHOT_LAMBDA_URL');
  const secret       = props.getProperty('SNAPSHOT_LAMBDA_SECRET');
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: { 'x-adp-secret': secret || '' },
    muteHttpExceptions: true,
  };
  const response = UrlFetchApp.fetch(SNAPSHOT_URL, options);
  const code = response.getResponseCode();
  if (code !== 200) {
    console.warn(`postSnapshot HTTP ${code}: ${response.getContentText().slice(0, 200)}`);
    return null;
  }
  return JSON.parse(response.getContentText());
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

function testValidationTables() {
  var data = {
    "data": {
      "method": "GET",
      "domain": "https://api.adp.com",
      "uri": "/hcm/v1/validation-tables/person-custom-fields",
      "filter": ""
    }
  };
  var response = postAdp(data);
  var workers = response.data.workers;
  for (i = 0; i < workers.length; i++) {
    console.log(workers[i].person.legalName.familyName1 + `, ` + workers[i].person.legalName.nickName + ` - ` + workers[i].workAssignments[0].positionID);
  }

}

// function allActiveEmployees() {
//   const roster = { employees: [] };

//   const ss = SpreadsheetApp.getActiveSpreadsheet();
//   const sheet = ss.getSheetByName("Roster");

//   // Clear old content (fix range height)
//   const lastRow = sheet.getLastRow();
//   if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 9).clearContent();

//   const TOP = 100;
//   let skip = 0;
//   let totalCount = null;

//   const rows = []; // 2D array for sheet output (A:I)

//   // Helper to call ADP workers endpoint
//   const fetchWorkersPage_ = (skipVal, includeCount) => {
//     const uri = includeCount
//       ? `/hr/v2/workers?count=true&$top=${TOP}&$skip=${skipVal}`
//       : `/hr/v2/workers?$top=${TOP}&$skip=${skipVal}`;

//     const data = {
//       data: {
//         method: "GET",
//         domain: "https://api.adp.com",
//         uri: uri,
//         // If ADP filtering works for you, turn this on to reduce payload:
//         // filter: "$filter=workers/workAssignments/assignmentStatus/statusCode/codeValue eq 'A'"
//       }
//     };

//     return postAdp(data); // keep your existing proxy call
//   };

//   const t0 = Date.now();
//   let pageNum = 0;

//   while (true) {
//     pageNum++;
//     const response = fetchWorkersPage_(skip, pageNum === 1); // only ask for count on page 1
//     if (!response || !response.data) {
//       console.warn(`No response/data from ADP at skip=${skip}. Stopping.`);
//       break;
//     }

//     if (pageNum === 1) {
//       totalCount = response.data?.meta?.totalNumber ?? null;
//       console.log(`totalCount = ${totalCount}`);
//     }

//     const workers = response.data.workers || [];
//     if (workers.length === 0) {
//       console.log(`No workers returned at skip=${skip}. Done.`);
//       break;
//     }

//     // Build rows + roster objects in memory
//     for (let i = 0; i < workers.length; i++) {
//       const w = workers[i];
//       const aoid = w.associateOID || "";
//       const family = w?.person?.legalName?.familyName1 || "";
//       const nick = w?.person?.legalName?.nickName || "";
//       const name = `${family}, ${nick}`.trim().replace(/^, |, $/g, "");

//       const associateId = w?.workerID?.idValue || "";
//       const originalHireDate = w?.workerDates?.originalHireDate || "";

//       const assignments = w.workAssignments || [];
//       for (let j = 0; j < assignments.length; j++) {
//         const a = assignments[j];
//         const status = a?.assignmentStatus?.statusCode?.codeValue;

//         // Only include active assignments with homeWorkLocation
//         const acct = a?.homeWorkLocation?.nameCode?.codeValue;
//         if (!acct) continue;
//         if (status !== "A") continue;

//         const jobTitle = a?.jobTitle || "";
//         const positionId = a?.positionID || "";
//         const positionStartDate = a?.actualStartDate || "";

//         // Sheet row A:I
//         rows.push([
//           name,
//           aoid,
//           acct,
//           j,                 // assignment index
//           jobTitle,
//           positionId,
//           associateId,
//           originalHireDate,
//           positionStartDate
//         ]);

//         // Roster object
//         roster.employees.push({
//           name,
//           aoid,
//           account: acct,
//           jobTitle,
//           associateId,
//           originalHireDate,
//           positionStartDate
//         });
//       }
//     }

//     // Pagination control
//     skip += TOP;

//     // If ADP told us the total, we can stop once we’ve fetched all pages
//     if (totalCount != null && skip >= totalCount) break;

//     // Otherwise stop when last page returned fewer than TOP workers
//     if (workers.length < TOP) break;
//   }

//   // One sheet write
//   if (rows.length) {
//     sheet.getRange(2, 1, rows.length, 9).setValues(rows);
//   }

//   // Persist roster for other scripts
//   PropertiesService.getScriptProperties().setProperty("roster", JSON.stringify(roster));

//   console.log(`Roster built: ${roster.employees.length} active assignments written.`);
//   console.log(`allActiveEmployees done in ${(Date.now() - t0) / 1000}s`);
// }
function allActiveEmployees() {
  const t0 = Date.now();
  const roster = { employees: [] };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Roster');
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 9).clearContent();

  const result = postSnapshot({ action: 'getRoster' });
  if (!result || !Array.isArray(result.employees)) {
    console.error('allActiveEmployees: failed to get roster from snapshot service');
    notifySlackFromGAS(':rotating_light: *allActiveEmployees* failed — could not fetch roster from snapshot service');
    return;
  }

  const rows = [];
  for (let i = 0; i < result.employees.length; i++) {
    const emp = result.employees[i];
    rows.push([
      emp.name           || '',
      emp.aoid           || '',
      emp.account        || '',
      emp.assignmentIdx  || 0,
      emp.jobTitle       || '',
      emp.positionId     || '',
      emp.associateId    || '',
      emp.originalHireDate   || '',
      emp.positionStartDate  || '',
    ]);
    roster.employees.push({
      name:             emp.name        || '',
      aoid:             emp.aoid        || '',
      account:          emp.account     || '',
      jobTitle:         emp.jobTitle    || '',
      associateId:      emp.associateId || '',
      originalHireDate: emp.originalHireDate  || '',
      positionStartDate:emp.positionStartDate || '',
    });
  }

  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  roster.employees.sort((a, b) => String(a.name).localeCompare(String(b.name)));

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, 9).setValues(rows);
  }

  PropertiesService.getScriptProperties().setProperty('roster', JSON.stringify(roster));
  console.log(`Roster built: ${roster.employees.length} employees in ${(Date.now() - t0) / 1000}s`);
}


function retrieveRoster() {
  var roster = PropertiesService.getScriptProperties().getProperties();
  return JSON.parse(roster.roster);
}

function filterHU() {
  var roster = retrieveRoster();
  var huEmployees = _.filter(roster.employees, { "account": "HU" });
  var fpmJobDescriptions = getJobDescriptionsByCategory('FPM');
  // console.log(huEmployees);
  var huFpmEmployees = _.filter(huEmployees, (v) => _.includes(fpmJobDescriptions, v.jobTitle));
  console.log(huFpmEmployees);
};

// function lookupSingleEmployeeCertifications(aoid) {
//   var data = {
//     "data": {
//       "method": "GET",
//       "domain": "https://accounts.adp.com",
//       "uri": `/talent/v2/associates/${aoid}/associate-certifications`
//     }
//   };

//   var response = postAdp(data);
//   return response;
// }

function lookupSingleEmployeeCertifications(aoid) {
  const result = postSnapshot({ action: 'getCerts', aoids: [aoid] });
  if (result && Array.isArray(result.certs) && result.certs.length > 0) {
    const entry = result.certs[0];
    const certifications = (entry.certs || []).map(c => ({
      certificationNameCode: { longName: c.n || '' },
      expirationDate: c.e || '',
      categoryCode: { codeValue: c.c || '' },
    }));
    return { data: { associateCertifications: certifications } };
  }
  console.warn(`Certifications unavailable for AOID: ${aoid}`);
  return { data: { associateCertifications: [] } };
}


function lookupOneEmployeeByAoid() {
  var empAoid = "G3KE0P6CXQ2NXFZQ";
  // var empAoid = "G3P2JAYP101VGQDS";
  var empCerts = lookupSingleEmployeeCertifications(empAoid);
  var empData = empCerts.data.associateCertifications;
  for (i = 0; i < empData.length; i++) {
    console.log(empData[i].certificationNameCode.longName + ` - ` + empData[i].expirationDate);
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
  var titles = getJobDescriptionsByCategory('FPM');
  console.log(JSON.stringify(titles));
}

function showAllMgrStTOPJobTitles() {
  var titles = getJobDescriptionsByCategory('MGR STOP');
  console.log(JSON.stringify(titles));
}
