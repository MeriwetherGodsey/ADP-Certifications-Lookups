function notifySlackFromGAS(messageText) {
  const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
  const payload = JSON.stringify({
    channel: "#adp_api_project",
    username: "ADP Import Notification",
    text: messageText,
    icon_emoji: ":spiral_note_pad:"
  });
  const options = {
    method: "POST",
    contentType: "application/json",
    payload: payload,
    muteHttpExceptions: true
  };
  try {
    const response = UrlFetchApp.fetch(webhookUrl, options);
    console.log("Slack notification sent: " + response.getResponseCode());
  } catch (e) {
    console.error("Slack notification failed: " + e.message);
  }
}

function postAdpWithRetries(data, retries = 3, delay = 500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const API_URL = "https://bcinfni2wc.execute-api.us-east-1.amazonaws.com/default/";
      const options = {
        method: 'post',
        payload: JSON.stringify(data),
        muteHttpExceptions: true
      };
      const response = UrlFetchApp.fetch(API_URL, options);
      const statusCode = response.getResponseCode();
      console.log(`postAdp attempt ${attempt}: HTTP ${statusCode}`);
      if (statusCode === 200) {
        return JSON.parse(response.getContentText());
      }
    } catch (e) {
      console.warn(`postAdp attempt ${attempt} failed: ${e.message}`);
    }
    Utilities.sleep(delay * attempt); // Exponential backoff
  }
  return null;
}

function getSafeCertData(response, aoid, failures, employeeName) {
  if (response === null) {
    console.warn("API call failed for AOID: " + aoid);
    failures.push(employeeName + " (" + aoid + ")");
    return [];
  }

  if (response.data && Array.isArray(response.data.associateCertifications)) {
    return response.data.associateCertifications;
  }

  // Valid API response but no certs — not a failure
  return [];
}


function filterFPM() {
  const roster = retrieveRoster();
  const jobDescriptions = getJobDescriptionsByCategory('FPM');
  const employees = _.filter(roster.employees, (v) => _.includes(jobDescriptions, v.jobTitle));
  console.log(`FPM Employees: ` + employees.length);
  processEmployeeCertifications(employees, "Food Protection Manager", "Food Protection Manager");
}

function filterAlcoholTraining() {
  const roster = retrieveRoster();
  const jobDescriptions = getJobDescriptionsByCategory('ABC');
  const employees = _.filter(roster.employees, (v) => _.includes(jobDescriptions, v.jobTitle));
  console.log(`Alcohol Training Employees: ` + employees.length);
  processEmployeeCertifications(employees, "Alcohol Training", "Alcohol Training");
}

function filterAllergenTraining() {
  const roster = retrieveRoster();
  const jobDescriptions = getJobDescriptionsByCategory('ATM');
  const employees = _.filter(roster.employees, (v) => _.includes(jobDescriptions, v.jobTitle));
  console.log(`Allergen Training Employees: ` + employees.length);
  processEmployeeCertifications(employees, "Allergen Training Manager", "Allergen Training Manager");
}

function filterManagerSTOP() {
  const roster = retrieveRoster();
  const jobDescriptions = getJobDescriptionsByCategory('MGR STOP');
  const employees = _.filter(roster.employees, (v) => _.includes(jobDescriptions, v.jobTitle));
  console.log(`Manager STOP Employees: ` + employees.length);
  processEmployeeCertifications(employees, "Manager STOP", "MGR Sexual Harassment Prevention");
}

// function filterEmployeeSTOP() {
//   const roster = retrieveRoster();
//   const jobDescriptions = getJobDescriptionsByCategory('EMP STOP');
//   const employees = _.filter(roster.employees, (v) => _.includes(jobDescriptions, v.jobTitle));
//   console.log(`Employee STOP Employees: ` + employees.length);
//   processEmployeeCertifications(employees, "Employee STOP", "EMP Sexual Harassment Prevention");
// }

