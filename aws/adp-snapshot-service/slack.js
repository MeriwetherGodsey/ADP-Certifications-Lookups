'use strict';

const axios = require('axios');

const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const CHANNEL  = '#adp_api_project';
const USERNAME = 'ADP Snapshot Service';

async function notify(message) {
  try {
    await axios.post(WEBHOOK_URL, {
      channel:    CHANNEL,
      username:   USERNAME,
      text:       message,
      icon_emoji: ':spiral_note_pad:',
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

async function notifyError(action, err) {
  await notify(`:rotating_light: *${action}* failed with unhandled error:\n\`\`\`${err?.message || String(err)}\`\`\``);
}

module.exports = { notify, notifySuccess, notifyFailure, notifyError };
