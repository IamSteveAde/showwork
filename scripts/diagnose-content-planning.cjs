/* One synthetic, output-capped API request. No database or business documents are read. */
require('@next/env').loadEnvConfig(process.cwd(),true,{info(){},error(){}});
const {load}=require('../tests/helpers/load-typescript.cjs');
const {generateBriefCalendar}=load('lib/content/briefGeneration.ts',{'@/lib/db':{db:{}}});
const {contentRequestSettings}=load('lib/content/model.ts');
const {AiProviderError}=load('lib/content/providerError.ts');
(async()=>{
 let planning;
 const stop=Error('CAPTURE_ONLY');
 try{await generateBriefCalendar(async request=>{planning=request;throw stop;},{clientName:'Synthetic test studio',businessSummary:'Synthetic test studio provides portrait photography for independent artists.',startDate:'2026-10-26',endDate:'2026-10-26',postsPerWeek:3,platforms:['INSTAGRAM']});}catch(error){if(error!==stop)throw error;}
 const settings=contentRequestSettings(512,30000,'planning');
 const body={model:settings.model,instructions:planning.instructions,input:planning.input,max_output_tokens:512,text:{format:{type:'json_schema',name:planning.jsonSchema.name,strict:true,schema:planning.jsonSchema.schema}}};
 if(settings.reasoningEffort)body.reasoning={effort:settings.reasoningEffort};
 const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
 const result=await response.json();
 if(!response.ok){const error=new AiProviderError(response.status,result.error,response.headers.get('x-request-id'));console.log(JSON.stringify(error.diagnostic()));if(error.code==='invalid_json_schema')console.log(JSON.stringify({schemaReason:String(result.error?.message||'').slice(0,1500)}));process.exitCode=1;return;}
 console.log(JSON.stringify({status:response.status,resultStatus:result.status,model:settings.model,requestId:response.headers.get('x-request-id'),note:'Synthetic diagnostic only; no real batch generated.'}));
})().catch(error=>{console.error(JSON.stringify({errorType:error.name}));process.exitCode=1;});