// function filterAllergenLite() {
//   const roster = retrieveRoster();
//   const jobDescriptions = getJobDescriptionsByCategory('ATL');
//   const employees = _.filter(roster.employees, (v) => _.includes(jobDescriptions, v.jobTitle));
//   console.log(`Allergen Lite Employees: ` + employees.length);
//   processEmployeeCertifications(employees, "AllerTrain Lite", ["Allergen Training Manager", "Allergen Lite"]);
// }

// function filterFoodHandlers() {
//   const roster = retrieveRoster();
//   const jobDescriptions = getJobDescriptionsByCategory('FH');
//   const employees = _.filter(roster.employees, (v) => _.includes(jobDescriptions, v.jobTitle));
//   console.log(`Food Handler Employees: ` + employees.length);
//   processEmployeeCertifications(employees, "Food Handler", ["Food Protection Manager", "Food Handler"]);
// }

// // function processEmployeeCertifications(employees, sheetName, certNames) {
// //   const today = new Date();
// //   const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
// //   const lastRow = sheet.getLastRow();
// //   sheet.getRange(2, 1, lastRow, 7).clearContent();
// //   const failures = [];
// //   const startTime = Date.now();
// //   let row = 2;

// //   for (let i = 0; i < employees.length; i++) {
// //     const emp = employees[i];
// //     console.log(`${i + 1}/${employees.length} - ${emp.name}`);
// //     sheet.getRange(row, 1).setValue(emp.name);
// //     sheet.getRange(row, 2).setValue(emp.aoid);
// //     sheet.getRange(row, 3).setValue(emp.account);
// //     sheet.getRange(row, 4).setValue(emp.jobTitle);

// //     const response = lookupSingleEmployeeCertifications(emp.aoid);
// //     const certs = getSafeCertData(response, emp.aoid, failures, emp.name);

// //     let latestCert = null;
// //     for (let j = 0; j < certs.length; j++) {
// //       const cert = certs[j];
// //       const nameMatches = Array.isArray(certNames)
// //         ? certNames.includes(cert.certificationNameCode.longName)
// //         : cert.certificationNameCode.longName === certNames;

// //       if (cert.hasOwnProperty("categoryCode") && nameMatches && cert.categoryCode.codeValue === "C") {
// //         const currentExpDate = new Date(cert.expirationDate);
// //         if (!latestCert || currentExpDate > new Date(latestCert.expirationDate)) {
// //           latestCert = cert;
// //         }
// //       }
// //     }

// //     if (latestCert) {
// //       sheet.getRange(row, 5).setValue(latestCert.certificationNameCode.longName);
// //       sheet.getRange(row, 6).setValue(latestCert.expirationDate);
// //       const status = getCertificationStatus(latestCert.expirationDate);
// //       sheet.getRange(row, 7).setValue(status);
// //     } else {
// //       sheet.getRange(row, 7).setValue("EXPIRED");
// //     }

// //     row++;
// //   }

// //   if (failures.length > 0) {
// //     notifySlackFromGAS(`:rotating_light: ${failures.length} ${sheetName} API certification lookups failed:\n• ` + failures.join("\n• "));
// //   }
// // }

// function processEmployeeCertifications(employees, sheetName, certNames) {
//   const lock = LockService.getScriptLock();
//   if (!lock.tryLock(30 * 1000)) {
//     console.log(`Skipped ${sheetName} run: could not acquire lock (another run likely in progress).`);
//     return;
//   }

//   const t0 = Date.now();
//   try {
//     const ss = SpreadsheetApp.getActiveSpreadsheet();
//     const sheet = ss.getSheetByName(sheetName);

//     // Clear old content (fix: lastRow includes header; range height should be lastRow-1)
//     const lastRow = sheet.getLastRow();
//     if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 7).clearContent();

//     const failures = [];
//     const output = new Array(employees.length);

//     // Pre-normalize certNames check
//     const certNameSet = Array.isArray(certNames) ? new Set(certNames) : null;

//     for (let i = 0; i < employees.length; i++) {
//       const emp = employees[i];

//       // (Optional) progress log every N records to reduce log overhead
//       if (i % 25 === 0) console.log(`${sheetName}: ${i + 1}/${employees.length}`);

