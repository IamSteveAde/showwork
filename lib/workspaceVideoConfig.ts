export const WORKSPACE_VIDEO_THRESHOLD = 64 * 1024 * 1024;
export const WORKSPACE_VIDEO_PART_SIZE = 16 * 1024 * 1024;
export const WORKSPACE_VIDEO_MAX_BYTES = 10 * 1024 * 1024 * 1024;
export function resumableWorkspaceVideo(file: { size: number; type: string; name: string }) {
  return file.size >= WORKSPACE_VIDEO_THRESHOLD && (file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(file.name));
}
