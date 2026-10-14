import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, realpath, writeFile, chmod, rm, symlink, mkdir, link } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { inspect } from 'node:util';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { transformSync } from 'esbuild';

// Tests load only these isolated modules, not a worker composition or entrypoint.
async function load(name) {
  const source = await readFile(new URL(`../workers/publishing/${name}.ts`, import.meta.url), 'utf8');
  const { code } = transformSync(source, { loader: 'ts', format: 'cjs', target: 'node22' });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(createRequire(import.meta.url), module, module.exports);
  return module.exports;
}
const { validateConfiguration, parseConfiguration, loadSyntheticCredentials } = await load('config');
const { createResourceLifecycle } = await load('lifecycle');
const valid = { version: 1, mode: 'synthetic-staging', publishingEnabled: false, tickIntervalMs: 60000, shutdownTimeoutMs: 1000, databaseBackendLimit: 2, heavyTransactionLimit: 1, mediaConcurrency: 1 };

test('strict configuration validates exact keys and conservative bounds', () => {
  assert.ok(Object.isFrozen(validateConfiguration(valid)));
  assert.deepEqual(parseConfiguration(JSON.stringify(valid)), valid);
  for (const value of [null, {}, { ...valid, mode: 'production' }, { ...valid, publishingEnabled: true },
    { ...valid, databaseBackendLimit: 5 }, { ...valid, heavyTransactionLimit: 3 },
    { ...valid, mediaConcurrency: 2 }, { ...valid, shutdownTimeoutMs: Infinity },
    { ...valid, tickIntervalMs: 0 }, { ...valid, arbitraryDestination: 'denied' }]) {
    assert.throws(() => validateConfiguration(value), { message: 'CONFIG_INVALID' });
  }
  assert.throws(() => parseConfiguration('not-json'), { message: 'CONFIG_INVALID' });
});

async function credentialFixture(run) {
  const directory = await realpath(await mkdtemp(path.join(tmpdir(), 'showwork-credentials-')));
  await chmod(directory, 0o700);
  const file = path.join(directory, 'publishing.json');
  const secret = randomUUID();
  const value = { version: 1, databaseUrl: `postgresql://synthetic:${secret}@127.0.0.1/showwork_test_stage2` };
  try { await run({ directory, file, secret, value }); }
  finally { await rm(directory, { recursive: true, force: true }); }
}
test('private synthetic credential file loads without connecting; serialization redacts', () => credentialFixture(async ({ directory, file, value, secret }) => {
  await writeFile(file, JSON.stringify(value), { mode: 0o600 });
  const credentials = await loadSyntheticCredentials(directory);
  assert.equal(credentials.databaseConnectionString(), value.databaseUrl);
  for (const rendered of [JSON.stringify(credentials), inspect(credentials), String(credentials)]) {
    assert.ok(!rendered.includes(secret)); assert.ok(!rendered.includes('postgresql:'));
  }
  await chmod(file, 0o400);
  await loadSyntheticCredentials(directory);
}));
test('missing credentials produce sanitized errors without paths', () => credentialFixture(async ({ directory }) => {
  await assert.rejects(loadSyntheticCredentials(undefined), { message: 'CREDENTIALS_MISSING' });
  await assert.rejects(loadSyntheticCredentials(directory), { message: 'CREDENTIALS_MISSING' });
  await assert.rejects(loadSyntheticCredentials('relative'), { message: 'CREDENTIALS_UNSAFE' });
}));
test('rejects unsafe permissions, symlinks, non-files and oversized files', () => credentialFixture(async ({ directory, file, value }) => {
  await writeFile(file, JSON.stringify(value), { mode: 0o644 });
  await assert.rejects(loadSyntheticCredentials(directory), { message: 'CREDENTIALS_UNSAFE' });
  await chmod(file, 0o600); await chmod(directory, 0o755);
  await assert.rejects(loadSyntheticCredentials(directory), { message: 'CREDENTIALS_UNSAFE' });
  await chmod(directory, 0o700); await rm(file);
  const target = path.join(directory, 'target'); await writeFile(target, JSON.stringify(value), { mode: 0o600 });
  await symlink(target, file);
  await assert.rejects(loadSyntheticCredentials(directory), { message: 'CREDENTIALS_UNSAFE' });
  await rm(file); await mkdir(file);
  await assert.rejects(loadSyntheticCredentials(directory), { message: 'CREDENTIALS_UNSAFE' });
  await rm(file, { recursive: true }); await writeFile(file, 'x'.repeat(16385), { mode: 0o600 });
  await assert.rejects(loadSyntheticCredentials(directory), { message: 'CREDENTIALS_UNSAFE' });
}));
test('malformed and non-local credentials fail without leaking original errors', () => credentialFixture(async ({ directory, file, secret, value }) => {
  for (const text of [secret, '{}', JSON.stringify({ ...value, databaseUrl: `postgresql://synthetic:${secret}@example.invalid/showwork_test_stage2` }),
    JSON.stringify({ ...value, databaseUrl: value.databaseUrl + '?host=example.invalid' }),
    JSON.stringify({ ...value, extra: secret })]) {
    await writeFile(file, text, { mode: 0o600 });
    await assert.rejects(loadSyntheticCredentials(directory), error => {
      assert.equal(error.message, 'CREDENTIALS_INVALID');
      assert.equal(error.cause, undefined);
      assert.ok(!inspect(error).includes(secret)); return true;
    });
  }
}));
test('rejects hardlinks, executable credentials and empty files', () => credentialFixture(async ({ directory, file, value }) => {
  await writeFile(file, JSON.stringify(value), { mode: 0o700 });
  await assert.rejects(loadSyntheticCredentials(directory), { message: 'CREDENTIALS_UNSAFE' });
  await chmod(file, 0o600);
  await link(file, path.join(directory, 'duplicate'));
  await assert.rejects(loadSyntheticCredentials(directory), { message: 'CREDENTIALS_UNSAFE' });
  await rm(path.join(directory, 'duplicate')); await writeFile(file, '');
  await assert.rejects(loadSyntheticCredentials(directory), { message: 'CREDENTIALS_UNSAFE' });
}));

