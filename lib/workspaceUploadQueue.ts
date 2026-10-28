"use client";
import { resumableWorkspaceVideo } from "@/lib/workspaceVideoConfig";

export type UploadState =
  "paused" | "queued" | "uploading" | "saving" | "failed" | "cancelled" | "complete";
export type UploadRow = {
  id: string;
  workspaceId: string;
  name: string;
  size: number;
  video: boolean;
  resumable: boolean;
  state: UploadState;
  percent: number;
  error?: string;
};
export type UploadTaskContext = {
  signal: AbortSignal;
  progress: (percent: number) => void;
  saving: () => void;
  onCancel: (release: () => Promise<void>) => void;
  finalize: <T>(resource: string, run: () => Promise<T>) => Promise<T>;
  /** Successful steps survive retries; failed steps are never cached. */
  step: <T>(name: string, run: () => Promise<T>) => Promise<T>;
};
type Task = {
  group?: string;
  row: UploadRow;
  run: (context: UploadTaskContext) => Promise<unknown>;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  steps: Map<string, unknown>;
  controller?: AbortController;
  release?: () => Promise<void>;
};

export class WorkspaceUploadQueue {
  private tasks: Task[] = [];
  private listeners = new Set<() => void>();
  private snapshot: UploadRow[] = [];
  private finalizers = new Map<string, Promise<unknown>>();
  private active = 0;
  private videos = 0;
  private groups = new Set<string>();
  constructor(private limit = 3) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.snapshot;
  private emit() {
    this.snapshot = this.tasks.map((task) => ({ ...task.row }));
    this.listeners.forEach((listener) => listener());
  }
  enqueue<T>(
    workspaceId: string,
    file: File,
    run: (context: UploadTaskContext) => Promise<T>,
    serialGroup?: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.tasks.push({
        group: serialGroup ? `${workspaceId}:${serialGroup}` : undefined,
        row: {
          id: crypto.randomUUID(),
          workspaceId,
          name: file.name,
          size: file.size,
          video:
            file.type.startsWith("video/") ||
            /\.(mp4|mov|webm|m4v|avi)$/i.test(file.name),
          resumable: resumableWorkspaceVideo(file),
          state: "queued",
          percent: 0,
        },
        run,
        resolve,
        reject,
        steps: new Map(),
      });
      this.emit();
      this.pump();
    });
  }
  retry(id: string) {
    const task = this.tasks.find((t) => t.row.id === id);
    if (task?.row.state === "failed") {
      task.row.state = "queued";
      task.row.error = undefined;
      this.emit();
      this.pump();
    }
  }
  pause(id: string) {
    const task = this.tasks.find(t => t.row.id === id);
    if (!task?.row.resumable || !["queued", "uploading"].includes(task.row.state)) return;
    task.row.state = "paused";
    task.controller?.abort();
    this.emit();
  }
  resume(id: string) {
    const task = this.tasks.find(t => t.row.id === id);
    if (task?.row.state !== "paused") return;
    task.row.state = "queued";
    this.emit(); this.pump();
  }
  cancel(id: string) {
    const task = this.tasks.find((t) => t.row.id === id);
    // Once finalization starts it may have committed server-side. Let it finish.
    if (!task || !["queued", "uploading", "failed", "paused"].includes(task.row.state))
      return;
    task.row.state = "cancelled";
    task.controller?.abort();
    this.releaseCancelled(task);
    task.steps.clear();
    task.run = async () => undefined;
    task.reject(new DOMException("Upload cancelled", "AbortError"));
    this.emit();
  }
  private releaseCancelled(task: Task) {
    const release = task.release;
    task.release = undefined;
    if (!release) return;
    Promise.resolve()
      .then(release)
      .catch((error) => {
        task.row.error =
          error instanceof Error
            ? error.message
            : "Storage release was not confirmed. Automatic expiry cleanup will retry.";
        this.emit();
      });
  }
  clearFinished(workspaceId: string) {
    this.tasks = this.tasks.filter(
      (t) =>
        t.row.workspaceId !== workspaceId ||
        !["complete", "cancelled"].includes(t.row.state),
    );
    this.emit();
  }
  private pump() {
    while (this.active < this.limit) {
      const task = this.tasks.find(
        (t) =>
          t.row.state === "queued" && !t.controller &&
          (!t.row.video || this.videos === 0) &&
          (!t.group || !this.groups.has(t.group)),
      );
      if (!task) return;
      if (task.group) this.groups.add(task.group);
      this.active++;
      if (task.row.video) this.videos++;
      task.row.state = "uploading";
      task.controller = new AbortController();
      this.emit();
      const signal = task.controller.signal;
      const context: UploadTaskContext = {
        signal,
        onCancel: (release) => {
          task.release = release;
          if (task.row.state === "cancelled") this.releaseCancelled(task);
        },
        progress: (percent) => {
          task.row.percent = Math.min(100, Math.max(0, percent));
          this.emit();
        },
        saving: () => {
          if (signal.aborted)
            throw new DOMException("Upload cancelled", "AbortError");
          task.row.state = "saving";
          this.emit();
        },
        finalize: async (resource, run) => {
          context.saving();
          const key = `${task.row.workspaceId}:${resource}`;
          const previous = this.finalizers.get(key) ?? Promise.resolve();
          const current = previous.catch(() => undefined).then(run);
          this.finalizers.set(key, current);
          try {
            return await current;
          } finally {
            if (this.finalizers.get(key) === current)
              this.finalizers.delete(key);
          }
        },
        step: async (name, run) => {
          if (signal.aborted)
            throw new DOMException("Upload cancelled", "AbortError");
          if (task.steps.has(name)) return task.steps.get(name) as never;
          const result = await run();
          task.steps.set(name, result);
          return result;
        },
      };
      Promise.resolve()
        .then(() => task.run(context))
        .then((result) => {
          if (task.row.state === "cancelled" || signal.aborted) return;
          task.row.state = "complete";
          task.row.percent = 100;
          task.resolve(result);
          task.release = undefined;
          task.steps.clear();
          task.run = async () => undefined;
        })
        .catch((error) => {
          if (task.row.state !== "cancelled" && task.row.state !== "paused" && !(signal.aborted && task.row.state === "queued")) {
            task.row.state = "failed";
            task.row.error =
              error instanceof Error ? error.message : "Upload failed";
          }
          // Failed tasks keep their receipt and promise until explicitly retried or cancelled.
        })
        .finally(() => {
          this.active--;
          if (task.group) this.groups.delete(task.group);
          if (task.row.video) this.videos--;
          task.controller = undefined;
          this.emit();
          this.pump();
        });
    }
  }
}
export const workspaceUploadQueue = new WorkspaceUploadQueue();
