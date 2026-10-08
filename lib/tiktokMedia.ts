import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveTikTokProbe, tikTokProbeError } from "@/lib/tiktokProbe";
import { publicUrlFor } from "@/lib/r2";
import type { TikTokCreator } from "@/lib/tiktokSettings";

const run = promisify(execFile);
export type MediaProbe = { format?: { duration?: string; format_name?: string }; streams?: { codec_type?: string; codec_name?: string; width?: number; height?: number; avg_frame_rate?: string; duration?: string }[] };
export function validateTikTokMediaProbe(probe: MediaProbe, size: number, type: string, maxDuration: number) {
  const stream = probe.streams?.find(s => s.codec_type === "video");
  if (!stream || !stream.width || !stream.height) throw new Error("Could not verify this file's dimensions. Upload a supported TikTok file.");
  if (type === "VIDEO") {
    const duration = Number(probe.format?.duration || stream.duration);
    const [numerator, denominator = "1"] = (stream.avg_frame_rate || "").split("/");
    const fps = Number(numerator) / Number(denominator);
    if (!Number.isFinite(duration) || duration <= 0 || duration > maxDuration) throw new Error(`This TikTok account supports videos up to ${maxDuration} seconds. Shorten the video before publishing.`);
    if (!Number.isFinite(fps) || fps < 23 || fps > 60) throw new Error("TikTok videos must have a frame rate between 23 and 60 FPS.");
    if (Math.min(stream.width, stream.height) < 360 || Math.max(stream.width, stream.height) > 4096) throw new Error("TikTok video dimensions must be between 360 and 4096 pixels on each side.");
    if (!["h264", "hevc", "vp8", "vp9"].includes(stream.codec_name || "") || !/(mov|mp4|matroska|webm)/.test(probe.format?.format_name || "")) throw new Error("Use an MP4, MOV or WebM video with H.264, H.265, VP8 or VP9 encoding.");
    if (size > 4 * 1024 ** 3) throw new Error("TikTok videos must be 4 GB or smaller.");
  } else {
    if (!["mjpeg", "webp"].includes(stream.codec_name || "")) throw new Error("TikTok photos must be JPEG or WebP. Convert this image before publishing.");
    if (Math.max(stream.width, stream.height) > 1920 || Math.min(stream.width, stream.height) > 1080) throw new Error("Resize TikTok photos to 1080p or smaller before publishing.");
    if (size > 20 * 1024 ** 2) throw new Error("Each TikTok photo must be 20 MB or smaller.");
  }
}

// Inspect the stored bytes, never browser-submitted duration or file extensions.
export async function validateTikTokMedia(assets: { fileKey: string; mediaType: string }[], creator: TikTokCreator) {
  // Resolve only this runtime's executable. Importing ffprobe-static makes
  // bundlers trace its dynamically selected binaries for every OS/architecture.
  const binary = await resolveTikTokProbe();
  async function inspect(asset: { fileKey: string; mediaType: string }) {
    const url = publicUrlFor(asset.fileKey);
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") throw new Error("TikTok media must use a public HTTPS URL.");
    const head = await fetch(url, { method: "HEAD", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const size = Number(head.headers.get("content-length"));
    if (!head.ok || !Number.isFinite(size) || size <= 0) throw new Error("This media file is not publicly accessible. Upload it again before publishing.");
    if (size > (asset.mediaType === "VIDEO" ? 4 * 1024 ** 3 : 20 * 1024 ** 2)) throw new Error("This media file exceeds TikTok's size limit.");
    let probe: MediaProbe;
    try {
      const { stdout } = await run(binary, ["-v", "error", "-rw_timeout", "10000000", "-protocol_whitelist", "https,http,tls,tcp", "-format_whitelist", "mov,matroska,webm,jpeg_pipe,webp_pipe,image2", "-show_streams", "-show_format", "-of", "json", url], { timeout: 30_000, maxBuffer: 1024 * 1024 });
      probe = JSON.parse(stdout);
    } catch (error) {
      const failure = error as { code?: string | number; killed?: boolean; stderr?: string };
      console.error("TikTok media inspection failed", { code: failure.code, killed: !!failure.killed,
        detail: (failure.stderr || "").replace(/https?:\/\/\S+/g, "[media URL]").slice(-600) });
      throw tikTokProbeError(error);
    }
    validateTikTokMediaProbe(probe, size, asset.mediaType, creator.max_video_post_duration_sec);
  }
  for (let index = 0; index < assets.length; index += 4) await Promise.all(assets.slice(index, index + 4).map(inspect));
}
