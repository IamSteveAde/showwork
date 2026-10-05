const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { Prisma } = require('@prisma/client');

function load(file, deps = {}) {
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('require', 'module', 'exports', 'setTimeout', js)(
    name => name in deps ? deps[name] : require(name), module, module.exports,
    resolve => { resolve(); },
  );
  return module.exports;
}
const plans = load('lib/contentWorkspaceEntitlements.ts');
const conflict = () => new Prisma.PrismaClientKnownRequestError('Conflict', { code: 'P2034', clientVersion: '5.22.0' });

function fixture(onAttempt) {
  let attempts = 0;
  const row = { cycleStart: new Date(), storageBytes: 0n, storageReservedBytes: 0n };
  const reservations = [];
  const tx = {
    contentWorkspaceUsage: {
      findUnique: async () => ({ ...row }),
      update: async ({ data }) => { row.storageReservedBytes += data.storageReservedBytes.increment; },
    },
    contentWorkspaceStorageReservation: {
      create: async ({ data }) => { reservations.push(data); return { id: 'reservation' }; },
    },
  };
  const db = {
    creator: { findUnique: async () => ({ contentWorkspacePlan: 'CREATOR', contentWorkspaceBillingStatus: 'ACTIVE', isComped: false }) },
    socialCalendar: { findUnique: async () => ({ managerId: 'owner' }) },
    contentWorkspaceUsage: { upsert: async () => ({ ...row }) },
    $transaction: async (callback, options) => {
      attempts++;
      assert.equal(options.isolationLevel, Prisma.TransactionIsolationLevel.Serializable);
      // Model a conflict at commit, rolling back all transaction writes.
      const snapshot = { ...row };
      const count = reservations.length;
      try {
        const result = await callback(tx);
        onAttempt(attempts);
        return result;
      } catch (error) {
        Object.assign(row, snapshot);
        reservations.length = count;
        if (error.code === 'P2034' && onAttempt.fillQuota) row.storageReservedBytes = 5_000_000_000n;
        throw error;
      }
    },
  };
  const api = load('lib/contentWorkspaceUsage.ts', { '@/lib/db': { db }, '@/lib/contentWorkspaceEntitlements': plans });
  return { reserve: () => api.reserveContentWorkspaceStorage('owner', 'calendar', 'file', 100), row, reservations, attempts: () => attempts };
}

test('retries conflicts and commits exactly one reservation and increment', async () => {
  const f = fixture(attempt => { if (attempt < 3) throw conflict(); });
  const result = await f.reserve();
  assert.equal(result.allowed, true);
  assert.equal(result.storageReservedBytes, 100);
  assert.equal(f.attempts(), 3);
  assert.equal(f.row.storageReservedBytes, 100n);
  assert.equal(f.reservations.length, 1);
});

test('retry reads fresh storage and denies an upload if another transaction filled the quota', async () => {
  // The second callback returns a quota denial; a read-only transaction can commit.
  const f = fixture(Object.assign(attempt => { if (attempt === 1) throw conflict(); }, { fillQuota: true }));
  assert.equal((await f.reserve()).allowed, false);
  assert.equal(f.attempts(), 2);
  assert.equal(f.reservations.length, 0);
});

test('persistent conflicts stop after six attempts without reserving storage', async () => {
  const error = conflict();
  const f = fixture(() => { throw error; });
  await assert.rejects(f.reserve(), caught => caught === error);
  assert.equal(f.attempts(), 6);
  assert.equal(f.row.storageReservedBytes, 0n);
  assert.equal(f.reservations.length, 0);
});

test('other database errors propagate without retry', async () => {
  const error = new Prisma.PrismaClientKnownRequestError('Unique constraint', { code: 'P2002', clientVersion: '5.22.0' });
  const f = fixture(() => { throw error; });
  await assert.rejects(f.reserve(), caught => caught === error);
  assert.equal(f.attempts(), 1);
});
