/**
 * Downloads a single file by navigating to our own server-side proxy
 * route, which sets a real Content-Disposition header. This is a plain
 * page navigation, not a JavaScript fetch of cross-origin bytes — so
 * CORS is never a factor here at all, regardless of R2/CDN
 * configuration on the file-storage side.
 */
export async function downloadFile(url: string, filename: string) {
  const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;

  const a = document.createElement("a");
  a.href = proxyUrl;
  // No `download` attribute needed — the server's Content-Disposition
  // header is what actually triggers the save, and does so reliably
  // even for file types a browser would otherwise just open inline.
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Downloads several files bundled into a single .zip. Each file is
 * fetched through our own same-origin proxy route (not directly from
 * R2), so this fetch is same-origin from the browser's point of view —
 * CORS never applies to a same-origin request, which is what makes
 * this reliable regardless of the file storage's own CORS setup.
 *
 * Note: this happens entirely in the browser's memory. It's fine for
 * typical photo sets and a handful of short videos, but a very large
 * batch of multi-GB videos could strain a phone's or laptop's memory.
 * If that becomes a real problem, the proper fix is a server-side
 * streaming zip instead — worth revisiting if creators start hitting it.
 */
export async function downloadAllAsZip(
  items: { url: string; filename: string }[],
  zipFilename: string,
  onProgress?: (done: number, total: number) => void
) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  for (let i = 0; i < items.length; i++) {
    const { url, filename } = items[i];
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`Failed to fetch ${filename} (${res.status})`);
    const blob = await res.blob();
    zip.file(filename, blob);
    onProgress?.(i + 1, items.length);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const blobUrl = URL.createObjectURL(zipBlob);

  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

/**
 * Pulls a reasonably clean filename out of an R2 object URL, stripping
 * the timestamp prefix we add at upload time so downloaded files don't
 * look like "1783607834925-Screenshot_2026-07-09.png" to the client.
 */
export function filenameFromUrl(url: string): string {
  const last = decodeURIComponent(url.split("/").pop() ?? "file");
  return last.replace(/^\d+-/, "");
}