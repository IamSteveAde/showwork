import { db } from "@/lib/db";
import { getObjectSize } from "@/lib/r2";

export function validDeliveryKey(key: unknown, projectId: string) {
  return typeof key === "string" && key.startsWith(`projects/${projectId}/`) && !key.includes("\\") && !key.includes("%") && !key.split("/").some(segment => segment === "." || segment === "..");
}
export function validTaskKey(key: unknown, managedProjectId: string, taskId: string) {
  return typeof key === "string" && key.startsWith(`managed-projects/${managedProjectId}/tasks/${taskId}/`) && !key.includes("\\") && !key.includes("%") && !key.split("/").some(segment => segment === "." || segment === "..");
}
export function expectedUploadBytes(value: unknown, maxMb: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > maxMb) throw Error("INVALID_UPLOAD_SIZE");
  const bytes = Math.round(value * 1024 * 1024);
  if (bytes < 1 || !Number.isSafeInteger(bytes)) throw Error("INVALID_UPLOAD_SIZE");
  return BigInt(bytes);
}
export async function createDeliverySession(input: { projectId: string; creatorId: string; fileKey: string; uploadId?: string; fileSizeMb: unknown; contentType: string; maxMb: number; purpose?: string; targetId?: string }) {
  return db.deliveryUploadSession.create({ data: {
    projectId: input.projectId, creatorId: input.creatorId, fileKey: input.fileKey, uploadId: input.uploadId,
    expectedBytes: expectedUploadBytes(input.fileSizeMb, input.maxMb), contentType: input.contentType,
    purpose: input.purpose ?? "NEW", targetId: input.targetId,
    expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
  } });
}
export async function deliverySession(projectId: string, creatorId: string, fileKey: unknown, uploadId?: unknown, scope: {purpose:string;targetId:string} | null = null) {
  if (scope?.purpose === "TASK" ? !validTaskKey(fileKey, projectId, scope.targetId) : !validDeliveryKey(fileKey, projectId)) return null;
  const session = await db.deliveryUploadSession.findUnique({ where: { fileKey: fileKey as string } });
  if (!session || (session.purpose ?? "NEW") !== (scope?.purpose ?? "NEW") || (scope && session.targetId !== scope.targetId) || session.projectId !== projectId || session.creatorId !== creatorId || session.state === "ABORTED" || (session.state !== "COMPLETE" && session.expiresAt <= new Date()) || (uploadId !== undefined && session.uploadId !== uploadId)) return null;
  return session;
}
export async function verifyDeliveryObject(session: { fileKey: string; expectedBytes: bigint }) {
  const size = await getObjectSize(session.fileKey);
  if (BigInt(size) !== session.expectedBytes) throw Error("UPLOAD_SIZE_MISMATCH");
  return size;
}

export function matchesDeliveryType(contentType: string, type: string) {
  return contentType.startsWith("image/") ? type === "PHOTO" : contentType.startsWith("video/") ? type === "VIDEO" : contentType === "application/pdf" ? type === "PDF" : type === "DOCUMENT";
}

export async function registerDeliveryReplacement(input: { mediaId: string; projectId: string; oldFileKey: string; fileKey: string; creatorId: string; sessionId: string; sizeBytes: number; unlimited: boolean }) {
  return db.$transaction(async tx => {
    const changed = await tx.media.updateMany({where:{id:input.mediaId,fileKey:input.oldFileKey,approvalStatus:"NEEDS_REVISION"},data:{fileKey:input.fileKey,approvalStatus:"PENDING",approvalNote:null,reviewedAt:null,reviewerEmail:null,uploadedByCreatorId:input.creatorId,posterFileKey:null,aspectRatio:null,sizeBytes:input.sizeBytes}});
    if (changed.count !== 1) throw Error("REPLACEMENT_CHANGED");
    const reserved = await tx.project.updateMany({where:{id:input.projectId,...(input.unlimited?{}:{replaceCount:{lt:5}})},data:{replaceCount:{increment:1}}});
    if (reserved.count !== 1) throw Error("REPLACEMENT_LIMIT");
    await tx.deliveryUploadSession.update({where:{id:input.sessionId},data:{state:"COMPLETE",mediaId:input.mediaId}});
    return tx.media.findUniqueOrThrow({where:{id:input.mediaId}});
  });
}

export function parseDeliveryParts(value: unknown): {partNumber:number;etag:string}[] | null {
  if (!Array.isArray(value) || !value.length || value.length > 10000) return null;
  const parts: {partNumber:number;etag:string}[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || !Number.isInteger(item.partNumber) || item.partNumber < 1 || item.partNumber > 10000 || typeof item.etag !== "string") return null;
    parts.push({partNumber:item.partNumber,etag:item.etag});
  }
  parts.sort((a,b)=>a.partNumber-b.partNumber);
  return parts.every((part,index)=>part.partNumber === index+1) ? parts : null;
}

export function validPortfolioKey(key: unknown, portfolioId: string) {
  return typeof key === "string" && key.startsWith(`portfolios/${portfolioId}/`) && !key.includes("\\") && !key.includes("%") && !key.split("/").some(segment => segment === "." || segment === "..");
}
