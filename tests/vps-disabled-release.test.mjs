import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readdir,readFile,mkdtemp,cp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const base=path.resolve('dist-vps-disabled');
const name=(await readdir(base)).filter(x=>!x.includes('.tar.')&&x.startsWith('sw-disabled-')).sort().at(-1);
const dir=path.join(base,name);
const run=(args,cwd=dir)=>spawnSync(process.execPath,args,{cwd,encoding:'utf8',env:{PATH:process.env.PATH}});
test('release inventory has only reviewed files and no runtime packages',async()=>{
 assert.deepEqual((await readdir(dir)).sort(),['SHA256SUMS','check.sh','disabled.json','install.sh','main.cjs','metafile.json','offline-deny.cjs','release.json','rollback.sh'].sort());
 const meta=JSON.parse(await readFile(path.join(dir,'release.json')));assert.deepEqual(meta.runtimeDependencies,[]);assert.equal(meta.publishingEnabled,false);
 const graph=JSON.parse(await readFile(path.join(dir,'metafile.json')));for(const o of Object.values(graph.outputs))for(const i of o.imports)assert.ok(meta.builtins.includes(i.path));
});
test('offline composition has exact inert result; bare startup and enabled configuration rejected',async()=>{
 const config=await readFile(path.join(dir,'disabled.json'),'utf8');
 const result=run(['--require','./offline-deny.cjs','./main.cjs','--check-composition',config]);assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),{state:'disabled',publishingEnabled:false,databaseConnected:false,maySend:false});
 for(const c of [{}, {...JSON.parse(config),publishingEnabled:true},{...JSON.parse(config),password:'forbidden'}])assert.equal(run(['--require','./offline-deny.cjs','./main.cjs','--check-composition',JSON.stringify(c)]).status,78);
 assert.equal(run(['--require','./offline-deny.cjs','./main.cjs']).status,78);
});
test('offline guard rejects network, process and scheduler primitives',()=>{
 for(const source of ['fetch("https://invalid")','require("node:net").connect(443,"invalid")','require("node:https").get("https://invalid")','setInterval(()=>{},1)','setTimeout(()=>{},1)','require("node:child_process").spawn("true")']){
 const p=run(['--require','./offline-deny.cjs','-e',source]);assert.notEqual(p.status,0);assert.match(p.stderr,/OFFLINE_IO_FORBIDDEN/);
 }
});
test('integrity check rejects modified artifact',async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'sw-disabled-test-'));try{
 await cp(dir,temp,{recursive:true});await writeFile(path.join(temp,'main.cjs'),'throw Error("tampered");');
 const p=spawnSync('sh',['./check.sh'],{cwd:temp,encoding:'utf8',env:{PATH:process.env.PATH}});assert.notEqual(p.status,0);assert.match(p.stdout+p.stderr,/FAILED/);
 }finally{await rm(temp,{recursive:true,force:true});}
});
test('install and rollback have no service commands and reject unapproved user',async()=>{
 for(const f of ['install.sh','rollback.sh']){
 const source=await readFile(path.join(dir,f),'utf8');assert.doesNotMatch(source,/^(?:systemctl|service|sudo|ssh|curl|wget)\s/m);
 const p=spawnSync('sh',['./'+f,'sw-disabled-invalid'],{cwd:dir,encoding:'utf8',env:{PATH:process.env.PATH}});assert.notEqual(p.status,0);
 }
});
test('rollback atomically selects validated previous release and preserves unrelated app data (local path model)',async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'sw-disabled-rollback-'));try{
 const {mkdir,chmod,symlink,readlink}=await import('node:fs/promises');
 const app=path.join(temp,'app'),releases=path.join(temp,'releases'),bin=path.join(temp,'bin');await Promise.all([mkdir(app),mkdir(releases),mkdir(bin)]);
 await cp(dir,path.join(releases,name),{recursive:true});await symlink(path.join(releases,'sw-disabled-current'),path.join(app,'publishing-disabled'));await writeFile(path.join(app,'website'),'unchanged');
 const source=(await readFile(path.join(dir,'rollback.sh'),'utf8')).replace('/home/showwork/releases',releases).replace('/home/showwork/app',app);
 await writeFile(path.join(temp,'rollback.sh'),source);
 await writeFile(path.join(bin,'id'),'#!/bin/sh\necho showwork\n');await chmod(path.join(bin,'id'),0o700);
 // macOS lacks GNU mv -T; this test shim models same-filesystem atomic rename.
 await writeFile(path.join(bin,'mv'),'#!/bin/sh\n[ "$1" = -Tf ] || exit 1\nshift\nexec '+process.execPath+' -e \'require("node:fs").renameSync(process.argv[1],process.argv[2])\' "$@"\n');await chmod(path.join(bin,'mv'),0o700);
 const p=spawnSync('sh',[path.join(temp,'rollback.sh'),name],{encoding:'utf8',env:{PATH:bin+':'+process.env.PATH}});assert.equal(p.status,0,p.stderr);
 assert.equal(await readlink(path.join(app,'publishing-disabled')),path.join(releases,name));assert.equal(await readFile(path.join(app,'website'),'utf8'),'unchanged');
 const bad=spawnSync('sh',[path.join(temp,'rollback.sh'),'../bad'],{encoding:'utf8',env:{PATH:bin+':'+process.env.PATH}});assert.notEqual(bad.status,0);assert.equal(await readlink(path.join(app,'publishing-disabled')),path.join(releases,name));
 }finally{await rm(temp,{recursive:true,force:true});}
});
