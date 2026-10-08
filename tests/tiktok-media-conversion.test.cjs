const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const ts=require('typescript');
const sharp=require('sharp');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),originalFetch=global.fetch;
afterEach(()=>{global.fetch=originalFetch;});
function load(file,mocks={},cache=new Map()){
 file=path.resolve(root,file);if(cache.has(file))return cache.get(file);
 const mod={exports:{}};cache.set(file,mod.exports);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(name=>{if(Object.hasOwn(mocks,name))return mocks[name];if(name.startsWith('@/')||name.startsWith('.'))return load((name.startsWith('@/')?path.join(root,name.slice(2)):path.resolve(path.dirname(file),name))+'.ts',mocks,cache);return require(name);},mod,mod.exports);return mod.exports;
}
function media(storage={}) {return load('lib/tiktokMedia.ts',{'@/lib/r2':{publicUrlFor:key=>'https://media.test/'+key,putTikTokPreparedFile:async()=>{},...storage}});}
const creator={max_video_post_duration_sec:180};
const image=()=>sharp({create:{width:64,height:48,channels:4,background:{r:50,g:100,b:200,alpha:0.5}}});
for(const format of ['png','jpeg','webp','avif','tiff','gif'])test(`${format} pixels become a valid JPEG, independent of source extension`,async()=>{
 const input=await image()[format]().toBuffer();const output=await media().convertTikTokImage(input);const info=await sharp(output).metadata();assert.equal(info.format,'jpeg');assert.equal(info.width,64);assert.equal(info.height,48);assert.equal(info.hasAlpha,false);
});
test('large PNGs are resized without cropping and transparency is flattened onto white',async()=>{
 const input=await sharp({create:{width:2400,height:1200,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toBuffer();
 const output=await media().convertTikTokImage(input);const info=await sharp(output).metadata();assert.equal(info.width,1920);assert.equal(info.height,960);
 const {data}=await sharp(output).raw().toBuffer({resolveWithObject:true});assert.ok(data[0]>250&&data[1]>250&&data[2]>250);
});
test('SVG photos are rasterized as JPEG and EXIF orientation is applied',async()=>{
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="red"/></svg>');
 assert.equal((await sharp(await media().convertTikTokImage(svg)).metadata()).format,'jpeg');
 const rotated=await image().jpeg().withMetadata({orientation:6}).toBuffer();const info=await sharp(await media().convertTikTokImage(rotated)).metadata();assert.equal(info.width,48);assert.equal(info.height,64);
});
test('photo preflight accepts PNG without ffprobe or writing storage; worker publishes the converted URL',async()=>{
 const input=await image().png().toBuffer();const writes=[];
 global.fetch=async(_url,init)=>init?.method==='HEAD'?new Response(null,{headers:{'content-length':String(input.length)}}):new Response(input);
 const m=media({putTikTokPreparedFile:async(...args)=>writes.push(args)}),assets=[{fileKey:'source.PNG',mediaType:'PHOTO'}];
 const preflight=await m.validateTikTokMedia(assets,creator);assert.equal(writes.length,0);assert.equal(preflight[0].converted,true);
 const prepared=await m.validateTikTokMedia(assets,creator,{publish:true});assert.equal(writes.length,1);assert.match(writes[0][0],/^tiktok-prepared-.+\.jpg$/);assert.equal(writes[0][2],'image/jpeg');assert.equal((await sharp(writes[0][1]).metadata()).format,'jpeg');assert.equal(prepared[0].url,'https://media.test/'+writes[0][0]);assert.notEqual(prepared[0].url,'https://media.test/source.PNG');
});
test('video preflight accepts decodable AVI/MKV/WMV rather than enforcing TikTok container restrictions on originals',()=>{
 const m=media();for(const format of ['avi','matroska','asf'])assert.doesNotThrow(()=>m.validateTikTokSourceVideo({format:{duration:'10',format_name:format},streams:[{codec_type:'video',codec_name:'mpeg4',width:640,height:480,avg_frame_rate:'15/1'}]},1000,180));
 assert.throws(()=>m.validateTikTokSourceVideo({format:{duration:'181'},streams:[{codec_type:'video',width:640,height:480}]},1000,180),/Shorten/);
});
test('actual AVI conversion produces MP4 H264 with compliant FPS and preserves duration',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'showwork-conversion-test-'));
 try{
  const ffmpeg=require('ffmpeg-static'),ffprobe=require('ffprobe-static').path;
  const input=path.join(directory,'source.avi'),output=path.join(directory,'converted.mp4');
  execFileSync(ffmpeg,['-v','error','-f','lavfi','-i','color=c=blue:s=640x480:r=15','-t','1','-c:v','mpeg4',input],{timeout:30000});
  const source=JSON.parse(execFileSync(ffprobe,['-v','error','-show_streams','-show_format','-of','json',input],{encoding:'utf8'}));
  const m=media(),args=m.tikTokConversionArgs(input,output,source);args[args.indexOf('https,http,tls,tcp')]='file,pipe';
  execFileSync(ffmpeg,args,{timeout:30000});
  const result=JSON.parse(execFileSync(ffprobe,['-v','error','-show_streams','-show_format','-of','json',output],{encoding:'utf8'}));
  m.validateTikTokMediaProbe(result,fs.statSync(output).size,'VIDEO',180);assert.equal(result.streams[0].codec_name,'h264');assert.ok(Math.abs(Number(result.format.duration)-Number(source.format.duration))<0.2);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('unreadable proprietary or corrupt image returns an actionable error without publishing bytes',async()=>{
 await assert.rejects(media().prepareTikTokImage(Buffer.from('not image bytes')),/could not be decoded/);
});

test('temporary media storage and cleanup target only generated names and preserve originals',async()=>{
 const prefix='calendars/calendar/post/',uuid='a1234567-1234-1234-1234-123456789abc';const expired=new Date(Date.now()-8*86400000),recent=new Date();const sent=[];
 class Command{constructor(input){this.input=input;}}
 class Client{async send(command){sent.push(command.input);if(command.input.Prefix==='calendars/')return{Contents:[{Key:prefix+'original.png',LastModified:expired},{Key:prefix+'tiktok-prepared-'+uuid+'.jpg',LastModified:expired},{Key:prefix+'tiktok-prepared-'+uuid+'.mp4',LastModified:recent},{Key:prefix+'tiktok-prepared-not-a-uuid.jpg',LastModified:expired}]};if(command.input.Prefix==='tiktok-prepared/')return{Contents:[]};return{};}}
 const sdk={S3Client:Client};for(const name of ['PutObjectCommand','DeleteObjectCommand','HeadObjectCommand','CreateMultipartUploadCommand','UploadPartCommand','CompleteMultipartUploadCommand','AbortMultipartUploadCommand','ListPartsCommand','ListObjectsV2Command','DeleteObjectsCommand'])sdk[name]=Command;
 const m=load('lib/r2.ts',{'@aws-sdk/client-s3':sdk,'@aws-sdk/s3-request-presigner':{getSignedUrl(){}}});
 await assert.rejects(m.putTikTokPreparedFile(prefix+'original.png',Buffer.from('x'),'image/jpeg',1),/Invalid prepared/);
 await m.putTikTokPreparedFile(prefix+'tiktok-prepared-'+uuid+'.jpg',Buffer.from('x'),'image/jpeg',1);
 assert.equal((await m.cleanupTikTokPreparedFiles()).deleted,1);
 const removal=sent.find(input=>input.Delete);assert.deepEqual(removal.Delete.Objects,[{Key:prefix+'tiktok-prepared-'+uuid+'.jpg'}]);
});

test('HEIC files use a portable decoder when the native image build cannot read them',async()=>{
 const input=Buffer.alloc(32);input.write('ftyp',4);input.write('heic',8);let decoded=false;
 const png=await image().png().toBuffer();
 const native=(bytes,options)=>{if(bytes===input)throw new Error('Native HEVC decoder unavailable');return sharp(bytes,options);};
 const m=load('lib/tiktokMedia.ts',{'@/lib/r2':{},sharp:native,'heic-convert':async options=>{assert.equal(options.buffer,input);assert.equal(options.format,'PNG');decoded=true;return png;}});
 const result=await m.prepareTikTokImage(input,'iphone.HEIC');assert.equal(decoded,true);assert.equal((await sharp(result).metadata()).format,'jpeg');
});