//       const response = lookupSingleEmployeeCertifications(emp.aoid);
//       const certs = getSafeCertData(response, emp.aoid, failures, emp.name);

//       let latestCert = null;

//       for (let j = 0; j < certs.length; j++) {
//         const cert = certs[j];

//         const longName = cert?.certificationNameCode?.longName;
//         const nameMatches = certNameSet ? certNameSet.has(longName) : (longName === certNames);

//         if (cert?.categoryCode?.codeValue === "C" && nameMatches && cert.expirationDate) {
//           const exp = new Date(cert.expirationDate);
//           if (!latestCert || exp > new Date(latestCert.expirationDate)) latestCert = cert;
//         }
//       }

//       let certName = "";
//       let expDate = "";
//       let status = "EXPIRED";

//       if (latestCert) {
//         certName = latestCert.certificationNameCode.longName || "";
//         expDate = latestCert.expirationDate || "";
//         status = getCertificationStatus(expDate);
//       }

//       output[i] = [
//         emp.name || "",
//         emp.aoid || "",
//         emp.account || "",
//         emp.jobTitle || "",
//         certName,
//         expDate,
//         status
//       ];
//     }

//     if (output.length) {
//       sheet.getRange(2, 1, output.length, 7).setValues(output);
//     }

//     if (failures.length > 0) {
//       notifySlackFromGAS(
//         `:rotating_light: ${failures.length} ${sheetName} API certification lookups failed:\n• ` +
//         failures.join("\n• ")
//       );
//     }

//     console.log(`${sheetName} done in ${(Date.now() - t0) / 1000}s`);
//   } finally {
//     lock.releaseLock();
//   }
// }

/**
 * Paste-in replacements for:
 * - filterEmployeeSTOP
 * - filterAllergenLite
 * - filterFoodHandlers
 * - processEmployeeCertifications
 *
 * IMPORTANT:
 * 1) This assumes your Lambda has been updated to support event.data.uris (batch mode),
 *    while still supporting event.data.uri (single mode) for all other callers.
 * 2) This does NOT require changing any other Lambda callers.
 */

/** =========================
 *  1) Filter functions (unchanged behavior, just calls new processor)
 *  ========================= */
function filterEmployeeSTOP() {
  const roster = retrieveRoster();
  const jobDescriptions = getJobDescriptionsByCategory('EMP STOP');
  const employees = _.filter(roster.employees, (v) => _.includes(jobDescriptions, v.jobTitle));
  console.log(`Employee STOP Employees: ${employees.length}`);
  processEmployeeCertifications(employees, "Employee STOP", "EMP Sexual Harassment Prevention");
}

function filterAllergenLite() {
  const roster = retrieveRoster();
  const jobDescriptions = getJobDescriptionsByCategory('ATL');
  const employees = _.filter(roster.employees, (v) => _.includes(jobDescriptions, v.jobTitle));
  console.log(`Allergen Lite Employees: ${employees.length}`);
  processEmployeeCertifications(employees, "AllerTrain Lite", ["Allergen Training Manager", "Allergen Lite"]);
}

function filterFoodHandlers() {
  const roster = retrieveRoster();
  const jobDescriptions = getJobDescriptionsByCategory('FH');
  const employees = _.filter(roster.employees, (v) => _.includes(jobDescriptions, v.jobTitle));
  console.log(`Food Handler Employees: ${employees.length}`);
  processEmployeeCertifications(employees, "Food Handler", ["Food Protection Manager", "Food Handler"]);
}

/** =========================
 *  2) NEW: Batch-enabled processor
 *     - Uses Lambda batch (uris: [...]) in chunks
 *     - Writes to sheet once (setValues)
 *     - Lock to prevent overlap
 *  ========================= */
