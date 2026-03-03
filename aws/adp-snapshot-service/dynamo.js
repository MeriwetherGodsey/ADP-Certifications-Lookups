'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  BatchWriteCommand,
  BatchGetCommand,
  ScanCommand,
} = require('@aws-sdk/lib-dynamodb');

const REGION = process.env.AWS_REGION || 'us-east-1';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions:   { removeUndefinedValues: true },
  unmarshallOptions: { wrapNumbers: false },
});

const ROSTER_TABLE = process.env.ROSTER_TABLE || 'adp_roster_latest';
const CERTS_TABLE  = process.env.CERTS_TABLE  || 'adp_associate_certs_latest';

/** =======================
 *  Batch write helper
 *  Handles DynamoDB's 25-item limit and unprocessed-items retry
 *  ======================= */
async function batchWrite(tableName, items) {
  const CHUNK = 25;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    let requests = chunk.map((item) => ({ PutRequest: { Item: item } }));

    let attempts = 0;
    while (requests.length > 0 && attempts < 5) {
      attempts++;
      const resp = await ddb.send(new BatchWriteCommand({
        RequestItems: { [tableName]: requests },
      }));

      const unprocessed = resp.UnprocessedItems?.[tableName];
      if (!unprocessed || unprocessed.length === 0) break;

      console.warn(`[dynamo] ${unprocessed.length} unprocessed items in ${tableName} — retrying (attempt ${attempts})`);
      requests = unprocessed;
      await sleep(200 * attempts);
    }

    if (attempts >= 5) {
      console.error(`[dynamo] batchWrite gave up on ${requests.length} items after ${attempts} attempts`);
    }
  }
}

/** =======================
 *  Batch get helper
 *  Handles 100-item limit and unprocessed keys retry
 *  Returns array of items (order not guaranteed)
 *  ======================= */
async function batchGet(tableName, keys) {
  const CHUNK = 100;
  const results = [];

  for (let i = 0; i < keys.length; i += CHUNK) {
    let pending = keys.slice(i, i + CHUNK);
    let attempts = 0;

    while (pending.length > 0 && attempts < 5) {
      attempts++;
      const resp = await ddb.send(new BatchGetCommand({
        RequestItems: { [tableName]: { Keys: pending } },
      }));

      const items = resp.Responses?.[tableName] || [];
      results.push(...items);

      const unprocessed = resp.UnprocessedKeys?.[tableName]?.Keys;
      if (!unprocessed || unprocessed.length === 0) break;

      console.warn(`[dynamo] ${unprocessed.length} unprocessed keys in ${tableName} — retrying (attempt ${attempts})`);
      pending = unprocessed;
      await sleep(200 * attempts);
    }
  }

  return results;
}

/** =======================
 *  Scan all AOIDs from roster table
 *  Uses pagination to handle large tables
 *  ======================= */
async function scanAllRosterAoids() {
  const aoids = [];
  let lastKey = undefined;

  do {
    const resp = await ddb.send(new ScanCommand({
      TableName:            ROSTER_TABLE,
      ProjectionExpression: 'aoid',
      ExclusiveStartKey:    lastKey,
    }));
    for (const item of (resp.Items || [])) {
      if (item.aoid) aoids.push(item.aoid);
    }
    lastKey = resp.LastEvaluatedKey;
  } while (lastKey);

  return aoids;
}

/** =======================
 *  Scan all roster items (for getRoster)
 *  ======================= */
async function scanAllRoster() {
  const items = [];
  let lastKey = undefined;

  do {
    const resp = await ddb.send(new ScanCommand({
      TableName:         ROSTER_TABLE,
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(resp.Items || []));
    lastKey = resp.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = {
  ROSTER_TABLE,
  CERTS_TABLE,
  batchWrite,
  batchGet,
  scanAllRosterAoids,
  scanAllRoster,
};