function resource(name, calls) { return { stop() { calls.push('stop:' + name); }, close() { calls.push('close:' + name); } }; }
test('shutdown quiesces before closing consumers, media and database; repeated signals close once', async () => {
  const events = [], calls = [], source = new EventEmitter();
  const lifecycle = createResourceLifecycle({ cleanupTimeoutMs: 100, emit: event => events.push(event) });
  lifecycle.attachSignals(source);
  await lifecycle.start(async scope => {
    scope.own('database', resource('db', calls));
    scope.own('media', resource('media', calls));
    scope.own('consumer', resource('consumer', calls));
  });
  source.emit('SIGTERM'); source.emit('SIGINT');
  const first = lifecycle.stop(); assert.equal(first, lifecycle.stop());
  assert.deepEqual(await first, { clean: true });
  assert.deepEqual(calls, ['stop:consumer', 'stop:media', 'stop:db', 'close:consumer', 'close:media', 'close:db']);
  assert.equal(source.listenerCount('SIGTERM'), 0); assert.equal(source.listenerCount('SIGINT'), 0);
  assert.equal(lifecycle.signal.aborted, true); assert.deepEqual(events, ['STARTED', 'STOPPED']);
  await assert.rejects(lifecycle.start(async () => {}), /LIFECYCLE_START_BLOCKED/);
});
test('startup failure closes acquired resources and exposes no underlying secret', async () => {
  const calls = [], events = [], secret = randomUUID();
  const lifecycle = createResourceLifecycle({ cleanupTimeoutMs: 100, emit: event => events.push(event) });
  await assert.rejects(lifecycle.start(async scope => {
    scope.own('database', resource('db', calls));
    throw Error(secret);
  }), { message: 'RESOURCE_START_FAILED' });
  assert.deepEqual(calls, ['stop:db', 'close:db']);
  assert.equal((await lifecycle.stop()).clean, false);
  assert.ok(!JSON.stringify(events).includes(secret));
});
test('closure errors cannot prevent other resources closing or leak messages', async () => {
  const events = [], calls = [];
  const lifecycle = createResourceLifecycle({ cleanupTimeoutMs: 100, emit: event => events.push(event) });
  await lifecycle.start(async scope => {
    scope.own('database', resource('db', calls));
    scope.own('consumer', { stop() { throw Error('synthetic-sensitive-error'); }, close() { throw Error('synthetic-sensitive-error'); } });
  });
  assert.deepEqual(await lifecycle.stop(), { clean: false });
  assert.deepEqual(calls, ['stop:db', 'close:db']);
  assert.deepEqual(events, ['STARTED', 'STOP_FAILED', 'CLOSE_FAILED', 'STOPPED']);
});
test('shutdown during initialization waits for acquisition and disposes it', async () => {
  const calls = []; let entered, release;
  const ready = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const lifecycle = createResourceLifecycle({ cleanupTimeoutMs: 100 });
  const start = lifecycle.start(async scope => { entered(); await gate; scope.own('database', resource('db', calls)); });
  await ready; const stopped = lifecycle.stop(); release(); await start; await stopped;
  assert.deepEqual(calls, ['stop:db', 'close:db']);
});
test('hung cleanup is bounded and reported unclean', async () => {
  const events = [], calls = [];
  const lifecycle = createResourceLifecycle({ cleanupTimeoutMs: 10, emit: event => events.push(event) });
  await lifecycle.start(async scope => {
    scope.own('database', resource('db', calls));
    scope.own('consumer', { close: () => new Promise(() => {}) });
  });
  assert.deepEqual(await lifecycle.stop(), { clean: false });
  assert.ok(events.includes('CLEANUP_TIMEOUT')); assert.ok(calls.includes('close:db'));
});
test('late acquisition after startup timeout is still cleaned', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  const calls = [], lifecycle = createResourceLifecycle({ cleanupTimeoutMs: 10 });
  const started = lifecycle.start(async scope => { await gate; scope.own('database', resource('db', calls)); });
  const rejected = assert.rejects(started, /RESOURCE_START_FAILED/);
  assert.deepEqual(await lifecycle.stop(), { clean: false });
  release(); await rejected;
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ['stop:db', 'close:db']);
});
test('stop before startup prevents acquisition and observer failure cannot break cleanup', async () => {
  const lifecycle = createResourceLifecycle({ cleanupTimeoutMs: 100, emit() { throw Error('observer failure'); } });
  assert.deepEqual(await lifecycle.stop(), { clean: true });
  await assert.rejects(lifecycle.start(async () => assert.fail('must not initialize')), /LIFECYCLE_START_BLOCKED/);
  assert.throws(() => lifecycle.attachSignals(new EventEmitter()), /SIGNAL_BINDING_BLOCKED/);
});
