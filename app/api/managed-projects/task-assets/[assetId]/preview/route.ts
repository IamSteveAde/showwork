import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { putTaskPoster, publicUrlFor } from "@/lib/r2";

export const runtime = "nodejs";
const MAX_BYTES = 1024 * 1024;
export async function POST(req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { assetId } = await params;
  const media = await db.taskAsset.findUnique({ where: { id: assetId }, include: { task: { include: { managedProject: { select: { creatorId: true } } } } } });
  if (!media || media.task.managedProject.creatorId !== creator.id && media.task.assignedToCreatorId !== creator.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const expectedFileKey = req.headers.get("x-upload-file-key");
  if (expectedFileKey && expectedFileKey !== media.fileKey) return NextResponse.json({error:"This file has been replaced"},{status:409});
  if (media.type !== "VIDEO") return NextResponse.json({ error: "Only videos need posters" }, { status: 400 });
  if (media.posterFileKey) return NextResponse.json({ posterUrl: publicUrlFor(media.posterFileKey) });
  if (!req.body || Number(req.headers.get("content-length")) > MAX_BYTES) return NextResponse.json({ error: "Poster exceeds 1 MB" }, { status: 413 });
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      bytes += part.value.length;
      if (bytes > MAX_BYTES) { await reader.cancel(); return NextResponse.json({ error: "Poster exceeds 1 MB" }, { status: 413 }); }
      chunks.push(part.value);
    }
    const input = Buffer.concat(chunks);
    const image = sharp(input, { limitInputPixels: 16_000_000, animated: false });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || "")) return NextResponse.json({ error: "Invalid poster image" }, { status: 400 });
    const poster = await image.rotate().resize({ width: 960, height: 960, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
    const posterFileKey = `managed-projects/${media.task.managedProjectId}/tasks/${media.taskId}/posters/${media.id}-${createHash("sha256").update(media.fileKey).digest("hex").slice(0,12)}.jpg`;
    await putTaskPoster(posterFileKey, poster);
    const changed = await db.taskAsset.updateMany({ where: { id: media.id, fileKey: media.fileKey }, data: { posterFileKey } });
    if (!changed.count) return NextResponse.json({error:"This file has been replaced"},{status:409});
    const published = await db.taskAsset.findUnique({where:{id:media.id},select:{promotedToMediaId:true}});
    if (published?.promotedToMediaId) await db.media.updateMany({where:{id:published.promotedToMediaId,fileKey:media.fileKey},data:{posterFileKey}});
    return NextResponse.json({ posterUrl: publicUrlFor(posterFileKey) });
  } catch {
    return NextResponse.json({ error: "Could not save the preview. Your original video is unchanged." }, { status: 422 });
  } finally { reader.releaseLock(); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { assetId } = await params;
  const media = await db.taskAsset.findUnique({ where: { id: assetId }, include: { task: { include: { managedProject: { select: { creatorId: true } } } } } });
  if (!media || media.task.managedProject.creatorId !== creator.id && media.task.assignedToCreatorId !== creator.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { aspectRatio, expectedFileKey } = await req.json();
  if (expectedFileKey && expectedFileKey !== media.fileKey) return NextResponse.json({error:"This file has been replaced"},{status:409});
  if (typeof aspectRatio !== "number" || !Number.isFinite(aspectRatio) || aspectRatio <= 0 || aspectRatio > 100) return NextResponse.json({ error: "Invalid aspect ratio" }, { status: 400 });
  const changed = await db.taskAsset.updateMany({ where: { id: assetId, fileKey: media.fileKey }, data: { aspectRatio } });
  if (!changed.count) return NextResponse.json({error:"This file has been replaced"},{status:409});
  const published = await db.taskAsset.findUnique({where:{id:assetId},select:{promotedToMediaId:true}});
  if (published?.promotedToMediaId) await db.media.updateMany({where:{id:published.promotedToMediaId,fileKey:media.fileKey},data:{aspectRatio}});
  return NextResponse.json({ ok: true });
}
