import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getCurrentCreator } from '@/lib/auth';
import { hasCalendarPermission } from '@/lib/calendarPermissions';
import { db } from '@/lib/db';
import { putWorkspaceVideoPoster, publicUrlFor } from '@/lib/r2';
import { workspaceVideoPosterKey } from '@/lib/workspaceVideoPosterKey';
import { lockWorkspaceFileKeys } from '@/lib/workspaceStorageCleanup';
export const runtime='nodejs';
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string;postId:string;assetId:string}>}) {
  const actor=await getCurrentCreator();if(!actor)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {id,postId,assetId}=await params;
  if(!await hasCalendarPermission(actor.id,id,'ADD_CONTENT'))return NextResponse.json({error:'Forbidden'},{status:403});
  const asset=await db.calendarPostAsset.findFirst({where:{id:assetId,postId,post:{calendarId:id},mediaType:'VIDEO'}});
  if(!asset || req.headers.get('x-upload-file-key')!==asset.fileKey)return NextResponse.json({error:'Video not found or changed'},{status:404});
  if(asset.posterFileKey)return NextResponse.json({posterUrl:publicUrlFor(asset.posterFileKey)});
  const max=1024*1024;
  if(!req.body || Number(req.headers.get('content-length'))>max)return NextResponse.json({error:'Preview exceeds 1 MB'},{status:413});
  const reader=req.body.getReader();const chunks:Uint8Array[]=[];let bytes=0;
  try {
    while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>max){await reader.cancel();return NextResponse.json({error:'Preview exceeds 1 MB'},{status:413});}chunks.push(part.value);}
    const image=sharp(Buffer.concat(chunks),{limitInputPixels:16000000,animated:false});
    const meta=await image.metadata();if(!['jpeg','png','webp'].includes(meta.format||''))return NextResponse.json({error:'Invalid preview image'},{status:400});
    const poster=await image.rotate().resize({width:960,height:960,fit:'inside',withoutEnlargement:true}).jpeg({quality:75}).toBuffer();
    const key=workspaceVideoPosterKey(asset.fileKey);if(!key)throw Error('Invalid key');
    const saved=await db.$transaction(async tx=>{
      // Match deletion's parent-before-file lock order; no late orphan preview after deletion.
      await tx.$queryRaw`SELECT id FROM "SocialCalendar" WHERE id=${id} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "CalendarPost" WHERE id=${postId} AND "calendarId"=${id} FOR UPDATE`;
      await lockWorkspaceFileKeys(tx,[asset.fileKey]);
      const current=await tx.calendarPostAsset.findFirst({where:{id:assetId,postId,fileKey:asset.fileKey}});
      if(!current)return false;
      if(!current.posterFileKey){await putWorkspaceVideoPoster(key,poster);await tx.calendarPostAsset.update({where:{id:assetId},data:{posterFileKey:key}});}
      return true;
    },{maxWait:10000,timeout:20000});
    return saved?NextResponse.json({posterUrl:publicUrlFor(key)}):NextResponse.json({error:'Video was removed'},{status:409});
  }catch{return NextResponse.json({error:'Preview could not be saved. The original video is unchanged.'},{status:422});}
  finally{reader.releaseLock();}
}