function processEmployeeCertifications(employees, sheetName, certNames) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30 * 1000)) {
    console.log(`Skipped ${sheetName} run: could not acquire lock (another run likely in progress).`);
    return;
  }

  const t0 = Date.now();

  // ---------- helpers ----------
  const norm = (v) => String(v ?? "").trim();
  const normAoid = (v) => decodeURIComponent(String(v ?? "")).trim();
  const normalizeCertName = (s) => String(s || "").trim().toLowerCase();

  const chunkArray_ = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };
  // ----------------------------

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);

    // Clear old content
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 7).clearContent();

    const output = []; // rows to write

    // Slack notification buckets (technical only)
    const rateLimited = [];  // 429s
    const otherIssues = [];  // non-200 (except 204) + missing results (0)
    const missingRosterFields = [];

    // Normalize cert name targets once
    const certNameSet = Array.isArray(certNames)
      ? new Set(certNames.map(normalizeCertName))
      : null;
    const singleCertName = !Array.isArray(certNames) ? normalizeCertName(certNames) : null;

    // Tunables
    const BATCH_SIZE = 25;
    const BATCH_SLEEP_MS = 150;     // smooth bursts between batches

    console.log(`${sheetName}: employees input count=${employees.length}`);

    const batches = chunkArray_(employees, BATCH_SIZE);

    for (let b = 0; b < batches.length; b++) {
      const batchEmployees = batches[b];
      const startIdx = b * BATCH_SIZE + 1;
      const endIdx = b * BATCH_SIZE + batchEmployees.length;

      console.log(`${sheetName}: processing ${startIdx}-${endIdx} of ${employees.length}`);

      // Map keyed by AOID: { statusCode, data:{associateCertifications:[]}, error }
      const certMap = lookupCertificationsForEmployeesBatch_(batchEmployees) || {};

      for (let i = 0; i < batchEmployees.length; i++) {
        const emp = batchEmployees[i];

        const name = norm(emp?.name);
        const aoid = normAoid(emp?.aoid);
        const account = norm(emp?.account);
        const jobTitle = norm(emp?.jobTitle);

        // Default business meaning unless we find a qualifying cert
        let certName = "";
        let expDate = "";
        let status = "HAVEN'T TAKEN";

        // If roster fields are missing, keep the row but notify Slack (technical/data hygiene)
        if (!name || !aoid || !account || !jobTitle) {
          missingRosterFields.push(
            `Missing roster fields: name="${name}" aoid="${emp?.aoid}" account="${account}" jobTitle="${jobTitle}"`
          );
          output.push([name || "", aoid || "", account || "", jobTitle || "", certName, expDate, status]);
          continue;
        }

        const entry = certMap[aoid];

        // If missing from map entirely -> incomplete batch response
        if (!entry) {
          otherIssues.push(`${name} (${aoid}) statusCode=0 (missing from batch results)`);
          output.push([name, aoid, account, jobTitle, certName, expDate, status]);
          continue;
        }

        const sc = Number(entry.statusCode ?? 0);

        // Technical problems -> Slack, but sheet stays "HAVEN'T TAKEN"
        if (sc !== 200) {
          if (sc === 204) {
            // No Content: treat as "no certs" (NOT an error for your business reporting)
            output.push([name, aoid, account, jobTitle, certName, expDate, status]);
            continue;
          }

          if (sc === 429) {
            rateLimited.push(`${name} (${aoid})`);
          } else if (sc === 0) {
            otherIssues.push(`${name} (${aoid}) statusCode=0 (missing/unset)`);
          } else {
            // include error body if present (truncated-ish by JSON size)
            const errTxt = entry.error ? ` err=${JSON.stringify(entry.error)}` : "";
            otherIssues.push(`${name} (${aoid}) statusCode=${sc}${errTxt}`);
          }

          output.push([name, aoid, account, jobTitle, certName, expDate, status]);
          continue;
        }

        // Successful lookup: inspect certs
        const responseLike = { data: entry.data || { associateCertifications: [] } };

        // Your helper should return [] safely; if it logs into an array, pass otherIssues for visibility
        const certs = getSafeCertData(responseLike, aoid, otherIssues, name) || [];

        let latestCert = null;

        for (let j = 0; j < certs.length; j++) {
          const cert = certs[j];

          const longNameNorm = normalizeCertName(cert?.certificationNameCode?.longName);
          const nameMatches = certNameSet
            ? certNameSet.has(longNameNorm)
            : (longNameNorm === singleCertName);

          const category = norm(cert?.categoryCode?.codeValue);
          const expRaw = cert?.expirationDate;

          if (category === "C" && nameMatches && expRaw) {
            const exp = new Date(expRaw);
            if (!latestCert || exp > new Date(latestCert.expirationDate)) {
              latestCert = cert;
            }
          }
        }

        if (latestCert) {
          certName = norm(latestCert.certificationNameCode?.longName);
          expDate = latestCert.expirationDate || "";
          status = getCertificationStatus(expDate); // your existing Current/Expired logic
        }

        output.push([name, aoid, account, jobTitle, certName, expDate, status]);
      }

      Utilities.sleep(BATCH_SLEEP_MS);
    }

    // Write once
    if (output.length) {
      sheet.getRange(2, 1, output.length, 7).setValues(output);
    }

    // Slack notifications (technical only; no spreadsheet statuses)
    if (rateLimited.length || otherIssues.length || missingRosterFields.length) {
      const parts = [];

      if (rateLimited.length) {
        parts.push(
          `:warning: RATE LIMITING (${rateLimited.length}) during ${sheetName} certification lookups:\n• ` +
          rateLimited.slice(0, 25).join("\n• ") +
          (rateLimited.length > 25 ? `\n(and ${rateLimited.length - 25} more)` : "")
        );
      }

      if (otherIssues.length) {
        parts.push(
          `:rotating_light: Other lookup issues (${otherIssues.length}) for ${sheetName}:\n• ` +
          otherIssues.slice(0, 25).join("\n• ") +
          (otherIssues.length > 25 ? `\n(and ${otherIssues.length - 25} more)` : "")
        );
      }

      if (missingRosterFields.length) {
        parts.push(
          `:information_source: Missing roster fields (${missingRosterFields.length}) seen while building ${sheetName}:\n• ` +
          missingRosterFields.slice(0, 25).join("\n• ") +
          (missingRosterFields.length > 25 ? `\n(and ${missingRosterFields.length - 25} more)` : "")
        );
      }

      notifySlackFromGAS(parts.join("\n\n"));
    }

    console.log(`${sheetName} done in ${(Date.now() - t0) / 1000}s. Wrote rows=${output.length}`);
  } finally {
    lock.releaseLock();
  }
}

