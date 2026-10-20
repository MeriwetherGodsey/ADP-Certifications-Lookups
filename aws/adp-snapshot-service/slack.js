'use strict';

const crypto = require('crypto');
const axios = require('axios');

const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const CHANNEL  = '#adp_api_project';
const USERNAME = 'ADP Snapshot Service';

const RETRY_ACTION_ID      = 'retry_ingest_certs';
const MAX_BUTTON_VALUE_LEN = 2000;
const MAX_LISTED_AOIDS     = 20;
const MAX_SIGNATURE_AGE_S  = 60 * 5;

async function notify(message, blocks) {
  try {
    await axios.post(WEBHOOK_URL, {
      channel:    CHANNEL,
      username:   USERNAME,
      text:       message,
      icon_emoji: ':spiral_note_pad:',
      ...(blocks ? { blocks } : {}),
    });
  } catch (err) {
    console.warn('[slack] Notification failed (non-fatal):', err?.message || err);
  }
}

async function notifySuccess(action, details) {
  const lines = [`✅ *${action}* completed successfully.`];
  for (const [k, v] of Object.entries(details)) {
    lines.push(`• *${k}*: ${v}`);
  }
  await notify(lines.join('\n'));
}

async function notifyFailure(action, details) {
  const lines = [`:rotating_light: *${action}* completed with issues.`];
  for (const [k, v] of Object.entries(details)) {
    lines.push(`• *${k}*: ${v}`);
  }
  await notify(lines.join('\n'));
}

/**
 * ingestCerts failure message with a "Retry failed AOIDs" button.
 * failures: [{ aoid, statusCode }]
 */
async function notifyCertFailure(details, failures) {
  const lines = [':rotating_light: *ingestCerts* completed with issues.'];
  for (const [k, v] of Object.entries(details)) {
    lines.push(`• *${k}*: ${v}`);
  }
  const listed = failures.slice(0, MAX_LISTED_AOIDS).map((f) => `\`${f.aoid}\` (${f.statusCode})`);
  if (failures.length > MAX_LISTED_AOIDS) listed.push(`…and ${failures.length - MAX_LISTED_AOIDS} more`);
  if (listed.length) lines.push(`• *Failed*: ${listed.join(', ')}`);
  const text = lines.join('\n');

  await notify(text, [
    { type: 'section', text: { type: 'mrkdwn', text } },
    { type: 'actions', elements: [buildRetryButton(failures.map((f) => f.aoid))] },
  ]);
}

function buildRetryButton(aoids) {
  const value  = JSON.stringify({ aoids });
  const fits   = value.length <= MAX_BUTTON_VALUE_LEN;
  return {
    type:      'button',
    action_id: RETRY_ACTION_ID,
    style:     'primary',
    text:      { type: 'plain_text', text: fits ? `Retry failed AOIDs (${aoids.length})` : 'Retry full ingestCerts' },
    value:     fits ? value : JSON.stringify({ all: true }),
  };
}

async function notifyError(action, err) {
  await notify(`:rotating_light: *${action}* failed with unhandled error:\n\`\`\`${err?.message || String(err)}\`\`\``);
}

/**
 * Verifies a Slack request signature (https://api.slack.com/authentication/verifying-requests-from-slack)
 */
function verifySlackSignature(headers, rawBody, nowSec = Math.floor(Date.now() / 1000)) {
  const secret    = process.env.SLACK_SIGNING_SECRET;
  const timestamp = headers?.['x-slack-request-timestamp'];
  const signature = headers?.['x-slack-signature'];
  if (!secret || !timestamp || !signature) return false;
  if (Math.abs(nowSec - Number(timestamp)) > MAX_SIGNATURE_AGE_S) return false;

  const expected = 'v0=' + crypto.createHmac('sha256', secret).update(`v0:${timestamp}:${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function respondToSlack(responseUrl, body) {
  try {
    await axios.post(responseUrl, body);
  } catch (err) {
    console.warn('[slack] response_url post failed (non-fatal):', err?.message || err);
  }
}

module.exports = {
  RETRY_ACTION_ID,
  notify, notifySuccess, notifyFailure, notifyCertFailure, notifyError,
  buildRetryButton, verifySlackSignature, respondToSlack,
};
