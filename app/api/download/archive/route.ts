import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import JSZip from "jszip";
import { db } from "@/lib/db";
import { deliveryAccess } from "@/lib/deliveryAccess";
import { getObjectSize, getDeliveryDownloadUrl } from "@/lib/r2";
export const runtime = "nodejs";
export const maxDuration = 300;
const MAX_BYTES = 1024 * 1024 * 1024;
export async function POST(req: NextRequest) {
  const json = req.headers.get("content-type")?.includes("application/json");
  const data = json ? await req.json() : Object.fromEntries(await req.formData());
  let items: { mediaId: string }[];
  try { items = typeof data.items === "string" ? JSON.parse(data.items) : data.items; }
  catch { return NextResponse.json({ error: "Invalid file list" }, { status: 400 }); }
  if (!Array.isArray(items) || !items.length || items.length > 100 || items.some(item => typeof item?.mediaId !== "string")) return NextResponse.json({ error: "Choose up to 100 files per archive. Download larger selections individually." }, { status: 400 });
  const ids = [...new Set(items.map(item => item.mediaId))];
  const media = await db.media.findMany({ where: { id: { in: ids } }, include: { project: true } });
  if (media.length !== ids.length) return NextResponse.json({ error: "Files not found" }, { status: 404 });
  for (const project of [...new Map(media.map(item => [item.project.id, item.project])).values()]) {
    if (!await deliveryAccess(project)) return NextResponse.json({ error: "Unlock this delivery first" }, { status: 403 });
    if (project.deliveryStatus !== "PAID") return NextResponse.json({ error: "Payment confirmation required before downloading" }, { status: 402 });
  }
  let bytes = 0;
  for (const file of media) {
    bytes += await getObjectSize(file.fileKey);
    if (bytes > MAX_BYTES) return NextResponse.json({ error: "This selection exceeds the 1 GB archive limit. Download large videos individually using the native download manager." }, { status: 413 });
  }
  if (data.checkOnly) return NextResponse.json({ ok: true, bytes });
  const zip = new JSZip();
  for (const [index, file] of media.entries()) {
    const filename = `${index + 1}-${file.fileKey.split("/").pop() || "file"}`;
    // Lazily open one original at a time; do not buffer files or launch all fetches.
    zip.file(filename, Readable.from((async function* () {
      const url = await getDeliveryDownloadUrl(file.fileKey, filename);
      const response = await fetch(url, { signal: req.signal, cache: "no-store" });
      if (!response.ok || !response.body) throw Error("Archive source unavailable");
      const reader = response.body.getReader();
      try { while (true) { const chunk = await reader.read(); if (chunk.done) break; yield chunk.value; } }
      finally { await reader.cancel(); reader.releaseLock(); }
    })()));
  }
  const stream = zip.generateNodeStream({ streamFiles: true, compression: "STORE" }) as unknown as Readable;
  req.signal.addEventListener("abort", () => stream.destroy(), { once: true });
  const filename = String(data.zipFilename || "delivery.zip").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
}
