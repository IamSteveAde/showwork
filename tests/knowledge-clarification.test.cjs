const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const {NextRequest,NextResponse}=require('next/server');
const {load}=require('./helpers/load-typescript.cjs');
const env={...process.env};afterEach(()=>{for(const key of Object.keys(process.env))if(!(key in env))delete process.env[key];Object.assign(process.env,env);});
const base={'@/lib/db':{db:{}}};
const {checkKnowledge,parseKnowledgeAnswers,generationFactInstructions}=load('lib/knowledge/clarification.ts',base);
const gap={question:'What price and currency should I use?',reason:'The requested promotion includes prices.',searchQuery:'wedding package price currency',essential:true,kind:'missing'};
const source={id:'price',originalName:'Prices',extractedText:'# Wedding package\nPrice: GBP 450.'};
test('a first retrieval miss triggers one targeted search, finding the actual price',async()=>{
 let calls=0;
 const result=await checkKnowledge('workspace','Promote the wedding package with price',[],{sources:[source],initial:async()=>[],assess:async(_q,_a,passages)=>{calls++;return passages.some(p=>p.text.includes('GBP 450'))?[]:[gap];}});
 assert.equal(calls,2);assert.deepEqual(result.gaps,[]);assert.match(result.evidence,/GBP 450/);
});
test('optional omissions do not block awareness content or trigger a second search',async()=>{
 let calls=0;const result=await checkKnowledge('workspace','Create awareness posts',[],{sources:[source],assess:async()=>{calls++;return [{...gap,essential:false}];}});
 assert.equal(calls,1);assert.equal(result.gaps[0].essential,false);
});
test('unresolved essential facts remain questions after the bounded second pass',async()=>{
 let calls=0;const result=await checkKnowledge('workspace','Include prices',[],{sources:[],assess:async()=>{calls++;return [gap];}});
 assert.equal(calls,2);assert.equal(result.gaps.length,1);
});
test('processing and unreadable sources are distinct from missing facts',async()=>{
 const result=await checkKnowledge('workspace','Awareness',[],{sources:[{...source,extractedText:null}],assess:async()=>[]});assert.equal(result.incomplete,true);
});
test('answers are bounded and omissions explicitly override the original request',()=>{
 assert.throws(()=>parseKnowledgeAnswers([{question:'Price?',answer:''}]));
 assert.throws(()=>parseKnowledgeAnswers(Array(6).fill({question:'Price?',answer:'GBP 450'})));
 const text=generationFactInstructions('Include prices',[{question:'Price?',answer:'GBP 450'}],[gap],true);
 assert.match(text,/omit ALL unresolved details/);assert.match(text,/GBP 450/);assert.match(text,/Do not use market research/);
});
function preflight(check,permissions=true){
 return load('lib/knowledge/generationPreflight.ts',{
  '@/lib/auth':{getCurrentCreator:async()=>({id:'member'})},
  '@/lib/calendarPermissions':{hasCalendarPermission:async()=>permissions},
  './clarification':{clarificationEnabled:()=>true,parseKnowledgeAnswers,generationFactInstructions,checkKnowledge:check},
 }).generationPreflight;
}
const request=body=>new NextRequest('https://example.test/api/calendars/a/ai-generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
test('permission is checked before reading workspace knowledge',async()=>{
 const response=await preflight(()=>assert.fail('private read'),false)(request({}),'a');assert.equal(response.status,403);
});
test('essential gaps return structured 422 before any generation work',async()=>{
 const response=await preflight(async()=>({gaps:[gap],incomplete:false,evidence:''}))(request({customInstructions:'With prices'}),'a');
 assert.equal(response.status,422);assert.equal((await response.json()).code,'KNOWLEDGE_CLARIFICATION_REQUIRED');
});
test('explicit omission continues with server-authored restrictions and checked evidence',async()=>{
 const response=await preflight(async()=>({gaps:[gap],incomplete:false,evidence:'checked source'}))(request({customInstructions:'With prices',omitUnsupportedDetails:true,knowledgeAnswers:[{question:'Offer?',answer:'Wedding'}]}),'a');
 assert.ok(response instanceof NextRequest);const body=await response.json();assert.match(body.customInstructions,/omit ALL unresolved details/);assert.match(body.customInstructions,/checked source/);assert.equal(body.knowledgeAnswers,undefined);
});
test('an outage returns retryable 503, never a fabricated missing-fact question',async()=>{
 const response=await preflight(async()=>{throw Error('sensitive provider error');})(request({}),'a');assert.equal(response.status,503);assert.doesNotMatch(JSON.stringify(await response.json()),/sensitive/);
});
test('incomplete extraction requires explicit choice even without factual gaps',async()=>{
 const run=preflight(async()=>({gaps:[],incomplete:true,evidence:''}));
 assert.equal((await run(request({}),'a')).status,422);
 assert.ok(await run(request({useAvailableKnowledge:true}),'a') instanceof NextRequest);
});
test('saving answers requires knowledge permission and appends attributed idempotent evidence',async()=>{
 let allowed=false;let saved;const api=load('app/api/calendars/[id]/business-documents/clarification/route.ts',{
  '@/lib/auth':{getCurrentCreator:async()=>({id:'member'})},
  '@/lib/calendarPermissions':{hasCalendarPermission:async()=>allowed},
  '@/lib/db':{db:{calendarBusinessDocument:{upsert:async args=>{saved=args;}}}},
 });
 const body={answers:[{question:'Price?',answer:'GBP 450'}]},context={params:Promise.resolve({id:'workspace'})};
 assert.equal((await api.POST(request(body),context)).status,403);assert.equal(saved,undefined);
 allowed=true;assert.equal((await api.POST(request(body),context)).status,200);const id=saved.where.id;
 assert.equal(saved.create.calendarId,'workspace');assert.deepEqual(saved.update,{});assert.match(saved.create.extractedText,/member/);assert.match(saved.create.extractedText,/Recorded at/);
 await api.POST(request(body),context);assert.equal(saved.where.id,id);
});
test('malformed assessor responses fail closed without returning model prose',async()=>{
 const {assessEvidence}=load('lib/knowledge/clarification.ts',{'@/lib/db':{db:{}},'./hybrid/provider':{knowledgeProviderRequest:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify({gaps:[{...gap,essential:'yes'}]})}]}]})}});
 await assert.rejects(assessEvidence('prices',[],[]),/INVALID_KNOWLEDGE_CHECK/);
});
test('generation route never queues a request needing clarification',async()=>{
 const api=load('app/api/calendars/[id]/ai-generate/route.ts',{
  '@/lib/knowledge/generationPreflight':{generationPreflight:async()=>NextResponse.json({code:'KNOWLEDGE_CLARIFICATION_REQUIRED'},{status:422})},
  '@/lib/auth':{getCurrentCreator:()=>assert.fail('generation authentication should not run')},
  '@/lib/calendarAiGeneration':{generateCalendarDrafts:()=>assert.fail('draft creation')},
  '@/lib/aiGenerationJobs':{enqueueAiGeneration:()=>assert.fail('queue creation')},
  '@/lib/publishing/applicationBoundary':{publishingIntegrationInstalled:()=>assert.fail('canonical dispatch')},
 });
 assert.equal((await api.POST(request({}),{params:Promise.resolve({id:'a'})})).status,422);
});
test('queued source changes stop before consuming the generation allowance',async()=>{
 const api=load('lib/calendarAiGeneration.ts',{
  '@/lib/db':{db:{socialCalendar:{findUnique:async()=>({id:'a',managerId:'owner'})},calendarBusinessDocument:{count:async()=>1,findMany:async()=>[source]},creator:{findUnique:async()=>({id:'owner'})}}},
  '@/lib/calendarPermissions':{hasCalendarPermission:async()=>true,calendarFeatureGate:async()=>null},
  '@/lib/complimentaryAccess':{complimentaryAccessSelect:{}},
  '@/lib/contentWorkspaceUsage':{getContentWorkspacePlan:()=>assert.fail('plan/charge must not run'),consumeAiGeneration:()=>assert.fail('charge')},
  '@/lib/openai':{generateContentCalendar:()=>assert.fail('generation')},
  '@/lib/knowledge/context':{getBusinessKnowledgeContext:()=>assert.fail('generation context')},
 });
 const res=await api.generateCalendarDrafts(request({startDate:'2026-10-25',endDate:'2026-10-26',platforms:['INSTAGRAM'],knowledgeSourceHash:'obsolete'}),{params:Promise.resolve({id:'a'})},{id:'member'});
 assert.equal(res.status,409);assert.equal((await res.json()).code,'KNOWLEDGE_CHANGED');
});
