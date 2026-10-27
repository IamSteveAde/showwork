import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { putDeliveryPoster, publicUrlFor } from "@/lib/r2";

export const runtime = "nodejs";
const MAX_BYTES = 1024 * 1024;
export async function POST(req: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { mediaId } = await params;
  const media = await db.media.findUnique({ where: { id: mediaId }, include: { project: { select: { creatorId: true } } } });
  if (!media || media.project.creatorId !== creator.id && !await db.projectCollaborator.findFirst({ where: { projectId: media.projectId, creatorId: creator.id } })) return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    const posterFileKey = `projects/${media.projectId}/posters/${media.id}-${createHash("sha256").update(media.fileKey).digest("hex").slice(0,12)}.jpg`;
    await putDeliveryPoster(posterFileKey, poster);
    const changed = await db.media.updateMany({ where: { id: media.id, fileKey: media.fileKey }, data: { posterFileKey } });
    if (!changed.count) return NextResponse.json({error:"This file has been replaced"},{status:409});
    return NextResponse.json({ posterUrl: publicUrlFor(posterFileKey) });
  } catch {
    return NextResponse.json({ error: "Could not save the preview. Your original video is unchanged." }, { status: 422 });
  } finally { reader.releaseLock(); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { mediaId } = await params;
  const media = await db.media.findUnique({ where: { id: mediaId }, include: { project: true } });
  if (!media || media.project.creatorId !== creator.id && !await db.projectCollaborator.findFirst({ where: { projectId: media.projectId, creatorId: creator.id } })) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { aspectRatio, expectedFileKey } = await req.json();
  if (expectedFileKey && expectedFileKey !== media.fileKey) return NextResponse.json({error:"This file has been replaced"},{status:409});
  if (typeof aspectRatio !== "number" || !Number.isFinite(aspectRatio) || aspectRatio <= 0 || aspectRatio > 100) return NextResponse.json({ error: "Invalid aspect ratio" }, { status: 400 });
  const changed = await db.media.updateMany({ where: { id: mediaId, fileKey: media.fileKey }, data: { aspectRatio } });
  if (!changed.count) return NextResponse.json({error:"This file has been replaced"},{status:409});
  return NextResponse.json({ ok: true });
}
