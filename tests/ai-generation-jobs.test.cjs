const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');
function load(file, deps = {}) {
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'module', 'exports', js)(name => name in deps ? deps[name] : require(name), module, module.exports);
  return module.exports;
}
function fixture(generate = async () => NextResponse.json({ created: 12 })) {
  const job = { id: 'job', creatorId: 'owner', calendarId: 'calendar', status: 'PENDING', request: {} };
  let calls = 0;
  const api = load('lib/aiGenerationJobs.ts', {
    '@/lib/db': { db: {
      aiGenerationJob: {
        findUnique: async ({ where }) => where.id === job.id ? job : null,
        updateMany: async ({ where, data }) => { if (where.status !== job.status) return { count: 0 }; Object.assign(job, data); return { count: 1 }; },
        update: async ({ data }) => Object.assign(job, data),
      },
      creator: { findUnique: async () => ({ id: 'owner' }) },
    } },
    '@/lib/calendarPermissions': { hasCalendarPermission: async () => true },
    '@/lib/calendarAiGeneration': { generateCalendarDrafts: async (...args) => { calls++; assert.equal(args[2].id, 'owner'); return generate(...args); } },
  });
  return { api, job, calls: () => calls };
}
test('background generation saves results and claims a redelivery only once', async () => {
  const f = fixture();
  await Promise.all([f.api.runAiGenerationJob('job'), f.api.runAiGenerationJob('job')]);
  assert.equal(f.calls(), 1);
  assert.equal(f.job.status, 'COMPLETED');
  assert.deepEqual(f.job.result, { created: 12 });
});
test('a missing job cannot run generation', async () => {
  const f = fixture();
  assert.equal(await f.api.runAiGenerationJob('missing'), false);
  assert.equal(f.calls(), 0);
  assert.equal(f.job.status, 'PENDING');
});
test('generation errors preserve the API status and allowance message', async () => {
  const f = fixture(async () => NextResponse.json({ error: 'Allowance used up' }, { status: 403 }));
  await f.api.runAiGenerationJob('job');
  assert.equal(f.job.status, 'FAILED');
  assert.equal(f.job.httpStatus, 403);
  assert.equal(f.job.result.error, 'Allowance used up');
});
test('status polling does not expose another creator’s job', async () => {
  let query;
  const api = load('app/api/calendars/[id]/ai-generate/[jobId]/route.ts', {
    '@/lib/auth': { getCurrentCreator: async () => ({ id: 'other' }) },
    '@/lib/calendarPermissions': { hasCalendarPermission: async () => true },
    '@/lib/db': { db: { aiGenerationJob: { findFirst: async (args) => { query = args; return null; } } } },
  });
  const response = await api.GET(new NextRequest('http://localhost'), { params: Promise.resolve({ id: 'calendar', jobId: 'job' }) });
  assert.equal(response.status, 404);
  assert.equal(query.where.creatorId, 'other');
});
test('HTML gateway errors produce actionable text instead of JSON syntax errors', async () => {
  const { readAiGenerationResponse } = load('lib/aiGenerationResponse.ts');
  await assert.rejects(readAiGenerationResponse(new Response('<!DOCTYPE html>', { status: 504 })), /Check your drafts/);
  assert.deepEqual(await readAiGenerationResponse(Response.json({ created: 3 })), { created: 3 });
});
test('web admission queues one durable job and never calls a network executor', async () => {
  const originalFetch = global.fetch;
  let stored;
  try {
    global.fetch = async () => { throw new Error('Web admission must not dispatch to Netlify or a VPS HTTP endpoint'); };
    const api = load('lib/aiGenerationJobs.ts', {
      '@/lib/db': { db: { aiGenerationJob: { upsert: async ({ create }) => stored ||= { ...create, status: 'PENDING' } } } },
      '@/lib/calendarPermissions': { hasCalendarPermission: async () => true },
      '@/lib/calendarAiGeneration': {},
    });
    const request = () => new NextRequest('http://localhost/api', { method: 'POST', headers: { 'idempotency-key': 'operation' }, body: JSON.stringify({ platforms: ['INSTAGRAM'] }) });
    const first = await api.enqueueAiGeneration(request(), 'calendar', 'owner');
    const second = await api.enqueueAiGeneration(request(), 'calendar', 'owner');
    assert.equal(first.status, 202);
    assert.equal((await first.json()).jobId, (await second.json()).jobId);
    assert.equal(stored.creatorId, 'owner');
    assert.equal(stored.status, 'PENDING');
  } finally {
    global.fetch = originalFetch;
  }
});
test('queue checks workspace permission before creating any job', async () => {
  const api = load('lib/aiGenerationJobs.ts', {
    '@/lib/db': { db: {} },
    '@/lib/calendarPermissions': { hasCalendarPermission: async () => false },
    '@/lib/calendarAiGeneration': {},
  });
  const response = await api.enqueueAiGeneration(new NextRequest('http://localhost/api', { method: 'POST', body: '{}' }), 'calendar', 'owner');
  assert.equal(response.status, 403);
});
test('VPS worker polls pending jobs, expires old admissions and drains on shutdown', async () => {
  const previous = { DATABASE_URL: process.env.DATABASE_URL, OPENAI_API_KEY: process.env.OPENAI_API_KEY };
  process.env.DATABASE_URL = 'test-not-connected';
  process.env.OPENAI_API_KEY = 'test-not-connected';
  const controller = new AbortController();
  const events = [];
  try {
    const worker = load('workers/ai/worker.ts', {
      '../../lib/db': { db: {
        aiGenerationJob: {
          updateMany: async ({ where }) => { assert.equal(where.status, 'PENDING'); assert.ok(where.createdAt.lt instanceof Date); events.push('expire'); },
          findFirst: async ({ where }) => { assert.equal(where.status, 'PENDING'); events.push('poll'); return { id: 'job' }; },
        },
        $disconnect: async () => events.push('disconnect'),
      } },
      '../../lib/aiGenerationJobs': { runAiGenerationJob: async (id) => {
        assert.equal(id, 'job'); events.push('started'); controller.abort();
        await new Promise(resolve => setImmediate(resolve)); events.push('finished');
      } },
    });
    await worker.runAiWorker(controller.signal);
    assert.deepEqual(events, ['expire', 'poll', 'started', 'finished', 'disconnect']);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
