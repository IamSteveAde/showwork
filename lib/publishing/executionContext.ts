import { AsyncLocalStorage } from "node:async_hooks";

type Context = {
  signal: AbortSignal;
  postId?: string;
  jobId?: string;
  workerToken?: string | null;
  beforePublication?: () => void | Promise<void>;
  publicationResponse?: (value: { rejected: boolean; status: number; reference: string | null }) => void;
};
const execution = new AsyncLocalStorage<Context>();
export function withPublishingExecution<T>(context: Context, operation: () => Promise<T>) { return execution.run(context, operation); }
export const currentPublishingSignal = () => execution.getStore()?.signal;
export const currentPublishingPostId = () => execution.getStore()?.postId;
export const currentPublishingOwner = () => {
  const value = execution.getStore();
  return value?.jobId && value.workerToken ? { id: value.jobId, token: value.workerToken } : null;
};

/** Existing callers outside a durable worker use the original fetch behavior.
 * No request headers, bodies, tokens or customer content are recorded here. */
export async function publishingFetch(input: string | URL | Request, init?: RequestInit) {
  const context = execution.getStore();
  if (!context) return globalThis.fetch(input, init);
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const body = typeof init?.body === "string" ? init.body : "";
  const publication = method === "POST" && (
    url.hostname === "graph.facebook.com" && (url.pathname.endsWith("/media_publish") || url.pathname.endsWith("/feed") || url.pathname.endsWith("/video_reels") && body.includes('"finish"')) ||
    url.hostname === "graph-video.facebook.com" && url.pathname.endsWith("/videos") ||
    url.hostname === "api.x.com" && url.pathname === "/2/tweets" ||
    url.hostname === "api.linkedin.com" && url.pathname === "/rest/posts" ||
    url.hostname === "open.tiktokapis.com" && /\/post\/publish\/(content|video)\/init\/$/.test(url.pathname)
  );
  context.signal.throwIfAborted();
  if (publication) await context.beforePublication?.();
  const originalSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
  const response = await globalThis.fetch(input, { ...init, signal: originalSignal ? AbortSignal.any([context.signal, originalSignal]) : context.signal });
  if (publication) {
    const value = await response.clone().json().catch(() => null);
    const providerError = value?.error && (url.hostname !== "open.tiktokapis.com" || value.error.code !== "ok");
    const reference = response.headers.get("x-restli-id") ?? value?.data?.publish_id ?? value?.post_id ?? value?.data?.id ?? value?.id ?? null;
    context.publicationResponse?.({ rejected: response.status < 500 && (!response.ok || !!providerError), status: response.status, reference: typeof reference === "string" ? reference : null });
  }
  return response;
}
