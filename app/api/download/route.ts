import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDeliveryDownloadUrl } from "@/lib/r2";
import { deliveryAccess } from "@/lib/deliveryAccess";
export async function GET(req: NextRequest) {
  const mediaId = req.nextUrl.searchParams.get("mediaId");
  if (!mediaId) return NextResponse.json({ error: "Missing mediaId" }, { status: 400 });
  const media = await db.media.findUnique({ where: { id: mediaId }, include: { project: true } });
  if (!media || media.project.deletedAt) return NextResponse.json({ error: "File not found" }, { status: 404 });
  if (!await deliveryAccess(media.project)) return NextResponse.json({ error: "Unlock this delivery before downloading" }, { status: 403 });
  if (media.project.deliveryStatus !== "PAID") return NextResponse.json({ error: "Payment confirmation required before this file can be downloaded.", paymentRequired: true }, { status: 402 });
  const filename = media.fileKey.split("/").pop() || "file";
  const url = await getDeliveryDownloadUrl(media.fileKey, filename);
  const response = req.nextUrl.searchParams.get("ticket") === "1" ? NextResponse.json({ url, filename }) : NextResponse.redirect(url, 307);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
