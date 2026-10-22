/* Read-only TikTok analytics diagnostic. Never print credentials or raw provider errors. */
require('@next/env').loadEnvConfig(process.cwd(),true,{info(){},error(){}});
const {PrismaClient}=require('@prisma/client');
const {load}=require('../tests/helpers/load-typescript.cjs');
const calendarId=process.argv[2];
if(!calendarId){console.error('Usage: node scripts/audit-tiktok-analytics.cjs WORKSPACE_ID');process.exit(1);}
let datasource;
if(process.env.SHOWWORK_CANONICAL_APPLICATION_ENABLED==='true') {
 try {const url=new URL(process.env.PUBLISHING_DATABASE_URL);url.searchParams.set('schema',process.env.PUBLISHING_DATABASE_SCHEMA||'public');datasource=url.toString();}
 catch {console.error('Canonical database configuration is invalid.');process.exit(1);}
}
const db=new PrismaClient({log:[],...(datasource?{datasources:{db:{url:datasource}}}:{})});
(async()=>{
 const c=await db.socialConnection.findFirst({where:{calendarId,platform:'TIKTOK',status:'CONNECTED'},select:{id:true,accountName:true,tokenScopes:true,accessToken:true,accessTokenExpiresAt:true}});
 if(!c){console.log(JSON.stringify({ready:false,reason:'No connected TikTok account in this workspace'}));process.exitCode=2;return;}
 const grantedScopes=(c.tokenScopes||'').split(/[\s,]+/).filter(Boolean);
 const missingScopes=['user.info.basic','user.info.stats','video.list','video.publish'].filter(s=>!grantedScopes.includes(s));
 console.log(JSON.stringify({account:c.accountName,grantedScopes,missingScopes}));
 if(missingScopes.length||!c.accessToken||c.accessTokenExpiresAt&&c.accessTokenExpiresAt<=new Date()) {
  console.log(JSON.stringify({ready:false,reason:'Reconnect through the updated OAuth flow before live verification'}));process.exitCode=2;return;
 }
 const api=load('lib/reporting/adapters/tiktok.ts',{'@/lib/db':{},'@/lib/tiktokConnection':{}}).tiktokReportingAdapter;
 const account=await api.fetchAccountMetrics(c);
 const videos=account.accountPosts||[];
 const queried=await api.fetchPostMetrics(c,videos.slice(0,3).map((p,i)=>({id:String(i),platformPostId:p.platformPostId})));
 console.log(JSON.stringify({ready:true,followers:account.followers,accountStatistics:account.additionalMetrics,publicVideos:videos.length,queriedVideos:queried.size,sampleCounters:videos.slice(0,3).map(p=>({views:p.views,likes:p.likes,comments:p.comments,shares:p.shares})),warnings:account.reportingWarnings}));
})().catch(error=>{console.error(JSON.stringify({ready:false,reason:error.message?.startsWith('TikTok')?error.message:'Database or network diagnostic failed'}));process.exitCode=1;}).finally(()=>db.$disconnect());
