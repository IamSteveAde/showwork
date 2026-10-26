const {test}=require('node:test');const assert=require('node:assert/strict');
const {load}=require('./helpers/load-typescript.cjs');
const {validateCampaignConcepts}=load('lib/content/conceptSelection.ts');
const evidence='The business helps photographers organise client handoffs and present their portfolio.';
const concept=(premise)=>({situation:'A photographer completing a project',premise,treatment:'contradiction',evidenceAnchor:'organise client handoffs'});
test('accepts exactly one complete grounded concept per slot without alternatives or scores',()=>{
 assert.doesNotThrow(()=>validateCampaignConcepts([{concept:concept('Winning the brief but losing trust at handoff')}],evidence));
});
test('rejects unsupported anchors and repeated concepts before writing',()=>{
 assert.throws(()=>validateCampaignConcepts([{concept:{...concept('A claim'),evidenceAnchor:'Guaranteed same day payment'}}],evidence),/source-grounded/);
 assert.throws(()=>validateCampaignConcepts([{concept:concept('Same premise')},{concept:concept('Same premise')}],evidence),/repeats/);
});
test('rejects missing concepts and unsupported treatments',()=>{
 assert.throws(()=>validateCampaignConcepts([{}],evidence));
 assert.throws(()=>validateCampaignConcepts([{concept:{...concept('A premise'),treatment:'unknown'}}],evidence));
});