/** =========================
 *  3) NEW helper: Batch lookup via Lambda "uris" mode
 *     Returns: { [aoid]: { data: { associateCertifications: [...] } } }
 *
 *     NOTE: This uses your existing postAdpWithRetries() and does not affect other callers.
 *  ========================= */
function lookupCertificationsForEmployeesBatch_(employees) {
  const normAoid = (v) => decodeURIComponent(String(v ?? "")).trim();

  // Build initial map with empty defaults
  const map = {};
  const aoids = [];
  for (let i = 0; i < employees.length; i++) {
    const aoid = normAoid(employees[i].aoid);
    map[aoid] = { statusCode: 0, data: { associateCertifications: [] }, error: null };
    aoids.push(aoid);
  }

  // Single call to snapshot service — all batching/retry is handled server-side
  const result = postSnapshot({ action: 'getCerts', aoids: aoids });

  if (!result || !Array.isArray(result.certs)) {
    console.warn('lookupCertificationsForEmployeesBatch_: no certs returned from snapshot service');
    return map;
  }

  // Normalize compact DynamoDB format back to { statusCode, data:{associateCertifications:[]} }
  for (let i = 0; i < result.certs.length; i++) {
    const entry = result.certs[i];
    const aoid  = normAoid(entry.aoid || '');
    if (!aoid || !map[aoid]) continue;

    const certifications = (entry.certs || []).map(c => ({
      certificationNameCode: { longName: c.n || '' },
      expirationDate:        c.e || '',
      categoryCode:          { codeValue: c.c || '' },
    }));

    map[aoid] = {
      statusCode: 200,
      data: { associateCertifications: certifications },
      error: null,
    };
  }

  return map;
}
