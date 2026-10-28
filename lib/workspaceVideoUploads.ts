import type { WorkspaceVideoUpload } from "@prisma/client";
import { db } from "@/lib/db";
import { reserveContentWorkspaceStorage, releaseContentWorkspaceStorageReservation } from "@/lib/contentWorkspaceUsage";
import { createMultipartUpload, abortMultipartUpload, completeMultipartUpload, getObjectSize, getPresignedPartUploadUrl, listWorkspaceVideoParts } from "@/lib/r2";
import { WORKSPACE_VIDEO_MAX_BYTES, WORKSPACE_VIDEO_PART_SIZE, WORKSPACE_VIDEO_THRESHOLD } from "@/lib/workspaceVideoConfig";

export class VideoUploadError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateVideoStart(body: Record<string, unknown>) {
  if (typeof body.sessionId !== "string" || !uuid.test(body.sessionId) || typeof body.fingerprint !== "string" || !/^[a-f0-9]{64}$/.test(body.fingerprint) || typeof body.fileSize !== "number" || !Number.isSafeInteger(body.fileSize) || body.fileSize < WORKSPACE_VIDEO_THRESHOLD || body.fileSize > WORKSPACE_VIDEO_MAX_BYTES || typeof body.contentType !== "string" || !["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"].includes(body.contentType)) {
    throw new VideoUploadError("Choose a supported video between 64 MB and 10 GB.", 400);
  }
  return { id: body.sessionId, fingerprint: body.fingerprint, bytes: BigInt(body.fileSize), contentType: body.contentType };
}
export function validateVideoParts(session: Pick<WorkspaceVideoUpload, 'bytes' | 'partSize'>, parts: {partNumber:number;size:number}[], complete = false) {
  const count = Math.ceil(Number(session.bytes) / session.partSize);
  const seen = new Set<number>();
  for (const part of parts) {
    const expected = Math.min(session.partSize, Number(session.bytes) - (part.partNumber - 1) * session.partSize);
    if (!Number.isInteger(part.partNumber) || part.partNumber < 1 || part.partNumber > count || seen.has(part.partNumber) || part.size !== expected) throw new VideoUploadError("Some video chunks are invalid. Cancel this upload and select the video again.");
    seen.add(part.partNumber);
  }
  if (complete && seen.size !== count) throw new VideoUploadError("Some video chunks are still missing. Resume the upload to finish.");
}
const missingUpload = (error: unknown) => (error as {name?:string})?.name === 'NoSuchUpload';
async function abortSession(session: WorkspaceVideoUpload) {
  if (session.uploadId) try { await abortMultipartUpload(session.fileKey, session.uploadId); } catch (error) { if (!missingUpload(error)) throw error; }
}

export async function startWorkspaceVideo(input: { calendarId:string; postId:string; ownerId:string; actorId:string; body:Record<string,unknown> }) {
  const data = validateVideoStart(input.body);
  const fileKey = `calendars/${input.calendarId}/${input.postId}/${data.id}.${data.contentType === 'video/webm' ? 'webm' : data.contentType === 'video/quicktime' ? 'mov' : 'mp4'}`;
  // Persist the request identity before calling storage; retries recover the same session.
  const session = await db.workspaceVideoUpload.upsert({ where:{id:data.id}, update:{}, create:{...data,calendarId:input.calendarId,postId:input.postId,creatorId:input.ownerId,actorId:input.actorId,fileKey,partSize:WORKSPACE_VIDEO_PART_SIZE,expiresAt:new Date(Date.now()+8*60*60*1000)} });
  if (session.calendarId !== input.calendarId || session.postId !== input.postId || session.actorId !== input.actorId || session.creatorId !== input.ownerId || session.fingerprint !== data.fingerprint || session.bytes !== data.bytes || session.contentType !== data.contentType) throw new VideoUploadError("This upload belongs to another file or account.",403);
  if (session.state === 'ABORTED' || session.expiresAt <= new Date()) throw new VideoUploadError("This upload session has expired. Cancel it and select the video again.",410);
  let receipt = await db.contentWorkspaceStorageReservation.findUnique({where:{id:session.id}});
  if (!receipt) {
    try {
      const reserved = await reserveContentWorkspaceStorage(input.ownerId,input.calendarId,fileKey,Number(data.bytes),session.id);
      if (!reserved.allowed) throw new VideoUploadError(reserved.reason || "Insufficient storage",413);
    } catch(error) {
      // Concurrent identical starts may race at the unique receipt ID; its transaction rolls back.
      if ((error as {code?:string})?.code !== 'P2002') throw error;
    }
    receipt = await db.contentWorkspaceStorageReservation.findUnique({where:{id:session.id}});
  }
  if (!receipt || receipt.creatorId !== session.creatorId || receipt.calendarId !== session.calendarId || receipt.fileKey !== fileKey || receipt.bytes !== session.bytes || receipt.status === 'RELEASED') throw new VideoUploadError("This upload reservation is no longer active.",410);
  let newUpload: string | undefined;
  try {
    return await db.$transaction(async tx => {
      const [locked] = await tx.$queryRaw<WorkspaceVideoUpload[]>`SELECT * FROM "WorkspaceVideoUpload" WHERE id=${session.id} FOR UPDATE`;
      if (!locked || locked.state === 'ABORTED' || locked.expiresAt <= new Date()) throw new VideoUploadError("This upload is no longer active.",410);
      if (locked.uploadId) return locked;
      newUpload = await createMultipartUpload(fileKey,data.contentType);
      return tx.workspaceVideoUpload.update({where:{id:session.id},data:{uploadId:newUpload,state:'UPLOADING'}});
    },{maxWait:15000,timeout:30000});
  } catch(error) {
    if (newUpload) await abortMultipartUpload(fileKey,newUpload).catch(()=>{});
    throw error;
  }
}

