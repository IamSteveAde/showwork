const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { gzipSync, gunzipSync } = require('node:zlib');
const { promisify } = require('node:util');
const { execFile } = require('node:child_process');
const ts = require('typescript');
const { packageMediaBinaries } = require('../scripts/package-media-binaries.cjs');
const root = path.resolve(__dirname, '..');
async function resolver() {
  const source = await fs.readFile(path.join(root, 'lib/tiktokProbe.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(require, mod, mod.exports);
  return mod.exports;
}

test('build packaging replaces stale archives and retains exact executable bytes', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'media-package-test-'));
  try {
    const probe = path.join(directory, 'node_modules/ffprobe-static/bin/linux/x64');
    const converter = path.join(directory, 'node_modules/ffmpeg-static');
    await fs.mkdir(probe, { recursive: true }); await fs.mkdir(converter, { recursive: true });
    await fs.mkdir(path.join(directory, '.media-bin')); await fs.writeFile(path.join(directory, '.media-bin/stale.gz'), 'stale');
    const content = Buffer.from('binary-content'.repeat(1000));
    await fs.writeFile(path.join(probe, 'ffprobe'), content); await fs.writeFile(path.join(converter, 'ffmpeg'), content);
    await packageMediaBinaries(directory, 'linux', 'x64');
    assert.deepEqual((await fs.readdir(path.join(directory, '.media-bin'))).sort(), ['ffmpeg-linux-x64.gz', 'ffprobe-linux-x64.gz']);
    for (const name of ['ffmpeg', 'ffprobe']) {
      const archive = await fs.readFile(path.join(directory, `.media-bin/${name}-linux-x64.gz`));
      assert.ok(archive.length < content.length); assert.deepEqual(gunzipSync(archive), content);
    }
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('runtime extracts compressed executables once and launches them from writable temporary storage', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'media-runtime-test-'));
  const previous = process.env.LAMBDA_TASK_ROOT;
  const executables = [];
  try {
    await fs.mkdir(path.join(directory, '.media-bin'));
    for (const name of ['ffmpeg', 'ffprobe']) {
      await fs.writeFile(path.join(directory, `.media-bin/${name}-${process.platform}-${process.arch}.gz`), gzipSync(Buffer.from(`#!/bin/sh\necho '${name} packaged'\n`)));
    }
    process.env.LAMBDA_TASK_ROOT = directory;
    const m = await resolver();
    for (const [name, resolve] of [['ffprobe', m.resolveTikTokProbe], ['ffmpeg', m.resolveTikTokConverter]]) {
      const [first, second] = await Promise.all([resolve(), resolve()]); executables.push(first);
      assert.equal(first, second); assert.ok((await fs.stat(first)).mode & 0o100);
      assert.equal((await promisify(execFile)(first, ['-version'])).stdout.trim(), `${name} packaged`);
    }
  } finally {
    if (previous === undefined) delete process.env.LAMBDA_TASK_ROOT; else process.env.LAMBDA_TASK_ROOT = previous;
    await fs.rm(directory, { recursive: true, force: true });
    for (const file of executables) await fs.rm(path.dirname(file), { recursive: true, force: true });
  }
});

test('deployment configurations include archives and exclude raw executables', async () => {
  const config = (await import('../next.config.mjs')).default('phase-production-build');
  const includes = config.outputFileTracingIncludes['/api/calendars/*/posts/*/publish'];
  assert.deepEqual(includes, ['./.media-bin/*.gz']);
  for (const binary of ['./node_modules/ffprobe-static/bin/**', './node_modules/ffmpeg-static/ffmpeg']) assert.ok(config.outputFileTracingExcludes['/**'].includes(binary));
  const netlify = await fs.readFile(path.join(root, 'netlify.toml'), 'utf8');
  assert.ok(netlify.includes('".media-bin/*.gz"')); assert.ok(netlify.includes('"!node_modules/ffprobe-static/bin/**"'));
});
