import { AsyncLocalStorage } from "node:async_hooks";

const timings = new AsyncLocalStorage<Map<string, number>>();

/** Request-scoped measurements only: no IDs, filenames, URLs, or credentials. */
export async function measureUploadStage<T>(stage: string, operation: () => Promise<T>): Promise<T> {
  const active = timings.getStore();
  if (!active) return operation();
  const start = performance.now();
  try { return await operation(); }
  finally { active.set(stage, (active.get(stage) ?? 0) + performance.now() - start); }
}

export async function timeWorkspaceUpload<T extends Response>(operation: () => Promise<T>): Promise<T> {
  const stages = new Map<string, number>();
  const start = performance.now();
  return timings.run(stages, async () => {
    let status = 500;
    try {
      const response = await operation();
      status = response.status;
      stages.set("total", performance.now() - start);
      response.headers.set("Server-Timing", Array.from(stages, ([stage, ms]) => `${stage};dur=${ms.toFixed(1)}`).join(", "));
      return response;
    } finally {
      stages.set("total", performance.now() - start);
      if (process.env.WORKSPACE_UPLOAD_TIMING_LOGS === "1") {
        console.info("WORKSPACE_UPLOAD_TIMING", { status,
          stagesMs: Object.fromEntries(Array.from(stages, ([stage, ms]) => [stage, Math.round(ms)])),
        });
      }
    }
  });
}
