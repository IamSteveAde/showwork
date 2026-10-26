const {test}=require('node:test');const assert=require('node:assert/strict');const {load}=require('./helpers/load-typescript.cjs');
const media={id:'photo',type:'PHOTO',fileKey:'portfolio/existing.jpg',caption:'Original caption',aspectRatio:1.5};
function publicPage(record){let lookup;const viewUpdates=[];const page=load('app/portfolio/[slug]/page.tsx',{
 '@/lib/db':{db:{portfolio:{findUnique:async args=>{lookup=args;return record;},update:async args=>viewUpdates.push(args)}}},
 '@/lib/r2':{publicUrlFor:key=>'https://media.example.test/'+key},
 '@/components/portfolio/PortfolioContent':{__esModule:true,default:()=>null},
 'next/navigation':{notFound:()=>{throw Error('NOT_FOUND');}},
 });return {page,lookup:()=>lookup,viewUpdates};}
for(const slug of ['nkechi-chukwulo','the-creative-rexxie'])test('existing and recent slug use identical database-backed page and retained asset keys: '+slug,async()=>{
 const record={id:'portfolio',slug,companyName:'Public studio',media:[media],sections:[{id:'s1',name:'Project one',mediaType:'PHOTO',media:[media],coverMediaId:'photo'},{id:'s2',name:'Project two',mediaType:'PHOTO',media:[media],coverMediaId:'photo'}],testimonials:[],heroMediaId:'photo'};
 const before=JSON.stringify(record);const f=publicPage(record);const element=await f.page.default({params:Promise.resolve({slug})});
 assert.deepEqual(f.lookup().where,{slug});assert.equal(element.props.sections.length,2);assert.equal(element.props.sections[0].media[0].url,'https://media.example.test/portfolio/existing.jpg');
 assert.equal(JSON.stringify(record),before);assert.deepEqual(f.viewUpdates,[{where:{id:'portfolio'},data:{viewCount:{increment:1}}}]);
});
test('missing portfolio follows the existing not-found policy',async()=>{
 const f=publicPage(null);await assert.rejects(f.page.default({params:Promise.resolve({slug:'missing'})}),/NOT_FOUND/);assert.equal(f.viewUpdates.length,0);
});
test('creation stores one slug-backed record and editing preserves the public slug and media',async()=>{
 let record=null;const writes=[];
 const api=load('app/api/portfolio/route.ts',{
 '@/lib/auth':{getCurrentCreator:async()=>({id:'owner'})},
 '@/lib/db':{db:{portfolio:{findFirst:async()=>record,findUnique:async()=>null,create:async({data})=>{writes.push(data);record={id:'p',...data,media:[media]};return record;},update:async({data})=>{writes.push(data);record={...record,...data};return record;}}}},
 });
 const response=await api.POST(new Request('http://localhost/api/portfolio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({companyName:'My Creative Studio'})}));
 assert.equal(response.status,200);assert.equal(record.slug,'my-creative-studio');
 await api.PATCH(new Request('http://localhost/api/portfolio',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({companyName:'Updated studio',heroTagline:'New introduction',slug:'replace-url'})}));
 assert.equal(record.slug,'my-creative-studio');assert.equal(record.media[0].fileKey,media.fileKey);assert.equal(record.heroTagline,'New introduction');assert.equal(writes[1].slug,undefined);
});
test('portfolio mutations remain protected by authentication',async()=>{
 const api=load('app/api/portfolio/route.ts',{'@/lib/auth':{getCurrentCreator:async()=>null},'@/lib/db':{db:{}}});
 assert.equal((await api.POST(new Request('http://localhost/api/portfolio',{method:'POST'}))).status,401);
 assert.equal((await api.PATCH(new Request('http://localhost/api/portfolio',{method:'PATCH'}))).status,401);
});
