'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {validateConfig}=require('../scripts/vps/config.cjs'),{createSupervisor}=require('../scripts/vps/supervisor.cjs'),{checkHealth}=require('../scripts/vps/healthcheck.cjs');
const config=JSON.parse(fs.readFileSync(path.join(__dirname,'../deploy/vps/worker.config.json'),'utf8'));
test('preparation configuration cannot enable publishing, production, extra destinations or larger pools',()=>{
 assert.equal(validateConfig(config).publishingEnabled,false);
 for(const change of [{environment:'production'},{publishingEnabled:true},{databaseBackendLimit:6},{heavyTransactionLimit:4},{consumerLimit:3},{serviceUser:'root'},{url:'unapproved'},{consumerDurationMs:900000}])assert.throws(()=>validateConfig({...config,...change}));
});
test('CLI check succeeds offline; run/start flags cannot activate worker',()=>{
 const script=path.join(__dirname,'../scripts/vps/worker.cjs');
 const ok=spawnSync(process.execPath,[script,'--check'],{encoding:'utf8'});assert.equal(ok.status,0);assert.equal(JSON.parse(ok.stdout).databaseConnected,false);
 for(const args of [[],['--run'],['--check','--run']]){const r=spawnSync(process.execPath,[script,...args],{encoding:'utf8'});assert.equal(r.status,78);assert.match(r.stderr,/WORKER_START_BLOCKED/);}
});
test('supervisor serializes ticks, recovers a transient tick failure and closes once',async()=>{
 const controller=new AbortController();let calls=0,active=0,peak=0,closed=0;const events=[];
 const s=createSupervisor({signal:controller.signal,intervalMs:1,emit:e=>events.push(e.event),wait:async()=>{},runtime:{async tick(){active++;peak=Math.max(peak,active);calls++;await Promise.resolve();active--;if(calls===1)throw Error('do not log raw details');if(calls===3)controller.abort();},async close(){closed++;}}});
 await s.run();assert.equal(calls,3);assert.equal(peak,1);assert.equal(closed,1);assert.deepEqual(events,['tick-failed','tick-complete','tick-complete']);assert.equal(s.active,false);await assert.rejects(s.run(),/ALREADY_STARTED/);
});
test('shutdown stops admission during an in-flight tick and awaits runtime cleanup',async()=>{
 const c=new AbortController();let finish,entered;const ready=new Promise(r=>entered=r),gate=new Promise(r=>finish=r);let closes=0;
 const s=createSupervisor({signal:c.signal,intervalMs:1,runtime:{async tick(){entered();await gate;},async close(){closes++;finish();}}});
 const run=s.run();await ready;c.abort();await run;assert.equal(closes,1);assert.equal(s.active,false);
});
test('already aborted supervisor performs no tick',async()=>{
 const c=new AbortController();c.abort();let closed=0;await createSupervisor({signal:c.signal,runtime:{async tick(){assert.fail();},async close(){closed++;}}}).run();assert.equal(closed,1);
});
test('health checker rejects absent, stale, future and production heartbeat',()=>{
 const state={mode:'synthetic-staging',state:'running',timestamp:100000,publishingEnabled:false};assert.equal(checkHealth(state,100001),true);
 for(const value of [null,{...state,timestamp:1},{...state,timestamp:200000},{...state,mode:'production'},{...state,state:'stopping'},{...state,publishingEnabled:true}])assert.equal(checkHealth(value,100001),false);
});
test('service template enforces non-root execution, external credentials and closed activation gate',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../deploy/vps/showwork-publishing.service'),'utf8');
 for(const line of ['User=showwork','Group=showwork','WorkingDirectory=/home/showwork/app','ConditionPathExists=/etc/showwork/publishing.approved','RestartPreventExitStatus=78','NoNewPrivileges=true','ProtectSystem=strict','KillMode=control-group'])assert.ok(s.includes(line));
 assert.match(s,/LoadCredential=publishing.json:\/etc\/showwork\//);assert.doesNotMatch(s,/EnvironmentFile=.*app/);
});
