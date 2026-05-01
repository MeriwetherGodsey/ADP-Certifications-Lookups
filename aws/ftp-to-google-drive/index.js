'use strict';

const ftp = require('basic-ftp');
const fs = require('fs');
const { pipeline } = require('stream/promises');
const { parse } = require('@fast-csv/parse');
const { format } = require('@fast-csv/format');
const p = require('phin');

// ---------- CONFIG: use environment variables or AWS Secrets Manager ----------
const ADP_FTP_HOST = process.env.ADP_FTP_HOST || 'filetransfer1.adp.com';
const ADP_FTP_USER = process.env.ADP_FTP_USER;
const ADP_FTP_PASS = process.env.ADP_FTP_PASS;

const MG_FTP_HOST  = process.env.MG_FTP_HOST  || 'ftp.merig.com';
const MG_FTP_USER  = process.env.MG_FTP_USER;
const MG_FTP_PASS  = process.env.MG_FTP_PASS;

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK;

// Locations / names
const ADP_REMOTE_DIR = 'fromADP';
const MG_REMOTE_DIR  = '/merig.com/public_html/exp/';
const OUT_FILE_NAME  = 'adp-export.csv';

// Build source filename e.g., AccountInserviceReport_MMDDYYYY.csv
function todayFileName() {
  const d = new Date();
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `AccountInserviceReport_${month}${day}${year}.csv`;
}

const SRC_PATH = `/tmp/${todayFileName()}`;
const DST_PATH = `/tmp/adp-export-filtered.csv`;

// ---- Helpers ----
async function notifySlack(text) {
  if (!SLACK_WEBHOOK) return;
  try {
    await p({
      url: SLACK_WEBHOOK,
      method: 'POST',
      data: {
        channel: '#adp_api_project',
        username: 'ADP Import Notification',
        text,
        icon_emoji: ':spiral_note_pad:'
      }
    });
  } catch (err) {
    console.log('Slack notify error:', err?.message || err);
  }
}

async function downloadFromAdp(remoteFile) {
  const client = new ftp.Client();
  let fileModifiedTime = null;
  try {
    await client.access({
      host: ADP_FTP_HOST,
      user: ADP_FTP_USER,
      password: ADP_FTP_PASS,
      secure: false
    });
    await client.cd(ADP_REMOTE_DIR);

    // MDTM is blocked on this server — parse rawModifiedAt from list() instead
    // Format: "Apr 15 14:16" (no year, UTC assumed)
    const listing = await client.list();
    const entry = listing.find(f => f.name === remoteFile);
    console.log('list() entry for file:', JSON.stringify(entry));
    if (entry?.rawModifiedAt) {
      const raw = entry.rawModifiedAt.trim(); // e.g. "Apr 15 14:16"
      const now = new Date();
      // Attempt parse with current year; if result is in the future, use prior year
      const attempt = new Date(`${raw} ${now.getUTCFullYear()} UTC`);
      if (!isNaN(attempt.getTime())) {
        fileModifiedTime = attempt > now
          ? new Date(`${raw} ${now.getUTCFullYear() - 1} UTC`)
          : attempt;
      }
      console.log('parsed fileModifiedTime:', fileModifiedTime);
    }

    await client.download(fs.createWriteStream(SRC_PATH), remoteFile);
  } finally {
    client.close();
  }
  return { fileModifiedTime };
}

async function uploadToMg(localPath, remoteName) {
  const client = new ftp.Client();
  try {
    await client.access({
      host: MG_FTP_HOST,
      user: MG_FTP_USER,
      password: MG_FTP_PASS,
      secure: false
    });
    await client.cd(MG_REMOTE_DIR);
    await client.upload(fs.createReadStream(localPath), remoteName);
  } finally {
    client.close();
  }
}

// Parse common date formats safely (returns Date or null)
function parseDateMaybe(s) {
  if (!s) return null;
  const t = String(s).trim();
  if (!t) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
  const us  = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;

  let y, m, d;
  if (iso.test(t)) {
    const m1 = iso.exec(t);
    y = +m1[1]; m = +m1[2]; d = +m1[3];
  } else if (us.test(t)) {
    const m2 = us.exec(t);
    m = +m2[1]; d = +m2[2]; y = +m2[3];
  } else {
    const dt = new Date(t);
    return isNaN(dt.getTime()) ? null : dt;
  }

  const dt = new Date(Date.UTC(y, m - 1, d));
  return isNaN(dt.getTime()) ? null : dt;
}

// Course codes that are always included regardless of completion date
// Populated from EXEMPT_COURSE_CODES env var (comma-separated, e.g. "INS 123,INS 137")
const EXEMPT_COURSE_CODES = process.env.EXEMPT_COURSE_CODES
  ? new Set(process.env.EXEMPT_COURSE_CODES.split(',').map(s => s.trim().toUpperCase()).filter(Boolean))
  : new Set();

const COURSE_CODE_HEADER = 'Course Name Code';

// Return true if row's Completion Date > cutoff, OR if the course code is exempt
function buildRowFilter(cutoffDateUtc, completionHeaderName, completionColumnIndex) {
  return function shouldKeep(row) {
    // Always include rows whose course code is in the exempt list
    if (EXEMPT_COURSE_CODES.size > 0) {
      const code = (row[COURSE_CODE_HEADER] || '').trim().toUpperCase();
      if (EXEMPT_COURSE_CODES.has(code)) return true;
    }

    let val = row[completionHeaderName];
    if (val === undefined && completionColumnIndex != null) {
      const keys = Object.keys(row);
      const key = keys[completionColumnIndex];
      val = row[key];
    }
    const dt = parseDateMaybe(val);
    if (!dt) return false;
    return dt.getTime() > cutoffDateUtc.getTime();
  };
}

