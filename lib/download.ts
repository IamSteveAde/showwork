/** Authorize first, then let the browser's native download manager stream the file. */
export async function downloadFile(mediaId: string) {
  const response = await fetch(`/api/download?mediaId=${encodeURIComponent(mediaId)}&ticket=1`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || "Download failed");
  const a = document.createElement("a");
  a.href = data.url; a.rel = "noreferrer"; a.download = data.filename;
  document.body.appendChild(a); a.click(); a.remove();
}

/** Bounded archives stream from the server; original files never accumulate in browser memory. */
export async function downloadAllAsZip(
  items: { mediaId: string }[],
  zipFilename: string,
  onProgress?: (done: number, total: number) => void
) {
  const response = await fetch("/api/download/archive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, zipFilename, checkOnly: true }) });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || "Could not prepare download");
  const form = document.createElement("form");
  form.method = "POST"; form.action = "/api/download/archive";
  for (const [name,value] of Object.entries({ items: JSON.stringify(items), zipFilename })) {
    const input = document.createElement("input"); input.type = "hidden"; input.name = name; input.value = value; form.appendChild(input);
  }
  document.body.appendChild(form); form.submit(); form.remove();
  onProgress?.(items.length, items.length);
}
