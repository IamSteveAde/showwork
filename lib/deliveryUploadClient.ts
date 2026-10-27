"use client";
import { calendarMutationFetch } from "@/lib/publishing/clientRequests";
import { putFileWithProgress } from "@/lib/uploadClient";
import { getFileContentType } from "@/lib/mediaFileTypes";
import { capturePortfolioPoster } from "@/lib/portfolioVideoPoster";
import { detectLocalFileAspectRatio } from "@/lib/detectLocalFileAspectRatio";

// One budget across files and multipart workers; never multiply file x part concurrency.
let active = 0;
let paused = false;
const controllers = new Set<AbortController>();
export function pauseDeliveryUploads() { paused = true; for (const controller of controllers) controller.abort(); }
export function resumeDeliveryUploads() { paused = false; }
export function deliveryRetryable(error: unknown) {
  if ((error as Error)?.name === "AbortError" || paused) return false;
  const status = (error as {status?:number})?.status;
  return !status || [408,425,429,500,502,503,504].includes(status);
}
const waiting: (() => void)[] = [];
async function transfer<T>(work: (signal: AbortSignal) => Promise<T>) {
  if (active >= 3) await new Promise<void>(resolve => waiting.push(resolve));
  else active++;
  const controller = new AbortController(); controllers.add(controller);
  try { if (paused) throw new DOMException("Uploads paused. Retry to resume.","AbortError"); return await work(controller.signal); }
  finally { controllers.delete(controller); const next = waiting.shift(); if (next) next(); else active--; }
}
export async function putDeliveryFile(url: string, file: Blob, progress: (loaded: number, total: number) => void) {
  return transfer(signal => putFileWithProgress(url, file, { retries: 0, signal, contentType: getFileContentType(file) || "application/octet-stream", onProgress: ({loaded,total}) => progress(loaded,total) }));
}
export async function putDeliveryPart(url: string, chunk: Blob, progress: (loaded: number, total: number) => void) {
  return transfer(signal => putFileWithProgress(url, chunk, { retries: 0, signal, onProgress: ({loaded,total}) => progress(loaded,total) }));
}
export async function uploadQueue<T>(items: T[], work: (item: T) => Promise<void>) {
  let index = 0, failure: unknown;
  await Promise.all(Array.from({ length: Math.min(2, items.length) }, async () => {
    while (index < items.length && !failure && !paused) {
      const item = items[index++];
      try { await work(item); } catch (error) { failure = error; }
    }
  }));
  if (failure) throw failure;
  if (paused) throw new DOMException("Uploads paused. Retry to resume.","AbortError");
}
/** Small previews are optional and never trigger another original upload. */
export async function saveDeliveryPreview(file: File, mediaId: string, expectedFileKey?: string, task = false) {
  try {
    const url = task ? `/api/managed-projects/task-assets/${encodeURIComponent(mediaId)}/preview` : `/api/media/${encodeURIComponent(mediaId)}/preview`;
    const ratio = await detectLocalFileAspectRatio(file);
    if (ratio) await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aspectRatio: ratio, expectedFileKey }), signal: AbortSignal.timeout(15000) });
    if (getFileContentType(file).startsWith("video/")) {
      const poster = await capturePortfolioPoster(file);
      if (poster) await fetch(url, { method: "POST", headers: { "Content-Type": "image/jpeg", ...(expectedFileKey ? {"x-upload-file-key":expectedFileKey} : {}) }, body: poster, signal: AbortSignal.timeout(15000) });
    }
  } catch { /* Original is already safely registered. Backfill can repair previews. */ }
}
/** Retry final registration only: never repeat a successful transfer on DB failure. */
export async function completeDeliveryUpload(url: string, body: Record<string, unknown>) {
  let last: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await calendarMutationFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
      last = response;
      if (response.ok || response.status < 500) return response;
    } catch (error) { if (attempt === 2) throw error; }
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
  }
  if (last) return Response.json({error:"The transfer finished, but saving it is temporarily unavailable. Retry to finish saving without uploading again.",code:"UPLOAD_REGISTRATION_RETRY"},{status:503});
  throw Error("Could not save this upload. Retry completion without uploading the original again.");
}

