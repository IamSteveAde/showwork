const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { load } = require("./helpers/load-typescript.cjs");
const id = "11111111-1111-4111-8111-111111111111",
  partSize = 16 * 1024 * 1024,
  bytes = 64 * 1024 * 1024;
function fixture() {
  const sessions = new Map(),
    receipts = new Map();
  let creates = 0,
    aborts = 0,
    completes = 0,
    reserves = 0,
    object = 0,
    loseAck = false;
  let parts = [];
  let chain = Promise.resolve();
  const db = {
    workspaceVideoUpload: {
      upsert: async ({ where, create }) => {
        if (!sessions.has(where.id))
          sessions.set(where.id, {
            ...create,
            uploadId: null,
            state: "STARTING",
          });
        return { ...sessions.get(where.id) };
      },
      update: async ({ where, data }) => {
        Object.assign(sessions.get(where.id), data);
        return { ...sessions.get(where.id) };
      },
      findMany: async () =>
        [...sessions.values()].filter(
          (s) =>
            !["COMPLETE", "ABORTED"].includes(s.state) &&
            s.expiresAt <= new Date(),
        ),
    },
    contentWorkspaceStorageReservation: {
      findUnique: async ({ where }) => receipts.get(where.id) || null,
    },
    $transaction(run) {
      const next = chain.then(async () => {
        const before = new Map([...sessions].map(([k, v]) => [k, { ...v }]));
        try {
          return await run({
            ...db,
            $queryRaw: async (_, ...values) =>
              sessions.has(values[0]) ? [{ ...sessions.get(values[0]) }] : [],
          });
        } catch (e) {
          sessions.clear();
          for (const [k, v] of before) sessions.set(k, v);
          throw e;
        }
      });
      chain = next.catch(() => {});
      return next;
    },
  };
  const api = load("lib/workspaceVideoUploads.ts", {
    "@/lib/db": { db },
    "@/lib/contentWorkspaceUsage": {
      reserveContentWorkspaceStorage: async (
        owner,
        calendar,
        key,
        size,
        receiptId,
      ) => {
        if (receipts.has(receiptId))
          throw Object.assign(Error("duplicate"), { code: "P2002" });
        reserves++;
        receipts.set(receiptId, {
          id: receiptId,
          creatorId: owner,
          calendarId: calendar,
          fileKey: key,
          bytes: BigInt(size),
          status: "PENDING",
          expiresAt: new Date(Date.now() + 3600000),
        });
        return { allowed: true, reservationId: receiptId };
      },
    },
    "@/lib/r2": {
      createMultipartUpload: async () => {
        creates++;
        return "storage-upload";
      },
      abortMultipartUpload: async () => {
        aborts++;
      },
      getPresignedPartUploadUrl: async (k, u, n) => "part:" + n,
      listWorkspaceVideoParts: async () => {
        if (object)
          throw Object.assign(Error("assembled"), { name: "NoSuchUpload" });
        return parts;
      },
      getObjectSize: async () => object,
      completeMultipartUpload: async () => {
        completes++;
        object = bytes;
        if (loseAck) {
          loseAck = false;
          throw Error("lost acknowledgement");
        }
      },
    },
  });
  const input = {
    calendarId: "w",
    postId: "p",
    ownerId: "owner",
    actorId: "member",
    body: {
      action: "start",
      sessionId: id,
      fileSize: bytes,
      contentType: "video/mp4",
      fingerprint: "a".repeat(64),
    },
  };
  return {
    api,
    input,
    sessions,
    receipts,
    start: () => api.startWorkspaceVideo(input),
    action: (action, extra = {}) =>
      api.workspaceVideoAction({
        ...input,
        body: { sessionId: id, action, ...extra },
      }),
    allParts: () => {
      parts = Array.from({ length: 4 }, (_, i) => ({
        partNumber: i + 1,
        size: partSize,
        etag: "etag" + i,
      }));
    },
    parts: (value) => (parts = value),
    loseAck: () => (loseAck = true),
    counts: () => ({ creates, reserves, aborts, completes }),
  };
}
test("concurrent starts reserve once and reuse the same durable storage session", async () => {
  const f = fixture();
  const [a, b] = await Promise.all([f.start(), f.start()]);
  assert.equal(a.uploadId, b.uploadId);
  assert.deepEqual(f.counts(), {
    creates: 1,
    reserves: 1,
    aborts: 0,
    completes: 0,
  });
});
test("session access is bound to workspace, post, uploader, owner and file identity", async () => {
  const f = fixture();
  await f.start();
  for (const field of ["calendarId", "postId", "actorId", "ownerId"])
    await assert.rejects(
      f.api.workspaceVideoAction({
        ...f.input,
        [field]: "foreign",
        body: { action: "status", sessionId: id },
      }),
      /not found/,
    );
  await assert.rejects(
    f.api.startWorkspaceVideo({
      ...f.input,
      body: { ...f.input.body, fingerprint: "b".repeat(64) },
    }),
    /another file/,
  );
});
test("only bounded valid chunk numbers are signed; missing or wrong-sized chunks cannot complete", async () => {
  const f = fixture();
  await f.start();
  for (const numbers of [[0], [5], [1, 1], [1, 2, 3, 4], ["1"]])
    await assert.rejects(f.action("sign", { partNumbers: numbers }), /Invalid/);
  assert.deepEqual(
    (await f.action("sign", { partNumbers: [1, 2] })).uploadUrls,
    { 1: "part:1", 2: "part:2" },
  );
  await assert.rejects(f.action("finish"), /missing/);
  f.parts([{ partNumber: 1, size: 1, etag: "bad" }]);
  await assert.rejects(f.action("finish"), /invalid/);
  assert.equal(f.counts().completes, 0);
});
test("completion acknowledgement loss is recovered from actual storage without assembling twice", async () => {
  const f = fixture();
  await f.start();
  f.allParts();
  f.loseAck();
  await assert.rejects(f.action("finish"), /acknowledgement/);
  assert.equal((await f.action("status")).assembled, true);
  assert.equal((await f.action("finish")).assembled, true);
  assert.equal(f.counts().completes, 1);
});
test("cancel prevents future signing; completed receipts cannot be cancelled; expiry blocks resume", async () => {
  const f = fixture();
  await f.start();
  assert.equal((await f.action("abort")).aborted, true);
  await assert.rejects(
    f.action("sign", { partNumbers: [1] }),
    /expired|cancelled/,
  );
  const g = fixture();
  await g.start();
  g.receipts.get(id).status = "COMPLETED";
  await assert.rejects(g.action("abort"), /already saved/);
  g.receipts.get(id).status = "PENDING";
  g.sessions.get(id).expiresAt = new Date(0);
  await assert.rejects(g.action("status"), /expired/);
});
test("cleanup aborts orphan sessions even after workspace receipts have been deleted, and retains saved originals", async () => {
  const f = fixture();
  await f.start();
  f.sessions.get(id).expiresAt = new Date(0);
  f.receipts.clear();
  assert.equal((await f.api.cleanupWorkspaceVideoUploads()).aborted, 1);
  assert.equal(f.counts().aborts, 1);
  const g = fixture();
  await g.start();
  g.sessions.get(id).expiresAt = new Date(0);
  g.receipts.get(id).status = "COMPLETED";
  await g.api.cleanupWorkspaceVideoUploads();
  assert.equal(g.counts().aborts, 0);
  assert.equal(g.sessions.get(id).state, "COMPLETE");
});
test("multipart route rejects unauthenticated and unauthorized callers before starting storage work", async () => {
  for (const [actor, allowed, status] of [
    [null, false, 401],
    [{ id: "outsider" }, false, 403],
  ]) {
    const { POST } = load(
      "app/api/calendars/[id]/posts/[postId]/video-upload/route.ts",
      {
        "@/lib/auth": { getCurrentCreator: async () => actor },
        "@/lib/calendarPermissions": {
          hasCalendarPermission: async () => allowed,
        },
        "@/lib/db": { db: {} },
        "@/lib/workspaceVideoUploads": {},
      },
    );
    const response = await POST(
      new Request("http://localhost/video", {
        method: "POST",
        body: JSON.stringify({ action: "start" }),
      }),
      { params: Promise.resolve({ id: "w", postId: "p" }) },
    );
    assert.equal(response.status, status);
  }
});
test("actual migration permits poster-only metadata updates without review changes but retains creative-change trigger", async () => {
  const {
    PGlite,
  } = require("/private/tmp/showwork-workflow-qa/node_modules/@electric-sql/pglite");
  const pg = new PGlite();
  try {
    await pg.exec(
      `CREATE TABLE "CalendarPostAsset"(id TEXT PRIMARY KEY,"postId" TEXT,"fileKey" TEXT);CREATE TABLE changes(id TEXT);CREATE FUNCTION calendar_post_review_media_changed() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO changes VALUES ('changed');RETURN NULL;END $$;CREATE TRIGGER calendar_post_asset_review AFTER INSERT OR UPDATE OR DELETE ON "CalendarPostAsset" FOR EACH ROW EXECUTE FUNCTION calendar_post_review_media_changed();`,
    );
    await pg.exec(
      fs.readFileSync(
        "prisma/migrations/20261028150000_workspace_video_uploads/migration.sql",
        "utf8",
      ),
    );
    await pg.exec(
      `INSERT INTO "CalendarPostAsset" VALUES ('a','p','video',NULL);DELETE FROM changes;UPDATE "CalendarPostAsset" SET "posterFileKey"='poster' WHERE id='a';`,
    );
    assert.equal(
      (await pg.query("SELECT count(*)::int AS n FROM changes")).rows[0].n,
      0,
    );
    await pg.exec(
      `UPDATE "CalendarPostAsset" SET "fileKey"='changed-video' WHERE id='a';`,
    );
    assert.equal(
      (await pg.query("SELECT count(*)::int AS n FROM changes")).rows[0].n,
      1,
    );
  } finally {
    await pg.close();
  }
});
test("poster endpoint saves a bounded preview against the exact video without modifying the reviewed post", async () => {
  const sharp = require("sharp");
  const input = await sharp({
    create: { width: 32, height: 20, channels: 3, background: "#2478ff" },
  })
    .jpeg()
    .toBuffer();
  const asset = {
    id: "a",
    postId: "p",
    fileKey: "calendars/w/p/video.mp4",
    mediaType: "VIDEO",
    posterFileKey: null,
  };
  let put = 0,
    updates = 0;
  const tx = {
    $queryRaw: async () => [],
    calendarPostAsset: {
      findFirst: async () => asset,
      update: async ({ data }) => {
        updates++;
        Object.assign(asset, data);
      },
    },
  };
  const { POST } = load(
    "app/api/calendars/[id]/posts/[postId]/assets/[assetId]/poster/route.ts",
    {
      "@/lib/auth": { getCurrentCreator: async () => ({ id: "member" }) },
      "@/lib/calendarPermissions": { hasCalendarPermission: async () => true },
      "@/lib/db": {
        db: {
          calendarPostAsset: { findFirst: async () => ({ ...asset }) },
          $transaction: async (run) => run(tx),
        },
      },
      "@/lib/workspaceStorageCleanup": {
        lockWorkspaceFileKeys: async () => {},
      },
      "@/lib/r2": {
        putWorkspaceVideoPoster: async (key, body) => {
          put++;
          assert.match(key, /video-posters\/[a-f0-9]{64}\.jpg$/);
          assert.ok(body.length < 1024 * 1024);
        },
        publicUrlFor: (key) => "https://storage.invalid/" + key,
      },
    },
  );
  const request = (key) =>
    new Request("http://localhost/poster", {
      method: "POST",
      headers: { "Content-Type": "image/jpeg", "x-upload-file-key": key },
      body: input,
    });
  const params = {
    params: Promise.resolve({ id: "w", postId: "p", assetId: "a" }),
  };
  assert.equal((await POST(request("foreign"), params)).status, 404);
  assert.equal((await POST(request(asset.fileKey), params)).status, 200);
  assert.equal(put, 1);
  assert.equal(updates, 1);
  assert.equal((await POST(request(asset.fileKey), params)).status, 200);
  assert.equal(put, 1);
  assert.equal(updates, 1);
});
