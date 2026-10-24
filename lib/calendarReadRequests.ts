"use client";
import { calendarMutationFetch } from "@/lib/publishing/clientRequests";

// Share concurrent reads only. Completed results are never cached, so refreshes
// after a connection change always read the server's current state.
const pending = new Map<string, Promise<{ ok: boolean; status: number; data: any }>>();
export function readCalendarJson(url: string, fresh = false) {
  const existing = pending.get(url);
  if (existing && !fresh) return existing;
  const request = (async () => {
    const response = await calendarMutationFetch(url, { cache: "no-store" });
    return { ok: response.ok, status: response.status, data: await response.json() };
  })();
  pending.set(url, request);
  void request.finally(() => { if (pending.get(url) === request) pending.delete(url); }).catch(() => {});
  return request;
}