export async function uploadDeliverySingle(input: {file: File; projectId: string; sectionId?: string; folderId?: string; type: string; onProgress: (loaded: number,total: number) => void; presignUrl?:string; completeUrl?:string; task?:boolean}) {
  const {file,projectId,sectionId,folderId,type,onProgress} = input;
  const key = `showwork-delivery-transfer:${input.presignUrl || "core"}:${projectId}:${sectionId || ""}:${folderId || ""}:${file.name}:${file.size}:${file.lastModified}`;
  let saved: {fileKey: string; uploaded: boolean} | null = null;
  try { saved = JSON.parse(localStorage.getItem(key) || "null"); } catch {}
  if (!saved?.uploaded) {
    const response = await calendarMutationFetch(input.presignUrl || "/api/upload/presign", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId,filename:file.name,contentType:getFileContentType(file),fileSizeMb:file.size/1024/1024,resumeFileKey:saved?.fileKey})});
    const data = await response.json();
    if (!response.ok) { if (data.code === "UPLOAD_SESSION_EXPIRED") { try { localStorage.removeItem(key); } catch {} } throw Object.assign(Error(data.error || "Could not start upload"), {status:response.status}); }
    saved = {fileKey:data.fileKey,uploaded:false};
    try { localStorage.setItem(key,JSON.stringify(saved)); } catch {}
    await putDeliveryFile(data.uploadUrl,file,onProgress);
    saved.uploaded = true;
    try { localStorage.setItem(key,JSON.stringify(saved)); } catch {}
  }
  onProgress(file.size,file.size);
  const registration = input.completeUrl?.includes("/replace/") ? {fileKey:saved.fileKey} : {projectId,fileKey:saved.fileKey,type,sectionId,folderId,filename:file.name};
  const response = await completeDeliveryUpload(input.completeUrl || "/api/upload/complete",registration);
  const data = await response.json();
  if (!response.ok) {
    if (data.code === "UPLOAD_SESSION_EXPIRED" || data.code === "UPLOAD_NOT_VERIFIED") { try { localStorage.removeItem(key); } catch {} }
    throw Object.assign(Error(data.error || "Could not save upload"),{status:response.status});
  }
  const media = data.media || data.asset;
  await saveDeliveryPreview(file,media.id,saved.fileKey,input.task);
  try { localStorage.removeItem(key); } catch {}
  return media;
}

export function deliveryMediaType(file: File, fallback: string) {
  const type = getFileContentType(file);
  return type.startsWith("video/") ? "VIDEO" : type.startsWith("image/") ? "PHOTO" : type === "application/pdf" ? "PDF" : type.includes("wordprocessingml") ? "DOCUMENT" : fallback;
}

export async function reconcileDeliveryParts(projectId: string, progress: {fileKey: string; uploadId: string; completedParts: {partNumber:number;etag:string}[]}, totalChunks: number) {
  const response = await fetch("/api/upload/multipart/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId,fileKey:progress.fileKey,uploadId:progress.uploadId})});
  const data = await response.json();
  if (!response.ok) throw Object.assign(Error(data.error || "Could not resume upload"),{code:data.code,status:response.status});
  progress.completedParts = data.completed ? Array.from({length:totalChunks},(_,index)=>({partNumber:index+1,etag:""})) : data.parts;
}

const partWindows = new Map<string,{expiresAt:number;request:Promise<Record<number,string>>}>();
export async function deliveryPartUrl(projectId: string, fileKey: string, uploadId: string, partNumber: number, totalChunks: number) {
  const start = Math.floor((partNumber - 1) / 3) * 3 + 1;
  const key = `${uploadId}:${start}`;
  let window = partWindows.get(key);
  if (!window || window.expiresAt <= Date.now()) {
    const request = (async () => {
      const response = await fetch("/api/upload/multipart/sign-part",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId,fileKey,uploadId,partNumbers:Array.from({length:Math.min(3,totalChunks-start+1)},(_,index)=>start+index)})});
      const data = await response.json();
      if (!response.ok) throw Object.assign(Error(data.error || "Could not sign upload parts"),{status:response.status});
      return data.uploadUrls;
    })();
    window = {request,expiresAt:Date.now()+10*60*1000};
    partWindows.set(key,window);
    if (partWindows.size > 200) partWindows.delete(partWindows.keys().next().value!);
  }
  try {
    const url = (await window.request)[partNumber];
    if (typeof url !== "string" || !url) throw Error("Part URL was missing");
    return url;
  } catch (error) { partWindows.delete(key); throw error; }
}
