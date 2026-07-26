import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies a file download through our own server instead of having the
 * browser fetch it directly from R2. CORS is purely a browser concept —
 * it never applies to server-to-server requests — so routing through
 * here sidesteps CORS, custom-domain, and edge-cache header issues
 * entirely, regardless of their root cause. The browser only ever talks
 * to our own domain; this endpoint does the cross-origin fetch itself.
 *
 * Also sets a real Content-Disposition header, so simply navigating to
 * this URL (a plain <a href>, no JS fetch/blob needed) triggers a native
 * browser download with the correct filename — that part alone is not
 * subject to CORS at all, since it's a normal page navigation, not a
 * script reading cross-origin bytes.
 */
export async function GET(req: NextRequest) {
  const fileUrl = req.nextUrl.searchParams.get("url");
  const filename = req.nextUrl.searchParams.get("filename") || "file";

  if (!fileUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  // Only ever proxy our own R2 bucket — never an arbitrary URL. Without
  // this check, this endpoint would be an open proxy anyone could point
  // at any address (a real security risk, not just a nicety).
  const allowedPrefix = process.env.R2_PUBLIC_URL;
  if (!allowedPrefix || !fileUrl.startsWith(allowedPrefix)) {
    return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
  }

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