import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { putPortfolioPoster, publicUrlFor } from "@/lib/r2";

export const runtime = "nodejs";
const MAX_BYTES = 1024 * 1024;
export async function POST(req: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { mediaId } = await params;
  const media = await db.portfolioMedia.findUnique({ where: { id: mediaId }, include: { portfolio: { select: { creatorId: true } } } });
  if (!media || media.portfolio.creatorId !== creator.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    const posterFileKey = `portfolios/${media.portfolioId}/posters/${media.id}.jpg`;
    await putPortfolioPoster(posterFileKey, poster);
    await db.portfolioMedia.update({ where: { id: media.id }, data: { posterFileKey } });
    return NextResponse.json({ posterUrl: publicUrlFor(posterFileKey) });
  } catch {
    return NextResponse.json({ error: "Could not save the preview. Your original video is unchanged." }, { status: 422 });
  } finally { reader.releaseLock(); }
}
