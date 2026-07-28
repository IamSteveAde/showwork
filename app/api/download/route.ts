import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";

/**
 * Proxies a file download through our own server. Two jobs, both
 * important:
 *
 * 1. CORS/reliability — the browser only ever talks to our domain; our
 *    server does the cross-origin fetch to R2, sidestepping any
 *    browser-side CORS/caching issues entirely.
 *
 * 2. Real payment enforcement — this looks the file up by its mediaId
 *    (never a client-supplied URL) and checks the *actual, current*
 *    deliveryStatus in the database before serving a single byte. A
 *    person can't bypass this by editing the download URL, calling the
 *    API directly, or disabling JavaScript — the check happens here,
 *    server-side, every time, regardless of what the UI shows.
 *
 * Honest limit, stated plainly: this stops the download/save action
 * itself. It cannot stop someone from screen-recording a video that's
 * already playing on their screen, or screenshotting a photo — no
 * website can prevent that, this one included.
 */
export async function GET(req: NextRequest) {
  const mediaId = req.nextUrl.searchParams.get("mediaId");
  if (!mediaId) {
    return NextResponse.json({ error: "Missing mediaId" }, { status: 400 });
  }

  const media = await db.media.findUnique({
    where: { id: mediaId },
    include: { project: true },
  });
  if (!media) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (media.project.deliveryStatus !== "PAID") {
    return NextResponse.json(
      {
        error: "Payment confirmation required before this file can be downloaded.",
        paymentRequired: true,
      },
      { status: 402 } // 402 Payment Required — the exact HTTP status built for this
    );
  }

  const fileUrl = publicUrlFor(media.fileKey);
  const filename = media.fileKey.split("/").pop() ?? "file";

  let upstream: Response;
  try {
    upstream = await fetch(fileUrl);
  } catch (err) {
    console.error("Download proxy fetch failed:", err);
    return NextResponse.json({ error: "Couldn't reach file storage" }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `File storage returned ${upstream.status}` },
      { status: 502 }
    );
  }

  const safeFilename = filename.replace(/["\r\n]/g, "");

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
      ...(upstream.headers.get("content-length")
        ? { "Content-Length": upstream.headers.get("content-length")! }
        : {}),
    },
  });
}