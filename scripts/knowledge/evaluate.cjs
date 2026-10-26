/* Synthetic fixtures only. --live calls OpenAI; never loads workspace records or database URLs. */
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {load}=require('../../tests/helpers/load-typescript.cjs');
const {sources,cases,evidence}=require('../../tests/fixtures/knowledge/businesses.cjs');
const live=process.argv.includes('--live');
if(live)require('dotenv').config({quiet:true});
const mocks={'@/lib/db':{db:{}}};
const {retrievePassages,sourceFingerprint}=load('lib/knowledge/retrieval.ts',mocks);
const {chunkSource,embeddingText}=load('lib/knowledge/hybrid/chunks.ts',mocks);
const {retrieveHybrid}=load('lib/knowledge/hybrid/engine.ts',mocks);
const {buildQueries}=load('lib/knowledge/hybrid/query.ts',mocks);
const {hybridRank,diversify}=load('lib/knowledge/hybrid/ranking.ts',mocks);
const {rankingConfig}=load('lib/knowledge/hybrid/config.ts',mocks);
const {embeddingConfig}=load('lib/knowledge/hybrid/config.ts',mocks);
const {embed,rerank}=load('lib/knowledge/hybrid/provider.ts',mocks);
const chunks=sources.flatMap(chunkSource), K=3;
const usage={indexInput:0,queryInput:0,rerankInput:0,rerankOutput:0,embeddingRequests:0,rerankRequests:0};
function measure(passages,labels){
 const top=passages.slice(0,K);
 const hits=top.filter(p=>labels.some(([source,needle])=>p.sourceId===source && p.text.includes(needle))).length;
 const found=labels.filter(([source,needle])=>top.some(p=>p.sourceId===source&&p.text.includes(needle))).length;
 const rank=top.findIndex(p=>labels.some(([source,needle])=>p.sourceId===source&&p.text.includes(needle)));
 const dcg=top.reduce((n,p,i)=>n+(labels.some(([source,needle])=>p.sourceId===source&&p.text.includes(needle))?1/Math.log2(i+2):0),0);
 const ideal=Array.from({length:Math.min(K,labels.length)},(_,i)=>1/Math.log2(i+2)).reduce((a,b)=>a+b,0);
 return {recall:labels.length?found/labels.length:null,precision:labels.length?hits/K:null,mrr:labels.length?(rank<0?0:1/(rank+1)):null,ndcg:ideal?Math.min(1,dcg/ideal):null,ids:top.map(p=>p.sourceId),abstained:!passages.length};
}
function average(rows,key){const values=rows.map(r=>r[key]).filter(n=>typeof n==='number');return values.reduce((a,b)=>a+b,0)/(values.length||1);}
const cachePath=process.env.KNOWLEDGE_EVAL_CACHE||'/tmp/showwork-synthetic-knowledge-embeddings.json';
let cache={};if(live&&fs.existsSync(cachePath))cache=JSON.parse(fs.readFileSync(cachePath,'utf8'));
async function main(){
 let vectors=new Map(),config;
 if(live){
  config=embeddingConfig();
  if(!process.env.KNOWLEDGE_RERANK_MODEL)throw Error('Set KNOWLEDGE_RERANK_MODEL for live evaluation');
 }
 const cachedEmbed=async(texts,kind='query')=>{
  const keys=texts.map(t=>createHash('sha256').update(config.key+t).digest('hex'));
  const missing=keys.map((k,i)=>cache[k] && (kind==='index'||process.argv.includes('--sweep')) ? null : i).filter(i=>i!==null);
  let input=0,requests=0;
  for(let start=0;start<missing.length;start+=32){
   const batch=missing.slice(start,start+32);const result=await embed(batch.map(i=>texts[i]));
   batch.forEach((i,j)=>cache[keys[i]]=result.vectors[j]);input+=result.usage.inputTokens;requests+=result.usage.requests;
  }
  if(kind==='index')usage.indexInput+=input;else usage.queryInput+=input;
  usage.embeddingRequests+=requests;fs.writeFileSync(cachePath,JSON.stringify(cache));
  return {vectors:keys.map(k=>cache[k]),usage:{inputTokens:input,outputTokens:0,requests}};
 };
 if(live){const result=await cachedEmbed(chunks.map(embeddingText),'index');vectors=new Map(chunks.map((p,i)=>[p.id,result.vectors[i]]));}
 if(live && process.argv.includes('--sweep')) {
  const results=[];
  for(const rrfK of [10,60,100])for(const semanticWeight of [0.5,1,1.5]) {
   const rows=[];
   for(const item of cases) {
    const plan=buildQueries(item.request), query=await cachedEmbed(plan.queries);
    const ranked=diversify(hybridRank(chunks,plan,vectors,query.vectors,{...rankingConfig(),rrfK,semanticWeight}));
    rows.push(measure(ranked.map(p=>p.passage),evidence[item.id]));
   }
   results.push({rrfK,semanticWeight,...Object.fromEntries(['recall','precision','mrr','ndcg'].map(key=>[key,average(rows,key)]))});
  }
  const output=process.argv.find(a=>a.startsWith('--output='))?.slice(9);
  if(output)fs.writeFileSync(output,JSON.stringify({note:'Development fixture parameter sensitivity, not held-out generalisation.',results},null,2)+'\n');else console.log(JSON.stringify(results,null,2));
  return;
 }
 const sql={query:async(query,args)=>{
  if(args[0]!=='fixture-workspace')throw Error('WORKSPACE_LEAK');
  if(!live)throw Error('Offline evaluation: semantic unavailable');
  if(query.includes('FROM "KnowledgePassage"'))return {rows:chunks.map(p=>({...p,sourceHash:sourceFingerprint([sources.find(s=>s.id===p.sourceId)]),embedding:vectors.get(p.id)}))};
  return {rows:sources.map(s=>({sourceId:s.id,status:'READY',indexKey:config.key,sourceHash:sourceFingerprint([s])}))};
 }};
 const ranker=async(query,passages)=>{usage.rerankRequests++;const result=await rerank(query,passages);usage.rerankInput+=result.usage.inputTokens;usage.rerankOutput+=result.usage.outputTokens;usage.rerankRequests+=result.usage.requests-1;return result;};
 const rows=[];
 for(const item of cases){
  const start=performance.now();const old=retrievePassages(sources,item.request.instructions||'',16000);
  const oldPassages=[...old.matchAll(/\[Source: ([^;]+);[^\n]*\n([\s\S]*?)(?=\n\n\[Source:|$)/g)].map(m=>({sourceId:sources.find(s=>s.originalName===m[1])?.id,text:m[2]}));
  const legacy={...measure(oldPassages,evidence[item.id]),latencyMs:performance.now()-start};
  process.env.KNOWLEDGE_RERANK_ENABLED='false';
  const before=await retrieveHybrid('fixture-workspace',sources,item.request,3500,{sql,embedder:cachedEmbed});
  process.env.KNOWLEDGE_RERANK_ENABLED=live?'true':'false';
  const after=live?await retrieveHybrid('fixture-workspace',sources,item.request,3500,{sql,embedder:cachedEmbed,reranker:ranker}):before;
  rows.push({case:item.id,relevant:item.relevant,legacy,hybrid:{...measure(before.passages,evidence[item.id]),latencyMs:before.report.elapsedMs,mode:before.report.mode},reranked:{...measure(after.passages,evidence[item.id]),latencyMs:after.report.elapsedMs,status:after.report.reranking},contextRelevance:after.passages.length?after.passages.filter(p=>evidence[item.id].some(([source,needle])=>p.sourceId===source&&p.text.includes(needle))).length/after.passages.length:(item.relevant.length?0:1),leakage:after.passages.some(p=>!sources.some(s=>s.id===p.sourceId)),fallbacks:after.report.reasons});
  console.error('Evaluated synthetic case:',item.id);
 }
 const totals={};for(const name of ['legacy','hybrid','reranked'])totals[name]=Object.fromEntries(['recall','precision','mrr','ndcg','latencyMs'].map(key=>[key,average(rows.map(r=>r[name]),key)]));
 const result={fixture:'Synthetic development collection v1; labelled evidence spans; K=3; precision uses fixed K denominator; unanswerable queries excluded from aggregate ranking metrics. Not a production accuracy claim.',live,createdAt:new Date().toISOString(),models:live?{embedding:config.model,dimensions:config.dimensions,version:config.version,rerank:process.env.KNOWLEDGE_RERANK_MODEL}:null,parameters:{rrfK:process.env.KNOWLEDGE_RRF_K||60,contextWeight:process.env.KNOWLEDGE_CONTEXT_QUERY_WEIGHT||0.15,semanticWeight:process.env.KNOWLEDGE_SEMANTIC_WEIGHT||1},totals,contextRelevance:average(rows,'contextRelevance'),crossWorkspaceLeakage:rows.filter(r=>r.leakage).length,usage,costNote:'Actual API token usage reported. Dollar cost requires current account rates; cached embeddings have zero new input tokens. Failed attempts may incur additional usage.',rows};
 const output=process.argv.find(a=>a.startsWith('--output='))?.slice(9);
 if(output)fs.writeFileSync(path.resolve(output),JSON.stringify(result,null,2)+'\n');else console.log(JSON.stringify(result,null,2));
}
main().catch(()=>{console.error('EVALUATION_FAILED: check configuration/connectivity; provider bodies and credentials suppressed');process.exitCode=1;});
