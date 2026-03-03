// index.js
'use strict';

const fs = require('fs');
const axios = require('axios');
const https = require('https');
const { SSMClient, GetParameterCommand, PutParameterCommand } = require('@aws-sdk/client-ssm');

/** =======================
 *  mTLS agent
 *  Adjust CERT_PATH / KEY_PATH if your filenames differ
 *  ======================= */
const CERT_PATH = process.env.MG_CERT_PATH || './keys/Meriwether Godsey, Inc..cer';
const KEY_PATH  = process.env.MG_KEY_PATH  || './keys/meriwethergodsey_auth.key';

const httpsAgent = new https.Agent({
  cert: fs.readFileSync(CERT_PATH),
  key:  fs.readFileSync(KEY_PATH),
  keepAlive: true,
});

/** =======================
 *  OAuth constants
 *  ======================= */
const CREDS_URL = 'https://accounts.adp.com/auth/oauth/v2/token?grant_type=client_credentials';

const BASIC_AUTH = process.env.ADP_BASIC_AUTH;

const OAUTH_HEADERS = {
  Authorization: BASIC_AUTH,
  Connection: 'Keep-Alive',
};

/** =======================
 *  SSM Parameter Store
 *  ======================= */
const ssm = new SSMClient(); // region from Lambda env
const TOKEN_PARAM_NAME  = '/meriwether/adp/token';
const EXPIRY_PARAM_NAME = '/meriwether/adp/tokenExpiresAt';

/** =======================
 *  In-memory cache (per warm container)
 *  ======================= */
let cachedToken = null;   // string
let tokenExpiresAt = 0;   // epoch ms
const EXPIRY_BUFFER_MS = 60 * 1000; // refresh 60s early

function isMemTokenValid() {
  return !!(cachedToken && tokenExpiresAt && Date.now() < (tokenExpiresAt - EXPIRY_BUFFER_MS));
}

/** =======================
 *  SSM helpers
 *  ======================= */
async function getTokenFromSSM() {
  try {
    const [tok, exp] = await Promise.all([
      ssm.send(new GetParameterCommand({ Name: TOKEN_PARAM_NAME, WithDecryption: true })),
      ssm.send(new GetParameterCommand({ Name: EXPIRY_PARAM_NAME }))
    ]);

    const token = tok?.Parameter?.Value;
    const expiresAt = parseInt(exp?.Parameter?.Value, 10);

    if (token && expiresAt && Date.now() < (expiresAt - EXPIRY_BUFFER_MS)) {
      console.log(`SSM token valid until ${new Date(expiresAt).toISOString()}`);
      // warm the in-memory cache
      cachedToken = token;
      tokenExpiresAt = expiresAt;
      return { token, expiresAt };
    }
    return null; // not present or near/at expiry
  } catch (err) {
    if (err?.name === 'ParameterNotFound') return null;
    console.log('SSM get error:', err?.message || err);
    return null;
  }
}

async function saveTokenToSSM(token, expiresAt) {
  try {
    await Promise.all([
      ssm.send(new PutParameterCommand({
        Name: TOKEN_PARAM_NAME,
        Value: token,
        Type: 'SecureString', // default AWS-managed KMS unless overridden
        Overwrite: true,
      })),
      ssm.send(new PutParameterCommand({
        Name: EXPIRY_PARAM_NAME,
        Value: String(expiresAt),
        Type: 'String',
        Overwrite: true,
      })),
    ]);
    console.log(`Saved token to SSM; expires ${new Date(expiresAt).toISOString()}`);
  } catch (err) {
    console.log('SSM put error:', err?.message || err);
    // Non-fatal: in-memory cache still works
  }
}

/** =======================
 *  Token fetch / selection
 *  ======================= */
async function fetchNewToken() {
  const resp = await axios.post(CREDS_URL, {}, { httpsAgent, headers: OAUTH_HEADERS });
  const token = resp.data.access_token;
  const expiresInSec = resp.data.expires_in || 1800; // default 30m if absent
  const expiresAt = Date.now() + (expiresInSec * 1000);

  cachedToken = token;
  tokenExpiresAt = expiresAt;

  await saveTokenToSSM(token, expiresAt);
  console.log(`Fetched new token; expires in ${expiresInSec}s (${new Date(expiresAt).toISOString()})`);
  return token;
}

async function getBearerToken() {
  // 1) In-memory cache
  if (isMemTokenValid()) {
    console.log(`Using in-memory token; expires ${new Date(tokenExpiresAt).toISOString()}`);
    return cachedToken;
  }

  // 2) SSM
  const ssmToken = await getTokenFromSSM();
  if (ssmToken?.token) return ssmToken.token;

  // 3) ADP fetch
  try {
    return await fetchNewToken();
  } catch (err) {
    console.log('Error fetching token:', err?.response?.data || err?.message || err);
    throw err;
  }
}

