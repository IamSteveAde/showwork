const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { Prisma } = require('@prisma/client');
const { load } = require('./helpers/load-typescript.cjs');
const keys = ['DIAGNOSTIC_TOKEN','DIAGNOSTIC_DATABASE_URL','DIAGNOSTIC_ROLE_NAME','DIAGNOSTIC_DB_HOST','DIAGNOSTIC_EXPIRES_AT','URL'];
const original = Object.fromEntries(keys.map(key=>[key,process.env[key]]));
const originalFetch = global.fetch;
afterEach(()=>{for(const key of keys){if(original[key]===undefined)delete process.env[key];else process.env[key]=original[key];}global.fetch=originalFetch;});
function diagnostic() {
  process.env.DIAGNOSTIC_TOKEN='test-diagnostic-token';process.env.DIAGNOSTIC_ROLE_NAME='sw_diag_ro_20261011_00000000';process.env.DIAGNOSTIC_DB_HOST='invalid';process.env.DIAGNOSTIC_DATABASE_URL='postgresql://sw_diag_ro_20261011_00000000@invalid/only-a-mock?sslmode=require&sslaccept=strict&sslcert=mock-ca.crt&connection_limit=3';process.env.DIAGNOSTIC_EXPIRES_AT=new Date(Date.now()+3600000).toISOString();process.env.URL='https://diagnostics.test';
  const statements=[];
  class Client {
    async $connect(){statements.push('connect');}
    async $transaction(callback){
      let readOnly=false;
      return callback({
        $executeRaw:async strings=>{
          const text=strings.join('');
          if(text==='SET TRANSACTION READ ONLY')readOnly=true;
          else assert.equal(text,"SET LOCAL statement_timeout = '2000ms'");
          statements.push(text);
        },
        $queryRaw:async sql=>{
          assert.ok(readOnly,'database read-only protection must precede query planning');
          const text=Array.isArray(sql)?sql.join(''):sql.text;
          if(text.trimStart().startsWith('SELECT current_user')){statements.push('ROLE CHECK');return [{role:process.env.DIAGNOSTIC_ROLE_NAME,readOnly:'on',privileged:false,canWrite:false,canReadContent:false}];}
          assert.ok(text.trimStart().startsWith('EXPLAIN (ANALYZE, FORMAT JSON) SELECT')||text.trimStart().startsWith('SELECT 1'));
          assert.doesNotMatch(text,/\b(UPDATE|INSERT|DELETE|TRUNCATE|CALL)\b/i);
          statements.push('EXPLAIN');return [{}];
        },
      });
    }
  }
  return {statements,handler:load('scripts/diagnostics/publishing-runtime.ts',{'@prisma/client':{Prisma,PrismaClient:Client}}).handler};
}
test('hosted diagnostic authenticates before any database activity',async()=>{
  const {handler,statements}=diagnostic();
  assert.equal((await handler({headers:{},body:'{}'})).statusCode,401);assert.equal(statements.length,0);
});
test('diagnostic permits only read-only query plans and synthetic publication',async()=>{
  const {handler,statements}=diagnostic();global.fetch=()=>assert.fail('no HTTP publishing');
  const response=await handler({headers:{authorization:'Bearer test-diagnostic-token'},body:JSON.stringify({workload:25,acknowledgementMs:0})});
  assert.equal(response.statusCode,200);const result=JSON.parse(response.body);
  assert.equal(result.syntheticPublished,25);assert.equal(result.noProductionWrites,true);assert.ok(result.peakDatabaseOperations<=3);
  assert.ok(statements.includes('EXPLAIN'));
});
test('credential-free acknowledgement mode exclusively calls the dedicated no-op diagnostic worker',async()=>{
  const {handler}=diagnostic();delete process.env.DIAGNOSTIC_DATABASE_URL;const requests=[];
  global.fetch=async(url)=>{requests.push(url);assert.equal(url,'https://diagnostics.test/.netlify/functions/publishing-ack-background');return{ok:true};};
  const response=await handler({headers:{authorization:'Bearer test-diagnostic-token'},body:JSON.stringify({workload:10,actualAcknowledgement:true,transactionLatencyMs:0,coldConnectionMs:0})});
  assert.equal(response.statusCode,200);assert.equal(requests.length,10);assert.equal(JSON.parse(response.body).syntheticPublished,10);
});
test('production mode rejects publishing acknowledgements, admin credentials, arbitrary fields, and expired endpoints',async()=>{
  const {handler,statements}=diagnostic();
  const call=body=>handler({headers:{authorization:'Bearer test-diagnostic-token'},body:JSON.stringify(body)});
  assert.equal((await call({actualAcknowledgement:true})).statusCode,403);
  assert.equal((await call({sql:'SELECT * FROM secrets'})).statusCode,400);
  process.env.DIAGNOSTIC_DATABASE_URL='postgresql://postgres@invalid/database';assert.equal((await call({})).statusCode,403);
  process.env.DIAGNOSTIC_EXPIRES_AT=new Date(0).toISOString();assert.equal((await call({})).statusCode,403);
  assert.equal(statements.length,0);
});
test('credential-free mode never connects to or queries a database',async()=>{
  const {handler,statements}=diagnostic();delete process.env.DIAGNOSTIC_DATABASE_URL;
  global.fetch=()=>assert.fail('synthetic acknowledgements need no network');
  const response=await handler({headers:{authorization:'Bearer test-diagnostic-token'},body:JSON.stringify({workload:25,acknowledgementMs:0,transactionLatencyMs:0,coldConnectionMs:0})});
  assert.equal(response.statusCode,200);const result=JSON.parse(response.body);
  assert.equal(result.mode,'credential-free-synthetic-transactions-and-no-op-acknowledgements');
  assert.equal(result.syntheticPublished,25);assert.equal(statements.length,0);
});
