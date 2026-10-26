const {test}=require('node:test');const assert=require('node:assert/strict');const {load}=require('./helpers/load-typescript.cjs');
const {fullDocumentEvidence}=load('lib/knowledge/fullDocuments.ts');
const source=(id,text)=>({id,originalName:id+'.pdf',extractedText:text});
test('includes all text from every source, including irrelevant and late passages',()=>{
 const a='Beginning\n'+'An apparently unrelated section. '.repeat(5000)+'\nVERY_LAST_FACT';
 const b='Second document\nDistinct customer segment and brand constraint.';
 const result=fullDocumentEvidence([source('a',a),source('b',b)]);
 assert.ok(result.includes(a));assert.ok(result.includes(b));
});
test('missing extraction fails clearly instead of pretending all documents were read',()=>{
 assert.throws(()=>fullDocumentEvidence([source('a','Readable'),source('scan',null)]),/OCR/);
});
test('context overflow fails without silently truncating documents',()=>{
 const old=process.env.KNOWLEDGE_GENERATION_CONTEXT_WINDOW;process.env.KNOWLEDGE_GENERATION_CONTEXT_WINDOW='64001';
 try{assert.throws(()=>fullDocumentEvidence([source('a','Long text. '.repeat(1000))]),/No document text was silently omitted/);}finally{if(old===undefined)delete process.env.KNOWLEDGE_GENERATION_CONTEXT_WINDOW;else process.env.KNOWLEDGE_GENERATION_CONTEXT_WINDOW=old;}
});
test('content context bypasses passage ranking and retains the full source snapshot',async()=>{
 const text='Earlier section. '.repeat(3000)+'LAST_SECTION';const sources=[source('a',text)];
 const db={calendarBusinessDocument:{findMany:async()=>sources},socialCalendar:{findUnique:async()=>null},businessResearchRun:{findFirst:async()=>null}};
 const {getBusinessKnowledgeContext}=load('lib/knowledge/context.ts',{'@/lib/db':{db},'@/lib/openai':{},'./retrieval':{sourceFingerprint:()=> 'same',retrievePassages:()=>assert.fail('must not retrieve selected passages for content')}});
 const result=await getBusinessKnowledgeContext('workspace','I need content','content');assert.ok(result.includes(text));
});
