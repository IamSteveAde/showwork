const {test}=require('node:test');const assert=require('node:assert/strict');const {load}=require('./helpers/load-typescript.cjs');
const {AiProviderError}=load('lib/content/providerError.ts');
test('schema diagnostics expose only safe metadata, never provider message contents',()=>{
 const e=new AiProviderError(400,{code:'invalid_json_schema',type:'invalid_request_error',param:'text.format.schema',message:'PRIVATE BUSINESS TEXT token secret'},'req_123');
 assert.equal(e.code,'invalid_json_schema');assert.equal(e.param,'text.format.schema');assert.match(e.message,/request settings/);
 assert.doesNotMatch(JSON.stringify(e)+e.message,/PRIVATE|secret/);
 assert.equal(e.diagnostic().requestId,'req_123');
});
test('quota failures provide a billing explanation rather than a generic retry message',()=>{
 const e=new AiProviderError(429,{code:'insufficient_quota'},null);assert.match(e.message,/billing/);
});
test('untrusted error fields cannot inject content into diagnostics',()=>{
 const e=new AiProviderError(400,{code:'private business text',param:'secret: token'},'invalid id');assert.equal(e.code,'AI_PROVIDER_REJECTED');assert.equal(e.param,undefined);assert.equal(e.requestId,undefined);
});

test('actual exhausted-credit provider response is identified as billing, not transient rate limiting',()=>{
 const e=new AiProviderError(429,{code:'credit_balance_exhausted',type:'insufficient_quota'},'req_test');
 assert.equal(e.code,'credit_balance_exhausted');
 assert.match(e.message,/API credit or quota/);
 assert.doesNotMatch(e.message,/Wait briefly/);
 assert.equal(e.diagnostic().type,'insufficient_quota');
});
