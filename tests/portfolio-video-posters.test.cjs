const {test}=require('node:test');
const assert=require('node:assert/strict');
const sharp=require('sharp');
const {load}=require('./helpers/load-typescript.cjs');
function route({owner='owner',creator='owner',type='VIDEO',posterFileKey=null}={}) {
  const writes=[],objects=[];
  const handler=load('app/api/portfolio/media/[mediaId]/poster/route.ts',{
    '@/lib/auth':{getCurrentCreator:async()=>creator?{id:creator}:null},
    '@/lib/db':{db:{portfolioMedia:{findUnique:async()=>({id:'video-id',portfolioId:'portfolio-id',type,posterFileKey,portfolio:{creatorId:owner}}),update:async args=>writes.push(args)}}},
    '@/lib/r2':{putPortfolioPoster:async(key,buffer)=>objects.push({key,buffer}),publicUrlFor:key=>'https://media.test/'+key},
  });
  return {handler,writes,objects};
}
const params={params:Promise.resolve({mediaId:'video-id'})};
const request=body=>new Request('http://localhost/api/portfolio/media/video-id/poster',{method:'POST',body,headers:{'Content-Type':'image/jpeg'}});
test('poster endpoint protects authentication, ownership and video-only scope',async()=>{
  for(const [settings,status] of [[{creator:null},401],[{creator:'another-owner'},404],[{type:'PHOTO'},400]]){
    const f=route(settings);const response=await f.handler.POST(request('invalid'),params);
    assert.equal(response.status,status);assert.equal(f.writes.length,0);assert.equal(f.objects.length,0);
  }
});
test('normalizes a real image into a small JPEG and saves only its own media pointer',async()=>{
  const bytes=await sharp({create:{width:1600,height:800,channels:3,background:'#2478ff'}}).png().toBuffer();
  const f=route();const response=await f.handler.POST(request(bytes),params);
  assert.equal(response.status,200);
  assert.equal(f.objects[0].key,'portfolios/portfolio-id/posters/video-id.jpg');
  const metadata=await sharp(f.objects[0].buffer).metadata();
  assert.equal(metadata.format,'jpeg');assert.equal(metadata.width,960);assert.equal(metadata.height,480);
  assert.deepEqual(f.writes,[{where:{id:'video-id'},data:{posterFileKey:'portfolios/portfolio-id/posters/video-id.jpg'}}]);
});
test('repeated preview upload is idempotent and retains the saved poster',async()=>{
  const f=route({posterFileKey:'portfolios/portfolio-id/posters/video-id.jpg'});
  assert.equal((await f.handler.POST(request('unused'),params)).status,200);
  assert.equal(f.objects.length,0);assert.equal(f.writes.length,0);
});
test('invalid and oversized payloads cannot change a video or upload a poster',async()=>{
  for(const [bytes,status] of [[Buffer.from('not an image'),422],[Buffer.alloc(1024*1024+1),413]]){
    const f=route();assert.equal((await f.handler.POST(request(bytes),params)).status,status);
    assert.equal(f.objects.length,0);assert.equal(f.writes.length,0);
  }
});
test('public portfolio forwards poster URL without changing the original video URL',async()=>{
  const media={id:'v',type:'VIDEO',fileKey:'portfolios/p/original.mp4',posterFileKey:'portfolios/p/posters/v.jpg',caption:null,aspectRatio:2};
  const page=load('app/portfolio/[slug]/page.tsx',{
    '@/lib/db':{db:{portfolio:{findUnique:async()=>({id:'p',companyName:'Studio',media:[media],sections:[{id:'s',name:'Film',media:[media]}],testimonials:[]}),update:async()=>{}}}},
    '@/lib/r2':{publicUrlFor:key=>'https://media.test/'+key},
    '@/components/portfolio/PortfolioContent':{__esModule:true,default:()=>null},
  });
  const element=await page.default({params:Promise.resolve({slug:'studio'})});
  assert.equal(element.props.heroMedia.posterUrl,'https://media.test/portfolios/p/posters/v.jpg');
  assert.equal(element.props.sections[0].media[0].url,'https://media.test/portfolios/p/original.mp4');
});
test('backfill requires a specific portfolio and defaults to no writes',()=>{
  const {options}=require('../scripts/backfill-portfolio-video-posters.cjs');
  assert.throws(()=>options([]));assert.throws(()=>options(['--portfolio-id','p','--limit','101']));
  assert.deepEqual(options(['--portfolio-id','p']),{portfolioId:'p',limit:20,apply:false});
  assert.equal(options(['--portfolio-id','p','--apply']).apply,true);
});
test('backfill extracts a real JPEG from a synthetic local video without any network',async()=>{
  const {mkdtemp,rm}=require('node:fs/promises');const {tmpdir}=require('node:os');const {join}=require('node:path');
  const {promisify}=require('node:util');const exec=promisify(require('node:child_process').execFile);
  const directory=await mkdtemp(join(tmpdir(),'showwork-poster-test-'));
  try {
    const input=join(directory,'clip.mp4'),output=join(directory,'poster.jpg');
    await exec(require('ffmpeg-static'),['-nostdin','-v','error','-f','lavfi','-i','color=c=blue:s=128x72:d=0.3','-c:v','libx264','-pix_fmt','yuv420p',input],{timeout:15000});
    const poster=await require('../scripts/backfill-portfolio-video-posters.cjs').extractPoster(input,output);
    const metadata=await sharp(poster).metadata();
    assert.equal(metadata.format,'jpeg');assert.ok(metadata.width<=960);assert.equal(metadata.width/metadata.height,128/72);
  } finally {await rm(directory,{recursive:true,force:true});}
});
test('local capture scales the frame and releases the decoder and object URL',async()=>{
  const previousDocument=global.document,create=URL.createObjectURL,revoke=URL.revokeObjectURL;
  const video={videoWidth:1920,videoHeight:1080,duration:10,readyState:2,removeAttribute(){this.removed=true;},load(){}};
  const canvas={getContext:()=>({drawImage(){}}),toBlob:callback=>callback(new Blob(['jpeg'],{type:'image/jpeg'}))};
  let revoked=false;
  URL.createObjectURL=()=> 'blob:local';URL.revokeObjectURL=()=>{revoked=true;};
  global.document={createElement:tag=>tag==='video'?video:canvas};
  try {
    const pending=load('lib/portfolioVideoPoster.ts').capturePortfolioPoster(new Blob(['video']));
    video.onloadedmetadata();assert.equal(video.currentTime,1);video.onseeked();
    assert.equal((await pending).type,'image/jpeg');
    assert.equal(canvas.width,960);assert.equal(canvas.height,540);
    assert.ok(revoked);assert.ok(video.removed);assert.equal(video.onseeked,null);
  } finally {global.document=previousDocument;URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
});
test('browser decode failure returns a fallback rather than rejecting an upload',async()=>{
  const previousDocument=global.document,create=URL.createObjectURL,revoke=URL.revokeObjectURL;
  const video={removeAttribute(){},load(){}};
  URL.createObjectURL=()=> 'blob:local';URL.revokeObjectURL=()=>{};
  global.document={createElement:()=>video};
  try {
    const pending=load('lib/portfolioVideoPoster.ts').capturePortfolioPoster(new Blob(['unsupported']));
    video.onerror();assert.equal(await pending,null);
  } finally {global.document=previousDocument;URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
});
