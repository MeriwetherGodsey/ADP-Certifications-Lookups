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
  const roster = { employees: [] };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Roster");

  // Clear old content (fix range height)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 9).clearContent();

  const TOP = 100;
  let skip = 0;
  let totalCount = null;

  const rows = []; // 2D array for sheet output (A:I)

  // ---------- NAME BUILDER (robust, keeps "Last, First") ----------
  function buildWorkerDisplayName_(w) {
    const legal = w?.person?.legalName || {};
    const preferred = w?.person?.preferredName || {};

    const pick = (...vals) => {
      for (const v of vals) {
        const s = String(v ?? "").trim();
        if (s) return s;
      }
      return "";
    };

    // Most reliable pieces
    const family = pick(preferred.familyName1, legal.familyName1);

    // "First" candidate: prefer givenName, then nickName
    const first = pick(
      preferred.givenName,
      legal.givenName,
      preferred.nickName,
      legal.nickName
    );

    // Some payloads include a formatted name (if present, we can use it when needed)
    const formatted = pick(
      preferred.formattedName,
      legal.formattedName,
      preferred.fullName,
      legal.fullName
    );

    // Primary desired output: "Last, First"
    if (family && first) return `${family}, ${first}`;

    // If no first but we have a formatted full name, use it (better than "Last," )
    if (formatted) return formatted;

    // Next fallback: just family (no comma)
    if (family) return family;

    // Final fallback: if first exists but family doesn't
    if (first) return first;

    return "";
  }
  // ---------------------------------------------------------------

  // Helper to call ADP workers endpoint
  const fetchWorkersPage_ = (skipVal, includeCount) => {
    const uri = includeCount
      ? `/hr/v2/workers?count=true&$top=${TOP}&$skip=${skipVal}`
      : `/hr/v2/workers?$top=${TOP}&$skip=${skipVal}`;

    const data = {
      data: {
        method: "GET",
        domain: "https://api.adp.com",
        uri: uri,
        // If ADP filtering works for you, turn this on to reduce payload:
        // filter: "$filter=workers/workAssignments/assignmentStatus/statusCode/codeValue eq 'A'"
      }
    };

    return postAdp(data); // keep your existing proxy call
  };

  const t0 = Date.now();
  let pageNum = 0;

  while (true) {
    pageNum++;
    const response = fetchWorkersPage_(skip, pageNum === 1); // only ask for count on page 1
    if (!response || !response.data) {
      console.warn(`No response/data from ADP at skip=${skip}. Stopping.`);
      break;
    }

    if (pageNum === 1) {
      totalCount = response.data?.meta?.totalNumber ?? null;
      console.log(`totalCount = ${totalCount}`);
    }

    const workers = response.data.workers || [];
    if (workers.length === 0) {
      console.log(`No workers returned at skip=${skip}. Done.`);
      break;
    }

    // Build rows + roster objects in memory
    for (let i = 0; i < workers.length; i++) {
      const w = workers[i];
      const aoid = w.associateOID || "";

      const name = buildWorkerDisplayName_(w);

      // Helpful logging for edge cases (e.g., "Fouts" only)
      if (aoid && name && !String(name).includes(",")) {
        // This means we didn't have enough to form "Last, First"
        // (not necessarily wrong, but worth inspecting)
        console.log(
          `⚠️ Name missing first/given/nick for aoid=${aoid}. Built name="${name}". ` +
          `legal.family="${String(w?.person?.legalName?.familyName1 || "")}" ` +
          `legal.given="${String(w?.person?.legalName?.givenName || "")}" ` +
          `legal.nick="${String(w?.person?.legalName?.nickName || "")}" ` +
          `pref.given="${String(w?.person?.preferredName?.givenName || "")}" ` +
          `pref.nick="${String(w?.person?.preferredName?.nickName || "")}"`
        );
      }

      const associateId = w?.workerID?.idValue || "";
      const originalHireDate = w?.workerDates?.originalHireDate || "";

      const assignments = w.workAssignments || [];
      for (let j = 0; j < assignments.length; j++) {
        const a = assignments[j];
        const status = a?.assignmentStatus?.statusCode?.codeValue;

        // Only include active assignments with homeWorkLocation
        const acct = a?.homeWorkLocation?.nameCode?.codeValue;
        if (!acct) continue;
        if (status !== "A") continue;

        const jobTitle = a?.jobTitle || "";
        const positionId = a?.positionID || "";
        const positionStartDate = a?.actualStartDate || "";

        // Sheet row A:I
        rows.push([
          name,
          aoid,
          acct,
          j,                 // assignment index
          jobTitle,
          positionId,
          associateId,
          originalHireDate,
          positionStartDate
        ]);

        // Roster object
        roster.employees.push({
          name,
          aoid,
          account: acct,
          jobTitle,
          associateId,
          originalHireDate,
          positionStartDate
        });
      }
    }

    // Pagination control
    skip += TOP;

    // If ADP told us the total, we can stop once we’ve fetched all pages
    if (totalCount != null && skip >= totalCount) break;

    // Otherwise stop when last page returned fewer than TOP workers
    if (workers.length < TOP) break;
  }

  // One sheet write
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, 9).setValues(rows);
  }

  // Persist roster for other scripts
  PropertiesService.getScriptProperties().setProperty("roster", JSON.stringify(roster));

  console.log(`Roster built: ${roster.employees.length} active assignments written.`);
  console.log(`allActiveEmployees done in ${(Date.now() - t0) / 1000}s`);
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
  const data = {
    "data": {
      "method": "GET",
      "domain": "https://accounts.adp.com",
      "uri": `/talent/v2/associates/${aoid}/associate-certifications`
    }
  };

  const response = postAdpWithRetries(data);

  if (response && response.data && Array.isArray(response.data.associateCertifications)) {
    return response;
  }

  // Fallback in case of failure
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
