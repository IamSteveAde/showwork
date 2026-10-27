import { getFileContentType } from "@/lib/mediaFileTypes";
export function detectLocalFileAspectRatio(file: File): Promise<number | null> {
  return new Promise(resolve => {
    if (!/^(image|video)\//.test(getFileContentType(file))) return resolve(null);
    const url = URL.createObjectURL(file);
    const video = getFileContentType(file).startsWith("video/") ? document.createElement("video") : null;
    const image = video ? null : new Image();
    let done = false;
    const finish = (ratio: number | null) => {
      if (done) return; done = true; clearTimeout(timer); URL.revokeObjectURL(url);
      if (video) { video.onloadedmetadata = video.onerror = null; video.removeAttribute("src"); video.load(); }
      if (image) { image.onload = image.onerror = null; image.src = ""; }
      resolve(ratio && Number.isFinite(ratio) && ratio > 0 ? ratio : null);
    };
    const timer = setTimeout(() => finish(null), 8000);
    if (video) {
      video.preload = "metadata";
      video.onloadedmetadata = () => finish(video.videoHeight ? video.videoWidth / video.videoHeight : null);
      video.onerror = () => finish(null); video.src = url;
    } else if (image) {
      image.onload = () => finish(image.naturalHeight ? image.naturalWidth / image.naturalHeight : null);
      image.onerror = () => finish(null); image.src = url;
    }
  });
}
