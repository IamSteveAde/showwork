/**
 * Downloads a single file by fetching it as a blob first, rather than
 * just pointing an <a download> tag at the URL directly. This matters
 * because our files live on a different origin (R2) — browsers often
 * ignore the `download` attribute on cross-origin links and just open
 * the file in a new tab instead. Fetching it ourselves and creating a
 * local blob: URL sidesteps that entirely, regardless of file type.
 */
export async function downloadFile(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

/**
 * Downloads several files bundled into a single .zip. Fetches each file
 * as a blob, adds it to a zip in memory, then downloads the finished zip.
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
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${filename}: ${res.status}`);
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