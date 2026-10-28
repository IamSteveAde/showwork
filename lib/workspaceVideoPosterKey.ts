import { createHash } from "node:crypto";
export function workspaceVideoPosterKey(fileKey: string): string | null {
  const match = /^calendars\/([a-zA-Z0-9-]+)\//.exec(fileKey);
  if (!match || fileKey.includes('/video-posters/')) return null;
  return `calendars/${match[1]}/video-posters/${createHash('sha256').update(fileKey).digest('hex')}.jpg`;
}
