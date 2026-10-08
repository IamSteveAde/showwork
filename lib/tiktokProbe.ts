import { access, copyFile, chmod, mkdtemp } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let binaryPromise: Promise<string> | undefined;
let converterPromise: Promise<string> | undefined;
export function resolveTikTokProbe(): Promise<string> {
  if (!binaryPromise) binaryPromise = locateTikTokBinary("probe").catch(error => { binaryPromise = undefined; throw error; });
  return binaryPromise;
}

export function resolveTikTokConverter(): Promise<string> {
  if (!converterPromise) converterPromise = locateTikTokBinary("converter").catch(error => { converterPromise = undefined; throw error; });
  return converterPromise;
}

async function locateTikTokBinary(kind: "probe" | "converter") {
  const name = kind === "probe" ? "ffprobe" : "ffmpeg";
  const relative = kind === "probe"
    ? join("node_modules", "ffprobe-static", "bin", process.platform, process.arch, process.platform === "win32" ? "ffprobe.exe" : "ffprobe")
    : join("node_modules", "ffmpeg-static", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  const roots = new Set([process.env.LAMBDA_TASK_ROOT, process.cwd()].filter((root): root is string => !!root));
  // Next.js can run with a working directory below the Lambda bundle root.
  let parent = process.cwd();
  for (let depth = 0; depth < 6; depth++) { roots.add(parent); parent = join(parent, ".."); }
  for (const root of roots) {
    const binary = join(root, relative);
    try { await access(binary, constants.X_OK); return binary; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EACCES") continue;
      // Some packagers lose executable permissions. The deployment filesystem
      // is read-only, so repair a private temporary copy instead.
      const directory = await mkdtemp(join(tmpdir(), "showwork-probe-"));
      const executable = join(directory, name);
      await copyFile(binary, executable); await chmod(executable, 0o700);
      return executable;
    }
  }
  throw new Error(`Media preparation is unavailable on the server (${kind} missing). Redeploy with the TikTok media binary included.`);
}

export function tikTokProbeError(error: unknown) {
  const failure = error as { code?: string | number; killed?: boolean; signal?: string; stderr?: string };
  if (failure.code === "ENOENT" || failure.code === "EACCES" || failure.code === "ENOEXEC") return new Error("Media inspection is unavailable on the server (probe startup failed). Contact support.");
  if (failure.killed || failure.signal === "SIGTERM") return new Error("Media inspection timed out while reading the uploaded file. Try again or upload a smaller optimized file.");
  const detail = failure.stderr || "";
  if (/HTTP error|Server returned|Connection|TLS|certificate|Network|Protocol .*not on whitelist/i.test(detail)) return new Error("The server could not read the uploaded media for inspection. Check that its public media URL is reachable and try again.");
  return new Error("Could not decode this media file. Use a supported JPEG/WebP photo or MP4/MOV/WebM video and try again.");
}
