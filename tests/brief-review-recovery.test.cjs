const {test}=require('node:test');const assert=require('node:assert/strict');const {load}=require('./helpers/load-typescript.cjs');
const {applyBriefReview}=load('lib/content/briefReview.ts');
const brief={version:2,format:'Carousel',title:'A particular handoff',hook:'A specific opening',objective:'Help studio leads clarify handoff responsibility',targetAudience:'Studio leads delivering collaborative projects',caption:'Existing copy',creativeDirection:'Explore the situation without prescribed shots',suggestedCta:'Discuss it',hashtags:'',coreIdea:'A client receiving unexplained files',keyMessage:'Clarity matters',desiredResponse:'Reflection',brandConnection:'Relevant supported offering',pillar:'Delivery'};
const posts=[{contentUnit:1,platform:'INSTAGRAM',brief}];const streams=[{platforms:['INSTAGRAM']}];
for(const result of [null,{acceptable:false,revisions:[]},{acceptable:true,revisions:[{id:'90',reason:'x',brief}]},{acceptable:true,revisions:[{id:'0',reason:'x',brief:{...brief,objective:''}}]}]){
 test('invalid or negative review preserves original complete content and flags human review '+JSON.stringify(result)?.slice(0,65),()=>{
  const recovered=applyBriefReview(posts,result,streams);
  assert.equal(recovered[0].brief.caption,brief.caption);assert.equal(recovered[0].brief.objective,brief.objective);
  assert.ok(recovered[0].brief.reviewWarnings.length);assert.equal(posts[0].brief.reviewWarnings,undefined);
 });
}
test('valid review replacements apply atomically without inventing extra posts',()=>{
 const revised={...brief,coreIdea:'A distinct useful concept'};const result=applyBriefReview(posts,{acceptable:true,revisions:[{id:'0',reason:'More distinctive',brief:revised}]},streams);
 assert.equal(result.length,1);assert.equal(result[0].brief.coreIdea,revised.coreIdea);assert.equal(result[0].brief.reviewWarnings,undefined);
});
test('recovered draft warnings are visible internally and stay out of audience-facing copy',()=>{
 const {parseCreativeBrief,briefContentProjection}=load('lib/content/brief.ts');
 const recovered=applyBriefReview(posts,{acceptable:false,revisions:[]},streams)[0].brief;
 assert.deepEqual(parseCreativeBrief(recovered).reviewWarnings,recovered.reviewWarnings);
 const projection=briefContentProjection(recovered);assert.equal(projection.caption,brief.caption);assert.doesNotMatch(projection.caption,/Automated review/);
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');const Editor=load('components/calendars/CreativeBriefEditor.tsx').default;
 const html=renderToStaticMarkup(React.createElement(Editor,{calendarId:'c',post:{id:'p',platform:'INSTAGRAM',creativeBrief:recovered},readOnly:true,onUpdated:()=>{}}));
 assert.match(html,/Needs editorial review/);assert.match(html,/Automated review could not approve/);
});
test('sparse review changes only selected fields and preserves objective audience and other copy',()=>{
 const result=applyBriefReview(posts,{acceptable:true,revisions:[{id:'0',reason:'Stronger opening',changes:[{field:'hook',value:'A more specific opening'}]}]},streams);
 assert.equal(result[0].brief.hook,'A more specific opening');assert.equal(result[0].brief.objective,brief.objective);assert.equal(result[0].brief.targetAudience,brief.targetAudience);assert.equal(result[0].brief.caption,brief.caption);assert.equal(result[0].brief.reviewWarnings,undefined);
});
test('sparse review cannot change slot metadata or inject unknown fields',()=>{
 const result=applyBriefReview(posts,{acceptable:true,revisions:[{id:'0',reason:'x',changes:[{field:'platform',value:'X'}]}]},streams);
 assert.equal(result[0].platform,'INSTAGRAM');assert.ok(result[0].brief.reviewWarnings.length);
});
