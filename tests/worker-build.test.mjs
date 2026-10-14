import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildWorker,approvedSources } from '../scripts/vps/build-worker.mjs';

async function fixture(run) {
  const root = await mkdtemp(path.join(tmpdir(), 'showwork-build-'));
  try {
    await mkdir(path.join(root, 'workers/publishing'), { recursive: true });
    await mkdir(path.join(root, 'lib/publishing'), { recursive: true });
    for (const file of ['tsconfig.worker.json', ...approvedSources]) {
      await mkdir(path.dirname(path.join(root,file)),{recursive:true});
      await writeFile(path.join(root, file), await readFile(new URL('../' + file, import.meta.url)));
    }
    await run(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('alias resolves; reproducible artifact has no external imports; check is inert', () => fixture(async root => {
  const result = await buildWorker(root);
  assert.deepEqual(Object.keys(result.metafile.inputs).sort(), [...approvedSources].sort());
  const artifact = path.join(root, 'dist-worker/main.cjs');
  const first = await readFile(artifact);
  await buildWorker(root);
  assert.deepEqual(await readFile(artifact), first);
  const env = { PATH: path.dirname(process.execPath) };
  const check = spawnSync(process.execPath, [artifact, '--check'], { encoding: 'utf8', env });
  if (Number(process.versions.node.split('.')[0]) === 22) {
    assert.equal(check.status, 0, check.stderr);
    assert.deepEqual(JSON.parse(check.stdout), { state: 'preparation-only', publishingEnabled: false, databaseConnected: false, runtimeImplemented: false });
  } else { assert.equal(check.status, 78); assert.match(check.stderr, /Node.js 22/); }
  for (const args of [[], ['--run'], ['--check', '--run']]) {
    const run = spawnSync(process.execPath, [artifact, ...args], { encoding: 'utf8', env });
    assert.equal(run.status, 78);
    assert.match(run.stderr, /WORKER_START_BLOCKED/);
  }
  const configuration={version:1,publishingEnabled:false,owner:'VPS',protocol:'CANONICAL',schema:'public',databasePoolSize:3,workerConcurrency:2,journal:'shared-object-storage',media:'versioned-object-storage',metaVersion:'v26.0',linkedinVersion:'202609',reconciliationIntervalMs:5000};
  const disabled=spawnSync(process.execPath,[artifact,'--check-composition',JSON.stringify(configuration)],{encoding:'utf8',env});assert.equal(disabled.status,0,disabled.stderr);assert.deepEqual(JSON.parse(disabled.stdout),{state:'disabled',publishingEnabled:false,databaseConnected:false,maySend:false});
  const enabled=spawnSync(process.execPath,[artifact,'--check-composition',JSON.stringify({...configuration,publishingEnabled:true})],{encoding:'utf8',env});assert.equal(enabled.status,78);assert.match(enabled.stderr,/COMPOSITION_REJECTED/);
}));

for (const dependency of ['@/lib/db', '@/workers/publishing/config', '@/workers/publishing/lifecycle', 'next/headers', '@prisma/client', 'sharp', 'dotenv/config', 'node:net']) {
  test(`rejects unapproved dependency ${dependency} without retaining stale output`, () => fixture(async root => {
    await buildWorker(root);
    await mkdir(path.join(root, 'lib'), { recursive: true });
    await writeFile(path.join(root, 'lib/db.ts'), 'throw Error("MUST_NOT_EXECUTE");');
    for (const name of ['config', 'lifecycle']) await writeFile(path.join(root, `workers/publishing/${name}.ts`), 'throw Error("MUST_NOT_EXECUTE");');
    await writeFile(path.join(root, 'workers/publishing/main.ts'), `import ${JSON.stringify(dependency)};`);
    await assert.rejects(buildWorker(root));
    await assert.rejects(access(path.join(root, 'dist-worker/main.cjs')));
  }));
}
test('rejects dynamic module loading', () => fixture(async root => {
  await writeFile(path.join(root, 'workers/publishing/main.ts'), 'const target = process.argv[2]; import(target);');
  await assert.rejects(buildWorker(root));
}));
