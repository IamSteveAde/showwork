/** Dry-run default. Explicit project scope, serial work and bounded downloads. */
require('dotenv/config');
const {PrismaClient}=require('@prisma/client');
const {S3Client,PutObjectCommand}=require('@aws-sdk/client-s3');
const {mkdtemp,writeFile,readFile,rm}=require('node:fs/promises');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const sharp=require('sharp');
const exec=promisify(execFile);
function options(args) {
  const value=flag=>args[args.indexOf(flag)+1];
  const projectId=args.includes('--project-id')?value('--project-id'):'';
  const limit=Number(args.includes('--limit')?value('--limit'):20);
  if(!/^[a-zA-Z0-9-]+$/.test(projectId))throw Error('Provide --project-id <id> (one project per run).');
  if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('--limit must be 1–100.');
  return {projectId,limit,apply:args.includes('--apply')};
}
async function extractPoster(input,output) {
  const ffmpeg=require('ffmpeg-static');
  if(!ffmpeg)throw Error('ffmpeg-static binary is unavailable');
  await exec(ffmpeg,['-nostdin','-v','error','-protocol_whitelist','file,pipe','-i',input,'-ss','0','-frames:v','1','-vf','scale=960:960:force_original_aspect_ratio=decrease','-q:v','3','-y',output],{timeout:30000,maxBuffer:65536});
  return sharp(await readFile(output)).rotate().resize({width:960,height:960,fit:'inside',withoutEnlargement:true}).jpeg({quality:75}).toBuffer();
}
async function download(url,maxBytes=100*1024*1024) {
  const response=await fetch(url,{signal:AbortSignal.timeout(45000),redirect:'error'});
  if(!response.ok||!response.body)throw Error('Video download failed');
  if(Number(response.headers.get('content-length'))>maxBytes){await response.body.cancel();throw Error('Video exceeds 100 MB backfill limit');}
  const chunks=[];let size=0;
  for await(const chunk of response.body){size+=chunk.length;if(size>maxBytes)throw Error('Video exceeds 100 MB backfill limit');chunks.push(chunk);}
  return Buffer.concat(chunks);
}
async function main(args=process.argv.slice(2)) {
  const settings=options(args),db=new PrismaClient();
  try {
    const rows=await db.media.findMany({where:{projectId:settings.projectId,type:'VIDEO',posterFileKey:null},select:{id:true,fileKey:true},orderBy:{id:'asc'},take:settings.limit});
    console.log(`${settings.apply?'Applying':'Dry run'}: ${rows.length} video previews in selected project.`);
    if(!settings.apply){console.log('No media downloaded or changed. Add --apply only after reviewing the scope.');return;}
    const base=new URL(process.env.R2_PUBLIC_URL||'');
    if(!['https:','http:'].includes(base.protocol))throw Error('Invalid R2_PUBLIC_URL');
    const storage=new S3Client({region:'auto',endpoint:`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},forcePathStyle:true,requestChecksumCalculation:'WHEN_REQUIRED'});
    let failures=0;
    for(const row of rows){
      const directory=await mkdtemp(join(tmpdir(),'showwork-poster-'));
      try {
        if(!row.fileKey.startsWith(`projects/${settings.projectId}/`)||row.fileKey.split('/').some(part=>part==='..'||part==='.'))throw Error('Unexpected original media key');
        const source=base.href.replace(/\/$/,'')+'/'+row.fileKey.split('/').map(encodeURIComponent).join('/');
        const input=join(directory,'original'),output=join(directory,'poster.jpg');
        await writeFile(input,await download(source));
        const body=await extractPoster(input,output);
        const posterFileKey=`projects/${settings.projectId}/posters/${row.id}-${require('node:crypto').createHash('sha256').update(row.fileKey).digest('hex').slice(0,12)}.jpg`;
        await storage.send(new PutObjectCommand({Bucket:process.env.R2_BUCKET_NAME,Key:posterFileKey,Body:body,ContentType:'image/jpeg',CacheControl:'public, max-age=31536000, immutable'}));
        const dimensions=await sharp(body).metadata();
        await db.media.updateMany({where:{id:row.id,projectId:settings.projectId,posterFileKey:null,fileKey:row.fileKey},data:{posterFileKey,aspectRatio:dimensions.width/dimensions.height}});
        console.log(`Preview saved: ${row.id}`);
      } catch { failures++;console.error(`Preview failed: ${row.id}. Original retained; inspect codec/size/storage before retrying.`); }
      finally {await rm(directory,{recursive:true,force:true});}
    }
    if(failures)process.exitCode=1;
  } finally {await db.$disconnect();}
}
module.exports={options,extractPoster,download};
if(require.main===module)main().catch(()=>{console.error('Backfill stopped. Check scope, migration, credentials and tooling.');process.exitCode=1;});
