import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdtemp,cp,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {tmpdir} from 'node:os';
const root=path.resolve('dist-vps-native-disabled');
const dirs=(await readdir(root)).filter(n=>!n.endsWith('.gz')&&!n.endsWith('.sha256'));
const candidates=await Promise.all(dirs.map(async n=>({dir:path.join(root,n),meta:JSON.parse(await readFile(path.join(root,n,'release.json')))})));
const current=candidates.find(c=>Object.entries(c.meta.sourceHashes).every(([f,h])=>{try{return createHash('sha256').update(requireRead(f)).digest('hex')===h;}catch{return false;}}));
import {readFileSync as requireRead} from 'node:fs';
assert.ok(current,'package must match current source tree');
const dir=current.dir;
const run=(args,cwd=dir,env={})=>spawnSync(process.execPath,args,{cwd,encoding:'utf8',env:{PATH:process.env.PATH,...env}});
test('current executable is packaged, without credentials or host-native dependencies',async()=>{
 assert.deepEqual((await readdir(dir)).sort(),['SHA256SUMS','check.sh','dependencies-check.cjs','disabled.env','install.sh','metafile.json','offline-deny.cjs','package-lock.json','package.json','release.json','rollback.sh','run.cjs'].sort());
 assert.equal(await readFile(path.join(dir,'run.cjs'),'utf8'),await readFile('dist-worker-native/run.cjs','utf8'));
 assert.equal(current.meta.publishingEnabled,false);assert.equal(current.meta.dependenciesInstalled,false);
 const lock=JSON.parse(await readFile(path.join(dir,'package-lock.json'))),pkg=JSON.parse(await readFile(path.join(dir,'package.json')));
 assert.deepEqual(pkg.dependencies,lock.packages[''].dependencies);
 for(const [key,p]of Object.entries(lock.packages)){if(!key)continue;assert.ok(p.integrity);assert.match(p.resolved,/^https:\/\/registry\.npmjs\.org\//);assert.notEqual(p.dev,true);}
 for(const name of ['pg','@aws-sdk/client-s3','sharp','heic-convert','ffmpeg-static','ffprobe-static'])assert.equal(pkg.dependencies[name],lock.packages['node_modules/'+name].version);
 assert.ok(Object.keys(lock.packages).some(k=>k.includes('sharp-linux-x64')),'Linux optional native package preserved');
 assert.ok(!Object.keys(lock.packages).some(k=>k==='node_modules/next'||k==='node_modules/@prisma/client'));
});
test('packaged command stays offline and disabled for every mode',()=>{
 for(const command of ['--check','--run','--reconcile']){const p=run(['--require','./offline-deny.cjs','./run.cjs',command]);assert.equal(p.status,0,p.stderr);assert.deepEqual(JSON.parse(p.stdout),{state:'disabled',publishingEnabled:false,databaseConnected:false,maySend:false});}
 assert.equal(run(['--require','./offline-deny.cjs','./run.cjs','--run'],dir,{SHOWWORK_PUBLISHING_ENABLED:'true'}).status,78);
});
test('offline package check rejects modified worker and install has no activation commands',async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'sw-native-package-test-'));
 try{await cp(dir,temp,{recursive:true});let p=spawnSync('sh',['./check.sh'],{cwd:temp,encoding:'utf8',env:{PATH:process.env.PATH,SHOWWORK_PUBLISHING_ENABLED:'true'}});assert.equal(p.status,0,p.stderr);
  await writeFile(path.join(temp,'run.cjs'),'throw Error("tampered")');p=spawnSync('sh',['./check.sh'],{cwd:temp,encoding:'utf8',env:{PATH:process.env.PATH}});assert.notEqual(p.status,0);
  for(const f of ['install.sh','rollback.sh'])assert.doesNotMatch(await readFile(path.join(dir,f),'utf8'),/^(?:systemctl|service|sudo|ssh|curl|wget)\s/m);
 }finally{await rm(temp,{recursive:true,force:true});}
});
