const { test } = require("node:test");
const assert = require("node:assert/strict");
const { webcrypto } = require("node:crypto");
const { load } = require("./helpers/load-typescript.cjs");
const size = 64 * 1024 * 1024,
  partSize = 16 * 1024 * 1024;
function context() {
  const steps = new Map();
  return {
    signal: new AbortController().signal,
    progress() {},
    onCancel(fn) {
      this.cancel = fn;
    },
    step: async (name, run) => {
      if (!steps.has(name)) steps.set(name, await run());
      return steps.get(name);
    },
  };
}
function fixture() {
  const store = new Map();
  global.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  let started = false,
    assembled = false,
    finished = 0,
    starts = 0,
    losePart = 2;
  const saved = new Map(),
    puts = [];
  const file = {
    name: "video.mp4",
    type: "video/mp4",
    size,
    lastModified: 123,
    slice: (start, end) =>
      new Blob([new Uint8Array(Math.min(end ?? size, size) - start)]),
  };
  const client = load("lib/workspaceVideoClient.ts", {
    "@/lib/publishing/clientRequests": {
      calendarMutationFetch: async (_url, options) => {
        const body = JSON.parse(options.body);
        if (body.action === "start") {
          started = true;
          starts++;
          return Response.json({
            sessionId: body.sessionId,
            reservationId: body.sessionId,
            fileKey: "calendars/w/p/video.mp4",
            partSize,
          });
        }
        if (body.action === "status") {
          if (!started)
            return Response.json({ error: "not found" }, { status: 404 });
          return Response.json({
            assembled,
            parts: [...saved].map(([partNumber, size]) => ({
              partNumber,
              size,
            })),
            fileKey: "calendars/w/p/video.mp4",
            reservationId: body.sessionId,
            partSize,
          });
        }
        if (body.action === "sign")
          return Response.json({
            uploadUrls: Object.fromEntries(
              body.partNumbers.map((n) => [n, "part:" + n]),
            ),
          });
        if (body.action === "finish") {
          assembled = true;
          finished++;
          return Response.json({ assembled: true });
        }
        if (body.action === "abort") return Response.json({ aborted: true });
        throw Error("Unexpected request");
      },
    },
    "@/lib/uploadClient": {
      putFileWithProgress: async (url, blob, options) => {
        const n = Number(url.split(":")[1]);
        puts.push(n);
        saved.set(n, blob.size);
        options.onProgress({ loaded: blob.size });
        if (n === losePart) {
          losePart = 0;
          throw Error("lost chunk acknowledgement");
        }
      },
    },
  });
  return {
    client,
    file,
    store,
    puts,
    starts: () => starts,
    finished: () => finished,
  };
}
test("interrupted video resumes from authoritative uploaded chunks and survives a fresh task/page context", async () => {
  const f = fixture();
  await assert.rejects(
    f.client.transferWorkspaceVideo("w", "p", f.file, context(), () => {}),
    /acknowledgement/,
  );
  assert.deepEqual(f.puts, [1, 2]);
  // A new task has no memory checkpoints, matching a page refresh and same-file selection.
  const result = await f.client.transferWorkspaceVideo(
    "w",
    "p",
    f.file,
    context(),
    () => {},
  );
  assert.deepEqual(f.puts, [1, 2, 3, 4]);
  assert.equal(f.starts(), 1);
  await result.finish();
  assert.equal(f.finished(), 1);
  result.forget();
  assert.equal(f.store.size, 0);
});
test("preview capture failure never retries or rejects registration of the original video", async () => {
  let captures = 0;
  const client = load("lib/workspaceVideoClient.ts", {
    "@/lib/portfolioVideoPoster": {
      capturePortfolioPoster: async () => {
        captures++;
        return null;
      },
    },
    "@/lib/publishing/clientRequests": {},
    "@/lib/uploadClient": {},
  });
  assert.equal(
    client.saveWorkspaceVideoPreview({}, "w", "p", {
      id: "a",
      fileKey: "video",
    }),
    undefined,
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(captures, 1);
});

test('small-file registration retry keeps its successful transfer checkpoint',async()=>{
  let prepares=0,puts=0,saves=0;
  const file={name:'photo.jpg',type:'image/jpeg',size:10};
  const client=load('lib/workspaceVideoClient.ts',{
    '@/lib/publishing/clientRequests':{calendarMutationFetch:async(url)=>{
      if(url.endsWith('upload-presign')){prepares++;return Response.json({uploadUrl:'upload',fileKey:'calendars/w/p/photo.jpg',reservationId:'receipt'});}
      if(url.endsWith('upload-complete')){saves++;return saves===1?Response.json({error:'Temporary save failure'},{status:503}):Response.json({post:{assets:[{id:'a',fileKey:'calendars/w/p/photo.jpg'}]}});}
      throw Error('Unexpected request');
    }},
    '@/lib/uploadClient':{putFileWithProgress:async()=>{puts++;}},
    '@/lib/workspaceUploadCancellation':{cancelWorkspaceUpload:async()=>{}},
  });
  const task=context();task.finalize=async(_key,run)=>run();
  await assert.rejects(client.uploadWorkspaceAsset('w','p',file,task,()=>{}),/Temporary/);
  assert.equal((await client.uploadWorkspaceAsset('w','p',file,task,()=>{})).assets.length,1);
  assert.deepEqual([prepares,puts,saves],[1,1,2]);
});
