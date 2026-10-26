const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./helpers/load-typescript.cjs');
process.env.CONTENT_BRIEF_GENERATION_ENABLED='false';
const original={...process.env},originalFetch=global.fetch;
afterEach(()=>{global.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in original))delete process.env[key];Object.assign(process.env,original);});
const {contentModelConfig,contentRequestSettings}=load('lib/content/model.ts');
test('content defaults to Sol medium independently of the general AI model',()=>{
 delete process.env.OPENAI_CONTENT_MODEL;delete process.env.OPENAI_CONTENT_REASONING_EFFORT;
 process.env.OPENAI_MODEL='gpt-4.1-mini';
 const config=contentModelConfig();assert.equal(config.model,'gpt-6.1-sol');assert.equal(config.reasoningEffort,'medium');
 const request=contentRequestSettings(3500,45000);assert.equal(request.maxOutputTokens,11692);assert.equal(request.timeoutMs,180000);assert.equal(request.attempts,1);
});
test('content rollback omits reasoning parameters and token reserve',()=>{
 process.env.OPENAI_CONTENT_MODEL='gpt-4.1';const settings=contentRequestSettings(3500,45000);
 assert.equal(settings.model,'gpt-4.1');assert.equal(settings.reasoningEffort,undefined);assert.equal(settings.maxOutputTokens,3500);
});
test('invalid effort, token budget and unsupported model fail before API calls',()=>{
 process.env.OPENAI_CONTENT_MODEL='gpt-6.1-sol';process.env.OPENAI_CONTENT_REASONING_EFFORT='none';assert.throws(contentModelConfig,/reasoning effort/);
 process.env.OPENAI_CONTENT_REASONING_EFFORT='medium';process.env.OPENAI_CONTENT_REASONING_TOKENS='1';assert.throws(contentModelConfig,/token allowance/);
 process.env.OPENAI_CONTENT_MODEL='unknown';assert.throws(contentModelConfig,/Unsupported content model/);
});
test('context checks use the actual content model even when general model has no configured window',()=>{
 process.env.OPENAI_MODEL='unrelated-model';delete process.env.KNOWLEDGE_GENERATION_CONTEXT_WINDOW;
 const {contextBudget,assertGenerationFits}=load('lib/knowledge/hybrid/engine.ts',{'@/lib/db':{db:{}}});
 assert.ok(contextBudget({instructions:'Create a campaign'})>=1000);
 assert.doesNotThrow(()=>assertGenerationFits('instructions','evidence',16000,'gpt-6.1-sol'));
 process.env.KNOWLEDGE_GENERATION_CONTEXT_WINDOW='10000';assert.throws(()=>assertGenerationFits('instructions','evidence',16000,'gpt-6.1-sol'),/exceeds/);
});
test('summary calls keep the general model and do not send content reasoning settings',async()=>{
 process.env.OPENAI_API_KEY='fixture';process.env.OPENAI_MODEL='gpt-4.1';process.env.OPENAI_CONTENT_MODEL='gpt-6.1-sol';
 let body;global.fetch=async(_url,init)=>{body=JSON.parse(init.body);return Response.json({output:[{type:'message',content:[{type:'output_text',text:'Verified business summary'}]}]});};
 const api=load('lib/openai.ts',{'@/lib/db':{db:{}}});
 await api.updateBusinessSummaryWithDocument({clientName:'Studio',existingSummary:null,documentText:'Business source'});
 assert.equal(body.model,'gpt-4.1');assert.equal(body.reasoning,undefined);
});
test('incomplete reasoning output gives a content-specific error without suggesting document upload',async()=>{
 process.env.OPENAI_API_KEY='fixture';global.fetch=async()=>Response.json({status:'incomplete',output:[]});
 const api=load('lib/openai.ts',{'@/lib/db':{db:{}}});
 await assert.rejects(api.generateContentCalendar({clientName:'Studio',businessSummary:'Facts',startDate:'2026-10-26',endDate:'2026-11-01',postsPerWeek:1,platforms:['INSTAGRAM']}),/Content generation reached its response limit/);
});
test('planning retains medium while routine writing and review default to low',()=>{
 delete process.env.OPENAI_CONTENT_MODEL;process.env.OPENAI_CONTENT_REASONING_EFFORT='medium';delete process.env.OPENAI_CONTENT_WRITING_REASONING_EFFORT;delete process.env.OPENAI_CONTENT_REVIEW_REASONING_EFFORT;
 assert.equal(contentRequestSettings(4096,120000,'planning').reasoningEffort,'medium');
 const writing=contentRequestSettings(4096,120000,'writing');assert.equal(writing.reasoningEffort,'low');assert.equal(writing.maxOutputTokens,8192);
 assert.equal(contentRequestSettings(4096,120000,'review').reasoningEffort,'low');
 process.env.OPENAI_CONTENT_WRITING_REASONING_EFFORT='medium';assert.equal(contentRequestSettings(4096,120000,'writing').reasoningEffort,'medium');
 process.env.OPENAI_CONTENT_REVIEW_REASONING_EFFORT='none';assert.throws(()=>contentRequestSettings(4096,120000,'review'),/stage reasoning/);
});