exports.handler = async (event = {}) => {
  // Diagnostic: list ADP FTP directory and log all file metadata
  if (event.action === 'listDir') {
    const client = new ftp.Client();
    try {
      await client.access({
        host: ADP_FTP_HOST,
        user: ADP_FTP_USER,
        password: ADP_FTP_PASS,
        secure: false
      });
      await client.cd(ADP_REMOTE_DIR);
      const listing = await client.list();
      console.log('FTP directory listing:');
      for (const entry of listing) {
        console.log(JSON.stringify(entry));
        // Also try lastMod on each file
        try {
          const lm = await client.lastMod(entry.name);
          console.log(`lastMod(${entry.name}):`, lm);
        } catch (e) {
          console.log(`lastMod(${entry.name}) failed:`, e?.message || e);
        }
      }
    } finally {
      client.close();
    }
    return { statusCode: 200, body: 'listDir complete — check CloudWatch logs' };
  }

  let slackLog = '';

  // 1) Resolve cutoff date
  const completionAfterStr = event.completionAfter || process.env.COMPLETION_AFTER;
  let cutoffDate = completionAfterStr ? parseDateMaybe(completionAfterStr) : null;
  if (!cutoffDate) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 30);
    cutoffDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  cutoffDate = new Date(Date.UTC(cutoffDate.getUTCFullYear(), cutoffDate.getUTCMonth(), cutoffDate.getUTCDate()));
  slackLog += `Using completion cutoff AFTER: ${cutoffDate.toISOString().slice(0,10)} (UTC midnight)\n`;

  // 2) Download the source CSV from ADP
  const sourceFileName = todayFileName();
  try {
    const { fileModifiedTime } = await downloadFromAdp(sourceFileName);
    let uploadedAt = 'unknown';
    if (fileModifiedTime) {
      const utcStr = fileModifiedTime.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
      const etStr = fileModifiedTime.toLocaleString('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      }) + ' ET';
      uploadedAt = `${utcStr} (${etStr})`;
    }
    slackLog += `:white_check_mark: Downloaded *${sourceFileName}* from ADP FTP.\n`;
    slackLog += `:clock3: ADP file last modified: *${uploadedAt}*\n`;
    slackLog += `:page_facing_up: Will be published as: *${OUT_FILE_NAME}*\n`;
  } catch (err) {
    console.log('ADP download error:', err);
    slackLog += `:rotating_light: ADP download failed: ${err}\n`;
    await notifySlack('DAILY UPDATE:\n' + slackLog);
    return { statusCode: 500, body: JSON.stringify({ message: 'Download failed' }) };
  }

  // 3) Stream-filter by "Completion Date" (Column G)
  try {
    let headers = null;
    let kept = 0;
    const COMPLETION_HEADER = 'Completion Date';
    const COMPLETION_INDEX = 6;

    const readStream = fs.createReadStream(SRC_PATH);
    const writeStream = fs.createWriteStream(DST_PATH);

    const parser = parse({ headers: true, trim: true, ignoreEmpty: true });

    parser.on('headers', (hdrs) => { headers = hdrs; });

    const keep = buildRowFilter(cutoffDate, COMPLETION_HEADER, COMPLETION_INDEX);

    const formatter = format({
      headers: true,
      writeHeaders: true,
    });

    parser.on('error', (e) => { throw e; });
    formatter.on('error', (e) => { throw e; });

    const parseDone = pipeline(readStream, parser);

    (async () => {
      for await (const row of parser) {
        if (!headers) continue;
        if (!keep(row)) continue;
        const out = {};
        for (const h of headers) out[h] = row[h] ?? '';
        formatter.write(out);
        kept++;
      }
      formatter.end();
    })().catch((e) => { throw e; });

    const writeDone = new Promise((res, rej) => {
      formatter.pipe(writeStream).on('finish', res).on('error', rej);
    });

    await Promise.all([parseDone, writeDone]);

    slackLog += `:white_check_mark: Filtered CSV created with ${kept} rows kept (Completion Date after cutoff).\n`;
  } catch (err) {
    console.log('Filter error:', err);
    slackLog += `:rotating_light: Filtering failed: ${err}\n`;
    await notifySlack('DAILY UPDATE:\n' + slackLog);
    return { statusCode: 500, body: JSON.stringify({ message: 'Filtering failed' }) };
  }

  // 4) Upload filtered CSV to MG FTP
  try {
    await uploadToMg(DST_PATH, OUT_FILE_NAME);
    slackLog += `:white_check_mark: Uploaded filtered CSV to ${MG_REMOTE_DIR}${OUT_FILE_NAME}.\n`;
  } catch (err) {
    console.log('MG upload error:', err);
    slackLog += `:rotating_light: Upload failed: ${err}\n`;
    await notifySlack('DAILY UPDATE:\n' + slackLog);
    return { statusCode: 500, body: JSON.stringify({ message: 'Upload failed' }) };
  }

  await notifySlack('DAILY UPDATE:\n' + slackLog);
  return { statusCode: 200, body: JSON.stringify({ message: 'Filtered file uploaded successfully' }) };
};
