const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/load-typescript.cjs');
const { retrievePassages, sourceFingerprint } = load('lib/knowledge/retrieval.ts');
const doc = (id, text) => ({ id, originalName: `${id}.txt`, extractedText: text, websiteUrl: null });
test('retrieval finds prices deep in long files, using vocabulary expansion', () => {
  const text = 'General background for our creative studio. '.repeat(1500) + '\nPortrait pricing: NGN 50,000 including ten edited photographs.\n';
  const result = retrievePassages([doc('services', text)], 'How much does a portrait cost?', 4000);
  assert.match(result, /NGN 50,000/);
  assert.ok(result.length <= 4000);
});
test('fingerprints ignore source order but change after deletion, edit or rename', () => {
  const a = doc('a', 'Price 20'), b = doc('b', 'Policy');
  assert.equal(sourceFingerprint([a,b]), sourceFingerprint([b,a]));
  assert.notEqual(sourceFingerprint([a,b]), sourceFingerprint([a]));
  assert.notEqual(sourceFingerprint([a]), sourceFingerprint([{...a,extractedText:'Price 30'}]));
});
test('conflicting sources are both supplied, without silently resolving the policy', () => {
  const result = retrievePassages([doc('a','Refund policy: no returns.'),doc('b','Refund policy: returns within 30 days.')],'Can I get a refund?');
  assert.match(result,/no returns/); assert.match(result,/30 days/);
});
test('replies never read research or obsolete summaries, and stay scoped to current workspace', async () => {
  let queried;
  const db = { socialCalendar: { findUnique: async () => ({ aiBusinessSummary: 'Obsolete research and deleted facts', aiBusinessSummarySourceHash: null }) }, calendarBusinessDocument: { findMany: async query => { queried=query; return [doc('current','Current portrait price: 50,000')]; } }, businessResearchRun: { findFirst: async () => { throw Error('Research must not be read for replies'); } } };
  const api = load('lib/knowledge/context.ts', {'@/lib/db':{db},'@/lib/openai':{}});
  const result = await api.getBusinessKnowledgeContext('workspace-a','portrait price','reply');
  assert.equal(queried.where.calendarId,'workspace-a'); assert.match(result,/50,000/); assert.match(result,/If sources conflict/);assert.doesNotMatch(result,/Obsolete research/);
});
test('analytics receives only enabled research with matching sources and an expiry', async () => {
  let query;
  const sources=[doc('a','Audience: creatives')];
  const db={socialCalendar:{findUnique:async()=>null},calendarBusinessDocument:{findMany:async()=>sources},businessResearchRun:{findFirst:async q=>{query=q;return {excludedFindingIds:['off'],result:{findings:[{id:'on',title:'Useful experiment'},{id:'off',title:'Unwanted speculation'}]}};}}};
  const api=load('lib/knowledge/context.ts',{'@/lib/db':{db},'@/lib/openai':{}});
  const result=await api.getBusinessKnowledgeContext('a','audience','analytics');
  assert.equal(query.where.sourceHash,sourceFingerprint(sources)); assert.ok(query.where.completedAt.gte instanceof Date);
  assert.match(result,/Useful experiment/);assert.doesNotMatch(result,/Unwanted speculation/);
});
test('summary rebuild does not pass an old rolling summary to the model', async () => {
  let input, saved;
  const db={socialCalendar:{findUniqueOrThrow:async()=>({clientName:'Studio'}),update:async q=>{saved=q.data;}},calendarBusinessDocument:{findMany:async()=>[doc('current','New facts only')]}};
  const api=load('lib/knowledge/context.ts',{'@/lib/db':{db},'@/lib/openai':{updateBusinessSummaryWithDocument:async args=>{input=args;return 'New summary';}}});
  await api.rebuildBusinessKnowledge('a'); assert.equal(input.existingSummary,null);assert.match(input.documentText,/New facts only/);assert.equal(saved.aiBusinessSummary,'New summary');
});
test('concurrent source change prevents a stale summary from being saved', async () => {
  let reads=0;
  const db={socialCalendar:{findUniqueOrThrow:async()=>({clientName:'Studio'}),update:async()=>{throw Error('must not write');}},calendarBusinessDocument:{findMany:async()=>[doc('a',++reads===1?'old':'new')]}};
  const api=load('lib/knowledge/context.ts',{'@/lib/db':{db},'@/lib/openai':{updateBusinessSummaryWithDocument:async()=> 'summary'}});
  await assert.rejects(()=>api.rebuildBusinessKnowledge('a'),/sources changed/);
});
const originalFetch=global.fetch, originalKey=process.env.OPENAI_API_KEY;
afterEach(()=>{global.fetch=originalFetch;if(originalKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalKey;});
test('research preserves actual citations and drops findings with invented URLs', async()=>{
  process.env.OPENAI_API_KEY='test';let calls=0;const phases=[];
  global.fetch=async(_url,init)=>{
    const input=JSON.parse(init.body);calls++;
    if(calls===1){assert.ok(input.tools);assert.doesNotMatch(input.input,/Private policy/);return Response.json({output:[{type:'message',content:[{type:'output_text',text:'Evidence',annotations:[{type:'url_citation',url:'https://example.org/study',title:'Study'}]}]}]});}
    assert.match(input.input,/Private policy/);
    return Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({summary:'Research',unknowns:['Identity uncertain'],findings:[{title:'Supported',learning:'Evidence',application:'Test',sourceUrls:['https://example.org/study']},{title:'Invented',learning:'No evidence',application:'Skip',sourceUrls:['https://fake.test/']} ]})}]}]});
  };
  const api=load('lib/openai.ts');const result=await api.researchBusinessWithSources('Studio','Public audience research',async p=>phases.push(p),'Private policy');
  assert.equal(result.findings.length,1);assert.equal(result.findings[0].title,'Supported');assert.equal(result.sources[0].title,'Study');assert.equal(phases.length,2);
});
test('uncited research fails instead of producing authoritative-looking findings',async()=>{
  process.env.OPENAI_API_KEY='test';global.fetch=async()=>Response.json({output:[{type:'message',content:[{type:'output_text',text:'Unsupported opinion'}]}]});
  await assert.rejects(()=>load('lib/openai.ts').researchBusinessWithSources('Studio','Audience research',async()=>{}),/no verifiable citations/);
});
test('research routes enforce workspace permissions before reading or scheduling',async()=>{
  const api=load('app/api/calendars/[id]/research/route.ts',{'@/lib/auth':{getCurrentCreator:async()=>({id:'outsider'})},'@/lib/calendarPermissions':{hasCalendarPermission:async()=>false},'@/lib/db':{db:{}},'@/lib/knowledge/research':{}});
  for(const method of ['GET','POST','PATCH']){const res=await api[method](new Request('http://localhost/api',{method:method==='GET'?'GET':method}),{params:Promise.resolve({id:'private'})});assert.equal(res.status,403);}
});
test('only a summary rebuilt from exactly the current sources can supplement retrieval',async()=>{
  const sources=[doc('a','Current business evidence')]; let hash=null;
  const db={socialCalendar:{findUnique:async()=>({aiBusinessSummary:'Detailed business overview',aiBusinessSummarySourceHash:hash})},calendarBusinessDocument:{findMany:async()=>sources}};
  const api=load('lib/knowledge/context.ts',{'@/lib/db':{db},'@/lib/openai':{}});
  assert.doesNotMatch(await api.getBusinessKnowledgeContext('a','business'),/Detailed business overview/);
  hash=sourceFingerprint(sources);
  assert.match(await api.getBusinessKnowledgeContext('a','business'),/Detailed business overview/);
  sources[0].extractedText='Changed facts';
  assert.doesNotMatch(await api.getBusinessKnowledgeContext('a','business'),/Detailed business overview/);
});
test('only one research executor can claim a queued run and failure becomes visible',async()=>{
  let claimed=false, status='QUEUED', calls=0;
  const db={businessResearchRun:{
    updateMany:async({where,data})=>{if(where.status==='QUEUED'){if(claimed)return {count:0};claimed=true;}status=data.status||status;return {count:1};},
    findUniqueOrThrow:async()=>({id:'run',calendarId:'a',calendar:{clientName:'Business'},focus:'Audience research'})
  },calendarBusinessDocument:{findMany:async()=>[]}};
  const api=load('lib/knowledge/research.ts',{'@/lib/db':{db},'./context':{getBusinessKnowledgeContext:async()=> 'Business facts'},'@/lib/openai':{researchBusinessWithSources:async()=>{calls++;throw Error('Secret provider detail');}}});
  await Promise.all([api.executeBusinessResearch('run'),api.executeBusinessResearch('run')]);
  assert.equal(calls,1);assert.equal(status,'FAILED');
});
test('research admission locks the workspace, reuses active runs and enforces cooldown',async()=>{
  let recent={id:'running',status:'RUNNING',createdAt:new Date()}, locks=0;
  const tx={$queryRaw:async()=>{locks++;},businessResearchRun:{updateMany:async()=>({count:0}),findFirst:async()=>recent}};
  const api=load('lib/knowledge/research.ts',{'@/lib/db':{db:{$transaction:async fn=>fn(tx)}},'./context':{},'@/lib/openai':{}});
  assert.equal((await api.queueBusinessResearch('a','Focus')).id,'running');assert.equal(locks,1);
  recent={...recent,status:'SUCCEEDED'};
  await assert.rejects(()=>api.queueBusinessResearch('a','Focus'),/10 minutes/);
});
