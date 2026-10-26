const {test}=require('node:test');const assert=require('node:assert/strict');const {NextRequest}=require('next/server');const {load}=require('./helpers/load-typescript.cjs');
const brief={version:2,format:'Carousel',title:'A distinctive idea',hook:'A particular opening',objective:'Help studio leads clarify client handoffs',targetAudience:'Studio leads delivering collaborative projects',caption:'Complete audience-facing copy',creativeDirection:'Explore an illustrative client handoff',suggestedCta:'Discuss your approach',hashtags:'',coreIdea:'An unexplained delivery',keyMessage:'Make context clear',desiredResponse:'Reflection',brandConnection:'Supported service',pillar:'Delivery',reviewWarnings:['Automated review needs human attention.']};
function fixture(value=brief){
 let inserted,snapshots,refunded=0;
 const db={
 socialCalendar:{findUnique:async()=>({id:'calendar',managerId:'owner',clientName:'Studio'})},
 calendarBusinessDocument:{count:async()=>1},creator:{findUnique:async()=>({id:'owner'})},
 calendarPost:{findFirst:async()=>null},calendarPostAiGeneration:{findFirst:async()=>null},
 contentWorkspaceUsage:{updateMany:async()=>{refunded++;}},
 $transaction:async fn=>fn({calendarPost:{createManyAndReturn:async({data})=>{inserted=data;return data.map((p,i)=>({...p,id:'p'+i}));}},calendarPostAiGeneration:{createMany:async({data})=>{snapshots=data;}}}),
 };
 const {generateCalendarDrafts}=load('lib/calendarAiGeneration.ts',{
 '@/lib/db':{db},'@/lib/calendarPermissions':{hasCalendarPermission:async()=>true},
 '@/lib/contentWorkspaceUsage':{consumeAiGeneration:async()=>({allowed:true}),getContentWorkspacePlan:()=> 'STUDIO'},
 '@/lib/knowledge/context':{getBusinessKnowledgeContext:async()=> 'Business evidence'},
 '@/lib/content/creativeGeneration':{recentContentMemory:async()=>[]},
 '@/lib/openai':{generateContentCalendar:async()=>[{postDate:'2026-10-26',platform:'INSTAGRAM',postType:'Carousel',category:'Delivery',hook:value.hook,script:'',caption:value.caption,contentIdea:value.creativeDirection,cta:value.suggestedCta,hashtags:'',creativeBrief:value}]},
 });
 return {run:()=>generateCalendarDrafts(new NextRequest('http://localhost/api',{method:'POST',body:JSON.stringify({startDate:'2026-10-26',endDate:'2026-10-26',postsPerWeek:3,platforms:['INSTAGRAM']})}),{params:Promise.resolve({id:'calendar'})},{id:'owner'}),inserted:()=>inserted,snapshots:()=>snapshots,refunds:()=>refunded};
}
test('valid drafts needing editorial review are saved with their required fields and warning snapshots',async()=>{
 const f=fixture();const response=await f.run();assert.equal(response.status,200);
 assert.equal((await response.json()).created,1);
 assert.equal(f.inserted()[0].creativeBrief.objective,brief.objective);
 assert.deepEqual(f.inserted()[0].creativeBrief.reviewWarnings,brief.reviewWarnings);
 assert.deepEqual(f.snapshots()[0].creativeBrief.reviewWarnings,brief.reviewWarnings);
 assert.equal(f.refunds(),0);
});
test('required fields still block incomplete saves and return a useful code with allowance refund',async()=>{
 const f=fixture({...brief,objective:''});const response=await f.run();assert.equal(response.status,422);assert.equal((await response.json()).code,'AI_CONTENT_INVALID');assert.equal(f.inserted(),undefined);assert.equal(f.refunds(),1);
});