/** =======================
 *  Request helpers
 *  ======================= */
function buildQueryString(filter) {
  if (!filter) return '';
  if (typeof filter === 'string') {
    let qs = filter.trim();
    if (!qs) return '';
    // strip leading '?'
    if (qs.startsWith('?')) qs = qs.slice(1);
    // if any stray '?' remain (user concatenation), turn them into '&'
    qs = qs.replace(/\?/g, '&');
    return qs ? `?${qs}` : '';
  }
  if (typeof filter === 'object') {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filter)) {
      if (v === undefined || v === null) continue;
      params.append(k, String(v));
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }
  return '';
}

function formatAxiosError(error) {
  console.log(error);
  if (error?.response) {
    console.log(error.response.data);
    console.log(error.response.status);
    console.log(error.response.headers);
    return { statusCode: error.response.status, data: error.response.data };
  } else if (error?.request) {
    console.log(error.request);
    return { statusCode: 999, request: error.request };
  } else {
    console.log('Error', error?.message);
    return { statusCode: 998, message: error?.message };
  }
}

/** =======================
 *  ADP API call (401 retry)
 *  ======================= */
async function useTokenForApiCall(token, method, domain, uri, filter) {
  console.log(`domain = ${domain}`);
  console.log(`uri = ${uri}`);
  console.log(`Filter = ${typeof filter === 'string' ? filter : JSON.stringify(filter)}`);

  const url = `${domain}${uri}${buildQueryString(filter)}`;
  console.log(url);

  const baseHeaders = {
    Authorization: `Bearer ${token}`,
    Connection: 'Keep-Alive',
    'Accept-Encoding': 'gzip,deflate,compress',
  };

  const makeRequest = (headers) =>
    axios({ method, url, httpsAgent, headers });

  try {
    let response = await makeRequest(baseHeaders);
    if (response.status === 204) {
      console.log('No content available');
      return { statusCode: 204 };
    }
    console.log(`ADP ${method.toUpperCase()} ${uri} -> ${response.status}`);
    return { statusCode: 200, data: response.data };

  } catch (error) {
    if (error?.response?.status === 401) {
      console.log('401 received; refreshing token and retrying once...');
      try {
        const freshToken = await fetchNewToken();
        const retryHeaders = { ...baseHeaders, Authorization: `Bearer ${freshToken}` };
        const response = await makeRequest(retryHeaders);
        if (response.status === 204) return { statusCode: 204 };
        return { statusCode: 200, data: response.data };
      } catch (retryErr) {
        console.log('Retry after refresh failed:', retryErr?.response?.data || retryErr?.message || retryErr);
        return formatAxiosError(retryErr);
      }
    }
    return formatAxiosError(error);
  }
}

/** =======================
 *  Slack (unchanged)
 *  ======================= */
async function postSlackError(error_message) {
  const slack_message = ':rotating_light: There was an ADP API Error:\n' + error_message;
  try {
    const message = {
      channel: '#adp_api_project',
      username: 'ADP Import Notification',
      text: slack_message,
      icon_emoji: ':spiral_note_pad:',
    };
    const response = await axios({
      method: 'post',
      url: '***REMOVED***',
      data: message,
    });
    console.log(response.status);
  } catch (error) {
    console.log(error);
  }
}

/** =======================
 *  Lambda handler
 *  ======================= */
exports.handler = async (event) => {
  console.log('Beginning API');

  const method = event?.data?.method;
  const domain = event?.data?.domain;
  const uri    = event?.data?.uri;     // existing
  const uris   = event?.data?.uris;    // NEW
  const filter = event?.data?.filter;

  try {
    const token = await getBearerToken();

    // NEW: batch mode, but only if uris is present
    if (Array.isArray(uris) && uris.length > 0) {
      const requested = Number(event?.data?.concurrency || 8);
      const concurrency = Math.max(1, Math.min(requested, 10)); // cap at 10

      const results = await mapWithConcurrency(uris, concurrency, async (oneUri) => {
        const r = await useTokenForApiCall(token, method, domain, oneUri, filter);
        return { uri: oneUri, statusCode: r.statusCode, data: r.data };
      });

      return { statusCode: 200, results };
    }

    // Existing single-call behavior unchanged
    const result = await useTokenForApiCall(token, method, domain, uri, filter);
    return {
      statusCode: result.statusCode,
      data: result.data,
    };
  } catch (err) {
    const formatted = formatAxiosError(err);
    return formatted;
  }
};

async function mapWithConcurrency(items, limit, workerFn) {
  const results = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (true) {
      const current = idx++;
      if (current >= items.length) return;
      results[current] = await workerFn(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}
