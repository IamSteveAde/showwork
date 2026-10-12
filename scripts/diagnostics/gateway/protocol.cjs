'use strict';
const { createHash, createPublicKey, sign, verify, randomBytes } = require('node:crypto');
const { QUOTAS, queryHash } = require('./contract.cjs');
const PATH = '/v1/measure';
function validateManifest(m, now = Date.now()) {
  if (!m || Object.keys(m).sort().join(',') !== ['audience','expiresAt','notBefore','publicKey','queryHash','runId','version'].sort().join(',')) throw new Error('INVALID_MANIFEST');
  if (m.version !== 1 || !/^[a-f0-9]{32}$/.test(m.runId) || !/^[a-zA-Z0-9.-]{1,120}$/.test(m.audience) || m.queryHash !== queryHash) throw new Error('INVALID_MANIFEST');
  const start = Date.parse(m.notBefore), end = Date.parse(m.expiresAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 7200000 || now >= end) throw new Error('INVALID_EXPIRY');
  const key = createPublicKey(m.publicKey); if (key.asymmetricKeyType !== 'ed25519') throw new Error('INVALID_KEY');
  return Object.freeze({ ...m, start, end, key });
}
function message({ runId, audience, timestamp, nonce, body }) {
  return ['showwork-measure-v1',runId,'POST',PATH,audience,timestamp,nonce,createHash('sha256').update(body).digest('hex')].join('\n');
}
function signedRequest(manifest, privateKey, profile, now = Date.now(), nonce = randomBytes(24).toString('hex')) {
  const body = JSON.stringify({ profile });
  const values = { runId: manifest.runId, audience: manifest.audience, timestamp: String(now), nonce, body };
  return { method: 'POST', path: PATH, body, headers: { 'content-type':'application/json','x-sw-run':values.runId,'x-sw-audience':values.audience,'x-sw-time':values.timestamp,'x-sw-nonce':nonce,'x-sw-signature':sign(null,Buffer.from(message(values)),privateKey).toString('base64') } };
}
function authenticate(request, manifest, now) {
  const h = request.headers || {}, body = request.body;
  if (request.method !== 'POST' || request.path !== PATH) throw new Error('NOT_FOUND');
  if (typeof body !== 'string' || Buffer.byteLength(body) > 1024 || h['content-type'] !== 'application/json' || h['content-encoding']) throw new Error('INVALID_REQUEST');
  if (h['x-sw-run'] !== manifest.runId || h['x-sw-audience'] !== manifest.audience || !/^\d{13}$/.test(h['x-sw-time'] || '') || !/^[a-f0-9]{48}$/.test(h['x-sw-nonce'] || '') || !/^[A-Za-z0-9+/]{86}==$/.test(h['x-sw-signature'] || '')) throw new Error('UNAUTHORIZED');
  if (now < manifest.start || now >= manifest.end || Math.abs(now - Number(h['x-sw-time'])) > 30000) throw new Error('EXPIRED');
  if (!verify(null,Buffer.from(message({ runId:manifest.runId,audience:manifest.audience,timestamp:h['x-sw-time'],nonce:h['x-sw-nonce'],body })),manifest.key,Buffer.from(h['x-sw-signature'],'base64'))) throw new Error('UNAUTHORIZED');
  // Deliberately narrow flat grammar: duplicate keys, escapes, arrays and extra keys
  // cannot create differences between the signing, authorization and execution paths.
  const match = /^\s*\{\s*"profile"\s*:\s*"([a-z-]+)"\s*\}\s*$/.exec(body);
  if (!match || !Object.hasOwn(QUOTAS,match[1])) throw new Error('INVALID_PROFILE');
  return { profile:match[1], nonce:h['x-sw-nonce'] };
}
const TIMINGS = Object.freeze(['dnsMs','tcpMs','tlsMs','executorInitMs','connectMs','acquireMs','beginMs','setupMs','statementMs','commitMs','transactionMs','planningMs','executionMs','cleanupMs','durationMs']);
function filterResult(input) {
  if (!input || ![Object.prototype,null].includes(Object.getPrototypeOf(input))) throw new Error('INVALID_RESULT');
  const output = {};
  for (const key of TIMINGS) if (Object.hasOwn(input,key)) {
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < 0 || input[key] > 60000) throw new Error('INVALID_RESULT');
    output[key] = Math.round(input[key]*1000)/1000;
  }
  if (!Object.hasOwn(output,'durationMs')) throw new Error('INVALID_RESULT');
  if (Object.hasOwn(input,'cold')) { if (typeof input.cold !== 'boolean') throw new Error('INVALID_RESULT'); output.cold = input.cold; }
  return output;
}
module.exports = { PATH, validateManifest, signedRequest, authenticate, filterResult };