export async function workspaceVideoAction(input:{calendarId:string;postId:string;actorId:string;ownerId:string;body:Record<string,unknown>}) {
  const {body}=input;
  if (typeof body.sessionId !== 'string' || !uuid.test(body.sessionId)) throw new VideoUploadError('Upload session required',400);
  return db.$transaction(async tx => {
    const [session]=await tx.$queryRaw<WorkspaceVideoUpload[]>`SELECT * FROM "WorkspaceVideoUpload" WHERE id=${body.sessionId} FOR UPDATE`;
    if (!session || session.calendarId !== input.calendarId || session.postId !== input.postId || session.actorId !== input.actorId || session.creatorId !== input.ownerId) throw new VideoUploadError('Upload not found',404);
    const receipt=await tx.contentWorkspaceStorageReservation.findUnique({where:{id:session.id}});
    if (body.action === 'abort') {
      if (receipt?.status === 'COMPLETED') throw new VideoUploadError('The video is already saved. Remove it from the post instead.');
      await abortSession(session);
      await tx.workspaceVideoUpload.update({where:{id:session.id},data:{state:'ABORTED'}});
      return {aborted:true,fileKey:session.fileKey,reservationId:session.id};
    }
    if (!receipt || receipt.status === 'RELEASED' || session.state === 'ABORTED' || (receipt.status !== 'COMPLETED' && (session.expiresAt <= new Date() || receipt.expiresAt <= new Date()))) throw new VideoUploadError('Upload expired or cancelled. Cancel it and select the video again.',410);
    if (receipt.status === 'COMPLETED' || session.state === 'ASSEMBLED') return {assembled:true,parts:[],fileKey:session.fileKey,reservationId:session.id,partSize:session.partSize};
    if (!session.uploadId) throw new VideoUploadError('Upload is still being prepared. Retry shortly.',503);
    if (body.action === 'sign') {
      const numbers=body.partNumbers;
      const count=Math.ceil(Number(session.bytes)/session.partSize);
      if (!Array.isArray(numbers) || !numbers.length || numbers.length>3 || numbers.some(n=>!Number.isInteger(n)||n<1||n>count) || new Set(numbers).size!==numbers.length) throw new VideoUploadError('Invalid video chunk request',400);
      const urls=await Promise.all(numbers.map(async n=>[n,await getPresignedPartUploadUrl(session.fileKey,session.uploadId!,n)]));
      return {uploadUrls:Object.fromEntries(urls)};
    }
    let parts;
    try { parts=await listWorkspaceVideoParts(session.fileKey,session.uploadId); }
    catch(error) {
      if (!missingUpload(error)) throw error;
      // Storage completion may succeed even if its HTTP acknowledgement or DB commit was lost.
      const size=await getObjectSize(session.fileKey).catch(()=>0);
      if (BigInt(size)!==session.bytes) throw new VideoUploadError('Video transfer could not be recovered. Cancel it and select the file again.',410);
      await tx.workspaceVideoUpload.update({where:{id:session.id},data:{state:'ASSEMBLED'}});
      return {assembled:true,parts:[],fileKey:session.fileKey,reservationId:session.id,partSize:session.partSize};
    }
    validateVideoParts(session,parts,body.action === 'finish');
    if (body.action === 'finish') {
      await completeMultipartUpload(session.fileKey,session.uploadId,parts);
      if (BigInt(await getObjectSize(session.fileKey))!==session.bytes) throw new VideoUploadError('Video size verification failed.');
      await tx.workspaceVideoUpload.update({where:{id:session.id},data:{state:'ASSEMBLED'}});
    }
    return {assembled:body.action==='finish',parts:parts.map(({partNumber,size})=>({partNumber,size})),fileKey:session.fileKey,reservationId:session.id,partSize:session.partSize};
  },{maxWait:15000,timeout:30000});
}

/** Metadata survives a deleted workspace so incomplete multipart data can still be reclaimed. */
export async function cleanupWorkspaceVideoUploads(limit=10) {
  const sessions=await db.workspaceVideoUpload.findMany({where:{state:{notIn:['COMPLETE','ABORTED']},expiresAt:{lte:new Date()}},take:limit,orderBy:{expiresAt:'asc'}});
  let aborted=0,failed=0;
  for (const candidate of sessions) try {
    await db.$transaction(async tx=>{
      const [session]=await tx.$queryRaw<WorkspaceVideoUpload[]>`SELECT * FROM "WorkspaceVideoUpload" WHERE id=${candidate.id} FOR UPDATE`;
      if (!session || ['COMPLETE','ABORTED'].includes(session.state)) return;
      const receipt=await tx.contentWorkspaceStorageReservation.findUnique({where:{id:session.id}});
      if (receipt?.status==='COMPLETED') {await tx.workspaceVideoUpload.update({where:{id:session.id},data:{state:'COMPLETE'}});return;}
      await abortSession(session);
      await tx.workspaceVideoUpload.update({where:{id:session.id},data:{state:'ABORTED'}});
      aborted++;
    },{maxWait:10000,timeout:15000});
  }catch{failed++;}
  return {aborted,failed};
}

export async function releaseAbortedWorkspaceVideo(session:{reservationId:string;fileKey:string},ownerId:string,calendarId:string) {
  return releaseContentWorkspaceStorageReservation(session.reservationId,ownerId,calendarId,session.fileKey);
}
