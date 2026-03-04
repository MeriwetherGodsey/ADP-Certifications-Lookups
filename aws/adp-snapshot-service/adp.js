'use strict';

const fs = require('fs');
const https = require('https');
const axios = require('axios');
const { SSMClient, GetParameterCommand, PutParameterCommand } = require('@aws-sdk/client-ssm');

/** =======================
 *  mTLS agent
 *  Same cert/key as adp-api-node — copy keys/ folder into this directory before deploying
 *  ======================= */
const CERT_PATH = process.env.MG_CERT_PATH || './keys/Meriwether Godsey, Inc..cer';
const KEY_PATH  = process.env.MG_KEY_PATH  || './keys/meriwethergodsey_auth.key';

const httpsAgent = new https.Agent({
  cert: fs.readFileSync(CERT_PATH),
  key:  fs.readFileSync(KEY_PATH),
  keepAlive: true,
});

/** =======================
 *  OAuth — shared SSM params with adp-api-node
 *  Same ADP client identity → share the issued token
 *  ======================= */
const CREDS_URL = 'https://accounts.adp.com/auth/oauth/v2/token?grant_type=client_credentials';

const BASIC_AUTH = process.env.ADP_BASIC_AUTH;

const OAUTH_HEADERS = {
  Authorization: BASIC_AUTH,
  Connection: 'Keep-Alive',
};

const ssm = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });
const TOKEN_PARAM_NAME  = '/meriwether/adp/token';
const EXPIRY_PARAM_NAME = '/meriwether/adp/tokenExpiresAt';
const EXPIRY_BUFFER_MS  = 60 * 1000;

let cachedToken    = null;
let tokenExpiresAt = 0;

function isMemTokenValid() {
  return !!(cachedToken && tokenExpiresAt && Date.now() < (tokenExpiresAt - EXPIRY_BUFFER_MS));
}

async function getTokenFromSSM() {
  try {
    const [tok, exp] = await Promise.all([
      ssm.send(new GetParameterCommand({ Name: TOKEN_PARAM_NAME, WithDecryption: true })),
      ssm.send(new GetParameterCommand({ Name: EXPIRY_PARAM_NAME })),
    ]);
    const token     = tok?.Parameter?.Value;
    const expiresAt = parseInt(exp?.Parameter?.Value, 10);
    if (token && expiresAt && Date.now() < (expiresAt - EXPIRY_BUFFER_MS)) {
      console.log(`[adp] SSM token valid until ${new Date(expiresAt).toISOString()}`);
      cachedToken    = token;
      tokenExpiresAt = expiresAt;
      return { token, expiresAt };
    }
    return null;
  } catch (err) {
    if (err?.name === 'ParameterNotFound') return null;
    console.warn('[adp] SSM get error:', err?.message || err);
    return null;
  }
}

async function saveTokenToSSM(token, expiresAt) {
  try {
    await Promise.all([
      ssm.send(new PutParameterCommand({
        Name: TOKEN_PARAM_NAME, Value: token,
        Type: 'SecureString', Overwrite: true,
      })),
      ssm.send(new PutParameterCommand({
        Name: EXPIRY_PARAM_NAME, Value: String(expiresAt),
        Type: 'String', Overwrite: true,
      })),
    ]);
    console.log(`[adp] Saved token to SSM; expires ${new Date(expiresAt).toISOString()}`);
  } catch (err) {
    console.warn('[adp] SSM put error (non-fatal):', err?.message || err);
  }
}

async function fetchNewToken() {
  const resp        = await axios.post(CREDS_URL, {}, { httpsAgent, headers: OAUTH_HEADERS });
  const token       = resp.data.access_token;
  const expiresInSec = resp.data.expires_in || 1800;
  const expiresAt   = Date.now() + (expiresInSec * 1000);

  cachedToken    = token;
  tokenExpiresAt = expiresAt;

  await saveTokenToSSM(token, expiresAt);
  console.log(`[adp] Fetched new token; expires in ${expiresInSec}s`);
  return token;
}

async function getBearerToken() {
  if (isMemTokenValid()) return cachedToken;
  const ssmToken = await getTokenFromSSM();
  if (ssmToken?.token) return ssmToken.token;
  return fetchNewToken();
}

/** =======================
 *  ADP GET helper with 401 retry
 *  Returns { statusCode, data } or { statusCode, error }
 *  ======================= */
async function adpGet(token, domain, uri) {
  const url     = `${domain}${uri}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Connection: 'Keep-Alive',
    'Accept-Encoding': 'gzip,deflate,compress',
  };

  const attempt = async (hdrs) => axios({ method: 'GET', url, httpsAgent, headers: hdrs });

  try {
    const resp = await attempt(headers);
    if (resp.status === 204) return { statusCode: 204, data: null };
    return { statusCode: 200, data: resp.data };
  } catch (err) {
    if (err?.response?.status === 401) {
      console.warn(`[adp] 401 on ${uri} — refreshing token`);
      try {
        const fresh    = await fetchNewToken();
        const resp     = await attempt({ ...headers, Authorization: `Bearer ${fresh}` });
        if (resp.status === 204) return { statusCode: 204, data: null };
        return { statusCode: 200, data: resp.data };
      } catch (retryErr) {
        const sc = retryErr?.response?.status || 998;
        console.error(`[adp] Retry failed for ${uri}: ${sc}`);
        return { statusCode: sc, error: retryErr?.response?.data || retryErr?.message };
      }
    }
    const sc = err?.response?.status || 999;
    return { statusCode: sc, error: err?.response?.data || err?.message };
  }
}

/** =======================
 *  Concurrency helper
 *  ======================= */
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

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

module.exports = { getBearerToken, fetchNewToken, adpGet, mapWithConcurrency };
