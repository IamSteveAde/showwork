/** Capture a local video frame. No original-video download or server transcoding. */
export function capturePortfolioPoster(file: File): Promise<Blob | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let finished = false;
    const finish = (blob: Blob | null) => {
      if (finished) return;
      finished = true; clearTimeout(timer);
      video.onloadedmetadata = video.onloadeddata = video.onseeked = video.onerror = null;
      video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url);
      resolve(blob);
    };
    const timer = setTimeout(() => finish(null), 12000);
    const capture = () => {
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
      try {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        const context = canvas.getContext("2d"); if (!context) return finish(null);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => finish(blob && blob.size <= 1024 * 1024 ? blob : null), "image/jpeg", 0.75);
      } catch { finish(null); }
    };
    video.muted = true; video.playsInline = true; video.preload = "auto";
    let seekTime = 0;
    let hasSeeked = false;
    video.onloadedmetadata = () => {
      seekTime = Number.isFinite(video.duration) ? Math.min(1, video.duration / 10) : 0;
      if (seekTime > 0) video.currentTime = seekTime;
    };
    video.onloadeddata = () => { if (!seekTime || hasSeeked) capture(); };
    video.onseeked = () => { hasSeeked = true; capture(); };
    video.onerror = () => finish(null);
    video.src = url;
  });
}

/** Preview failure must never retry or duplicate the already-saved original. */
export async function savePortfolioVideoPoster(file: File, mediaId: string): Promise<boolean> {
  try {
    const poster = await capturePortfolioPoster(file);
    if (!poster) return false;
    const response = await fetch(`/api/portfolio/media/${encodeURIComponent(mediaId)}/poster`, {
      method: "POST", headers: { "Content-Type": "image/jpeg" }, body: poster, signal: AbortSignal.timeout(15000),
    });
    return response.ok;
  } catch { return false; }
}
