"use strict";

// workers/publishing/status.ts
var preparationStatus = Object.freeze({
  state: "preparation-only",
  publishingEnabled: false,
  databaseConnected: false,
  runtimeImplemented: false
});

// lib/publishing/deploymentReadiness.ts
function validateDisabledPublishingDeployment(value) {
  const v = value;
  const keys = ["version", "publishingEnabled", "owner", "protocol", "schema", "databasePoolSize", "workerConcurrency", "journal", "media", "metaVersion", "linkedinVersion", "reconciliationIntervalMs"];
  if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).sort().join() !== keys.sort().join() || v.version !== 1 || v.publishingEnabled !== false || v.owner !== "VPS" || v.protocol !== "CANONICAL" || !/^[a-z][a-z0-9_]{0,62}$/.test(v.schema) || !Number.isInteger(v.databasePoolSize) || v.databasePoolSize < 1 || v.databasePoolSize > 5 || !Number.isInteger(v.workerConcurrency) || v.workerConcurrency < 1 || v.workerConcurrency > 3 || v.workerConcurrency > v.databasePoolSize || v.journal !== "shared-object-storage" || v.media !== "versioned-object-storage" || !/^v\d+\.\d+$/.test(v.metaVersion) || !/^\d{6}$/.test(v.linkedinVersion) || !Number.isInteger(v.reconciliationIntervalMs) || v.reconciliationIntervalMs < 1e3 || v.reconciliationIntervalMs > 6e4) throw Error("DISABLED_DEPLOYMENT_CONFIGURATION_INVALID");
  return Object.freeze({ ...v });
}

// lib/publishing/canonicalWorker.ts
var import_node_crypto4 = require("node:crypto");
var import_node_perf_hooks = require("node:perf_hooks");

// lib/publishing/canonicalWorkerStore.ts
var import_node_crypto2 = require("node:crypto");

// lib/publishing/eligibilityPolicy.ts
var import_node_crypto = require("node:crypto");

// lib/complimentaryAccess.ts
function projectedPlan(account, product, order, now) {
  if (!Array.isArray(account.billingComplimentaryGrants)) return null;
  const grants = account.billingComplimentaryGrants.filter(
    (grant) => grant && grant.product === product && order.includes(grant.plan) && new Date(grant.endsAt) > now
  ).sort((a, b) => order.indexOf(b.plan) - order.indexOf(a.plan));
  return grants[0]?.plan ?? null;
}
function workspaceComplimentaryPlan(account, now = /* @__PURE__ */ new Date()) {
  const projected = projectedPlan(account, "CONTENT_WORKSPACE", ["CREATOR", "STUDIO", "UNLIMITED"], now);
  const cached = account.workspaceCompedPlan && account.workspaceCompedUntil && account.workspaceCompedUntil > now ? account.workspaceCompedPlan : null;
  const legacy = account.isComped && (!account.compedUntil || account.compedUntil > now) ? "STUDIO" : null;
  const order = ["CREATOR", "STUDIO", "UNLIMITED"];
  return [projected, cached, legacy].filter((p) => !!p).sort((a, b) => order.indexOf(b) - order.indexOf(a))[0] ?? null;
}

// lib/contentWorkspaceEntitlements.ts
var STORAGE_GB = {
  CREATOR: 5,
  STUDIO: 50,
  UNLIMITED: 200
};
var GB = 1e9;
var CONTENT_WORKSPACE_PLANS = {
  CREATOR: {
    name: "Creator",
    priceNgnMonthly: 4900,
    priceNgnAnnual: 55860,
    activeWorkspaces: 5,
    collaborators: 3,
    storageBytes: STORAGE_GB.CREATOR * GB,
    aiGenerations: 100,
    aiRegenerations: 100,
    planCodeEnv: {
      MONTHLY: "PAYSTACK_CONTENT_WORKSPACE_CREATOR_MONTHLY_PLAN_CODE",
      ANNUAL: "PAYSTACK_CONTENT_WORKSPACE_CREATOR_ANNUAL_PLAN_CODE"
    }
  },
  STUDIO: {
    name: "Studio",
    priceNgnMonthly: 29900,
    priceNgnAnnual: 340860,
    activeWorkspaces: 15,
    collaborators: 15,
    storageBytes: STORAGE_GB.STUDIO * GB,
    aiGenerations: 500,
    aiRegenerations: 500,
    planCodeEnv: {
      MONTHLY: "PAYSTACK_CONTENT_WORKSPACE_STUDIO_MONTHLY_PLAN_CODE",
      ANNUAL: "PAYSTACK_CONTENT_WORKSPACE_STUDIO_ANNUAL_PLAN_CODE"
    }
  },
  UNLIMITED: {
    name: "Agency",
    priceNgnMonthly: 59900,
    priceNgnAnnual: 682860,
    // Finite sentinel preserves numeric limits through JSON serialization.
    activeWorkspaces: Number.MAX_SAFE_INTEGER,
    collaborators: Number.MAX_SAFE_INTEGER,
    storageBytes: STORAGE_GB.UNLIMITED * GB,
    aiGenerations: 2e3,
    aiRegenerations: 2e3,
    planCodeEnv: {
      MONTHLY: "PAYSTACK_CONTENT_WORKSPACE_UNLIMITED_MONTHLY_PLAN_CODE",
      ANNUAL: "PAYSTACK_CONTENT_WORKSPACE_UNLIMITED_ANNUAL_PLAN_CODE"
    }
  }
};

// lib/publishing/state.ts
var PUBLISHING_PLATFORMS = ["INSTAGRAM", "TIKTOK", "FACEBOOK", "LINKEDIN", "X"];
function statusField(platform) {
  return platform === "INSTAGRAM" ? "instagramPublishStatus" : platform === "TIKTOK" ? "tikTokPublishStatus" : "publishStatus";
}
function publishingStatus(post) {
  return post[statusField(post.platform)];
}
function buildCaption(post) {
  const mentions = post.taggedAccounts?.split(/[\s,]+/).filter(Boolean).map((value) => value.startsWith("@") ? value : `@${value}`).join(" ");
  return [post.caption, mentions, post.cta, post.hashtags, post.linkUrl].map((value) => value?.trim()).filter(Boolean).join("\n\n");
}
function validatePublishContent(platform, assets, caption, postType) {
  if (!PUBLISHING_PLATFORMS.includes(platform)) throw new Error("Publishing is not available for this channel.");
  if (/story/i.test(postType ?? "")) throw new Error("Automatic Story publishing is not supported for this channel. Choose a feed post or video.");
  if (assets.some((asset) => !["PHOTO", "VIDEO"].includes(asset.mediaType))) throw new Error("Only photos and videos can be published through this integration.");
  const videos = assets.filter((asset) => asset.mediaType === "VIDEO").length;
  if (platform !== "INSTAGRAM" && videos && (videos !== 1 || assets.length !== 1)) throw new Error("Choose one video, or a collection of photos. Mixed media and multiple videos are not supported for this channel.");
  if (!assets.length && (!caption.trim() || ["INSTAGRAM", "TIKTOK"].includes(platform))) throw new Error("Add content before publishing this post.");
  const photoLimit = platform === "TIKTOK" ? 35 : platform === "X" ? 4 : platform === "LINKEDIN" ? 20 : 10;
  if (assets.length > photoLimit) throw new Error(`This channel supports at most ${photoLimit} attachments per post.`);
  const captionLimit = platform === "TIKTOK" ? videos ? 2200 : 4e3 : platform === "LINKEDIN" ? 3e3 : platform === "INSTAGRAM" ? 2200 : 63206;
  if (caption.length > captionLimit) throw new Error(`Shorten the caption to ${captionLimit} characters or fewer.`);
}

// lib/publishing/eligibilityPolicy.ts
function workspaceEligibility(owner, ordinal, now) {
  const trial = ["TRIAL", "ACTIVE"].includes(owner.contentWorkspaceBillingStatus) && !!owner.contentWorkspaceTrialEndsAt && owner.contentWorkspaceTrialEndsAt > now;
  const complimentary = workspaceComplimentaryPlan(owner, now);
  const access = !!complimentary || owner.contentWorkspaceBillingStatus === "ACTIVE" && !!owner.contentWorkspacePlan || owner.contentWorkspaceBillingStatus === "TRIAL" && !!owner.contentWorkspacePlan && trial;
  const order = ["CREATOR", "STUDIO", "UNLIMITED"];
  const plan = trial ? "UNLIMITED" : complimentary ? owner.contentWorkspaceBillingStatus === "ACTIVE" && owner.contentWorkspacePlan && order.indexOf(owner.contentWorkspacePlan) > order.indexOf(complimentary) ? owner.contentWorkspacePlan : complimentary : owner.contentWorkspacePlan;
  return { allowed: !!access && !!plan && Number.isInteger(ordinal) && ordinal > 0 && ordinal <= (plan ? CONTENT_WORKSPACE_PLANS[plan]?.activeWorkspaces ?? 0 : 0), plan };
}
function stable(v) {
  return v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.map(stable) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])])) : v;
}
function policyHash(value) {
  return (0, import_node_crypto.createHash)("sha256").update(JSON.stringify(stable(value))).digest("hex");
}
function accountAuthorizationHash(c) {
  return policyHash({ connectionId: c.id, platform: c.platform, providerAccountId: c.platformAccountId, scopes: [...new Set((c.tokenScopes ?? "").split(/[\s,]+/).filter(Boolean))].sort() });
}
function publishingContentHash(post, assets) {
  return policyHash({
    platform: post.platform,
    postType: post.postType ?? null,
    caption: buildCaption(post),
    tikTokSettings: post.platform === "TIKTOK" ? post.tikTokSettings : null,
    assets: [...assets].sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id)).map((a) => ({ id: a.id, fileKey: a.fileKey, mediaType: a.mediaType, displayOrder: a.displayOrder, ...a.objectVersion != null && a.contentSha256 != null ? { objectVersion: a.objectVersion, contentSha256: a.contentSha256 } : {} }))
  });
}

// lib/publishing/canonicalWorkerStore.ts
function canonicalPublicationTarget(job) {
  return {
    jobId: job.id,
    intentId: job.intentId,
    revision: job.revision,
    generation: job.generation,
    platform: job.platform,
    accountBindingId: job.accountBindingId,
    accountVersion: job.accountVersion,
    providerAccountId: job.providerAccountId,
    connectionId: job.connectionId,
    contentHash: job.contentHash
  };
}
function createCanonicalWorkerStore(deps) {
  const canonical = deps.validation.canonicalStore(deps.preparedLeaseMs === void 0 ? void 0 : { preparedLeaseMs: deps.preparedLeaseMs });
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(deps.actor) || !["NETLIFY", "VPS"].includes(deps.owner) || typeof deps.epoch !== "bigint" || deps.epoch <= BigInt(0)) throw Error("INVALID_WORKER_IDENTITY");
  const actor = deps.actor, owner = deps.owner, epoch = deps.epoch;
  function exact(job, target2) {
    if (policyHash(canonicalPublicationTarget(job)) !== policyHash(target2)) throw Error("WORKER_PUBLICATION_IDENTITY_CONFLICT");
  }
  async function inspect(target2) {
    const job = await canonical.findJob(target2.jobId);
    exact(job, target2);
    return job;
  }
  async function poll(limit) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 5) throw Error("INVALID_WORKER_POLL_LIMIT");
    const ids = await deps.database.transaction(async (tx) => {
      const o = (await tx.query(`SELECT * FROM "PublishingOwnership" WHERE id=1 FOR SHARE`)).rows[0];
      const enabled = o?.enabled && o.state === owner && BigInt(o.epoch) === epoch;
      const ready = enabled ? (await tx.query(`SELECT j.id FROM "PublishingJob" j JOIN "PublishingCanonicalRevision" b ON b."jobId"=j.id
    JOIN "PublishingIntent" i ON i.id=j."intentId" JOIN "PublishingIntentRevision" r ON r."intentId"=i.id AND r.revision=j."intentRevision"
    WHERE i.state='ACTIVE' AND i."currentRevision"=j."intentRevision" AND r."dueAt"<=clock_timestamp() AND j."availableAt"<=clock_timestamp()
    AND (j.phase='READY' OR j.phase='PREPARED' AND j."workerUntil"<=clock_timestamp())
    AND NOT EXISTS(SELECT 1 FROM "PublishingRevisionInvalidation" WHERE "intentId"=i.id AND revision=j."intentRevision")
    AND NOT EXISTS(SELECT 1 FROM "PublishingSendCapability" WHERE "jobId"=j.id)
    ORDER BY j."availableAt",j.id LIMIT $1`, [limit])).rows : [];
      const recovery2 = (await tx.query(`SELECT j.id FROM "PublishingJob" j JOIN "PublishingSendCapability" c ON c."jobId"=j.id
    WHERE j.phase IN ('PROVIDER_PENDING','OUTCOME_UNKNOWN') OR j.phase='EXTERNAL_PENDING' AND j."workerUntil"<=clock_timestamp()
    ORDER BY j."updatedAt",j.id LIMIT $1`, [limit])).rows;
      return { ready, recovery: recovery2, fenced: !enabled };
    });
    const hints = async (rows) => Promise.all(rows.map(async (r) => canonicalPublicationTarget(await canonical.findJob(r.id))));
    return { ready: await hints(ids.ready), recovery: await hints(ids.recovery), fenced: ids.fenced };
  }
  async function claim(target2) {
    target2 = Object.freeze({ ...target2 });
    const job = await inspect(target2);
    const operation = () => ({ jobId: job.id, operationId: (0, import_node_crypto2.randomUUID)(), actor, owner, epoch });
    if (job.phase === "READY") await canonical.admit(operation());
    else if (job.phase !== "PREPARED") throw Error("JOB_NOT_ELIGIBLE");
    const receipt = await canonical.prepare(operation());
    if (!receipt.workerToken || policyHash(receipt.identity) !== policyHash({ intentId: target2.intentId, revision: target2.revision, generation: target2.generation })) throw Error("WORKER_CLAIM_IDENTITY_CONFLICT");
    return { target: target2, workerToken: receipt.workerToken, actor, owner, epoch, maySend: false };
  }
  async function recovery(target2) {
    const job = await inspect(target2);
    const cap = await deps.database.transaction(async (tx) => (await tx.query(`SELECT c.id,c.state,j.phase,j."workerUntil"<=clock_timestamp() AS expired
   FROM "PublishingSendCapability" c JOIN "PublishingJob" j ON j.id=c."jobId" WHERE c."jobId"=$1`, [job.id])).rows[0] ?? null);
    return { job, cap };
  }
  return { poll, claim, inspect, recovery };
}

// lib/publishing/externalAuthorization.ts
var import_node_crypto3 = require("node:crypto");

// lib/publishing/ownership.ts
var OwnershipError = class extends Error {
  constructor(code) {
    super(code);
    this.code = code;
    this.name = "OwnershipError";
  }
};
function transitionAllowed(from, to) {
  return from !== to && (from === "DRAINING" || to === "DRAINING") && ["NETLIFY", "DRAINING", "VPS"].includes(from) && ["NETLIFY", "DRAINING", "VPS"].includes(to);
}
function outcomeAllowed(from, to) {
  return ["AUTHORIZED", "ACCEPTED", "UNKNOWN"].includes(from) && ["ACCEPTED", "CONFIRMED", "REJECTED", "UNKNOWN"].includes(to);
}
function requireValue(ok, code) {
  if (!ok) throw new OwnershipError(code);
}
function identifier(value) {
  requireValue(typeof value === "string" && /^[a-zA-Z0-9_-]{1,120}$/.test(value), "INVALID_IDENTIFIER");
}
function createPublishingOwnership(database) {
  async function atomic(run) {
    try {
      return await database.transaction(run);
    } catch (error) {
      if (error instanceof OwnershipError) throw error;
      throw new OwnershipError("OWNERSHIP_TRANSACTION_UNCONFIRMED");
    }
  }
  async function transition(input) {
    identifier(input.operationId);
    identifier(input.actor);
    return atomic(async (tx) => {
      const owner = (await tx.query('SELECT * FROM "PublishingOwnership" WHERE id=1 FOR UPDATE')).rows[0];
      const previous = (await tx.query('SELECT * FROM "PublishingOwnershipEvent" WHERE "operationId"=$1', [input.operationId])).rows[0];
      if (previous) {
        requireValue(previous.actor === input.actor && previous.toState === input.to && BigInt(previous.epoch) === input.expectedEpoch + BigInt(1), "OPERATION_CONFLICT");
        return { epoch: BigInt(previous.epoch), replay: true };
      }
      requireValue(owner && BigInt(owner.epoch) === input.expectedEpoch, "STALE_EPOCH");
      requireValue(transitionAllowed(owner.state, input.to), "INVALID_TRANSITION");
      requireValue(owner.enabled || input.activate === true && owner.state === "DRAINING" && input.to === "NETLIFY", "OWNERSHIP_INACTIVE");
      if (input.to !== "DRAINING") {
        const unresolved = await tx.query(`SELECT id FROM "PublishingExternalAttempt" WHERE outcome IN ('AUTHORIZED','ACCEPTED','UNKNOWN') LIMIT 1`);
        requireValue(!unresolved.rows.length, "UNRESOLVED_ATTEMPTS");
        if (owner.enabled) {
          const legacy = await tx.query(`SELECT id FROM "PublishingJob" WHERE "intentId" IS NULL AND phase IN ('EXTERNAL_PENDING','PROVIDER_PENDING','OUTCOME_UNKNOWN') LIMIT 1`);
          requireValue(!legacy.rows.length, "UNRESOLVED_LEGACY_JOBS");
        }
      }
      const epoch = input.expectedEpoch + BigInt(1);
      await tx.query('UPDATE "PublishingOwnership" SET state=$1,epoch=$2,enabled=true WHERE id=1', [input.to, epoch.toString()]);
      await tx.query('INSERT INTO "PublishingOwnershipEvent" ("operationId","fromState","toState",epoch,actor) VALUES($1,$2,$3,$4,$5)', [input.operationId, owner.state, input.to, epoch.toString(), input.actor]);
      return { epoch, replay: false };
    });
  }
  async function createIntent(input) {
    identifier(input.id);
    identifier(input.postId);
    requireValue(["INSTAGRAM", "TIKTOK", "FACEBOOK", "LINKEDIN", "X"].includes(input.platform) && Number.isFinite(input.dueAt?.getTime()), "INVALID_INTENT");
    return atomic(async (tx) => {
      await tx.query('INSERT INTO "PublishingIntent" (id,"postId",platform,"currentRevision") VALUES($1,$2,$3,1)', [input.id, input.postId, input.platform]);
      await tx.query('INSERT INTO "PublishingIntentRevision" ("intentId",revision,"dueAt") VALUES($1,1,$2)', [input.id, input.dueAt]);
      return { id: input.id, revision: 1 };
    });
  }
  async function reviseIntent(id3, expectedRevision, dueAt) {
    identifier(id3);
    requireValue(Number.isSafeInteger(expectedRevision) && expectedRevision > 0 && expectedRevision < 2147483647 && Number.isFinite(dueAt?.getTime()), "INVALID_REVISION");
    return atomic(async (tx) => {
      const intent = (await tx.query('SELECT * FROM "PublishingIntent" WHERE id=$1 FOR UPDATE', [id3])).rows[0];
      requireValue(intent?.state === "ACTIVE" && intent.currentRevision === expectedRevision, "STALE_REVISION");
      requireValue(!(await tx.query('SELECT id FROM "PublishingExternalAttempt" WHERE "intentId"=$1', [id3])).rows.length, "ATTEMPT_EXISTS");
      await tx.query('INSERT INTO "PublishingIntentRevision" ("intentId",revision,"dueAt") VALUES($1,$2,$3)', [id3, expectedRevision + 1, dueAt]);
      await tx.query('UPDATE "PublishingIntent" SET "currentRevision"=$2 WHERE id=$1', [id3, expectedRevision + 1]);
      return expectedRevision + 1;
    });
  }
  async function authorize(input) {
    for (const value of [input.attemptId, input.intentId, input.jobId, input.actor]) identifier(value);
    requireValue(["NETLIFY", "VPS"].includes(input.owner), "INVALID_OWNER");
    return atomic(async (tx) => {
      const owner = (await tx.query('SELECT * FROM "PublishingOwnership" WHERE id=1 FOR SHARE')).rows[0];
      requireValue(owner?.enabled && owner.state === input.owner && BigInt(owner.epoch) === input.epoch, "OWNERSHIP_FENCED");
      const intent = (await tx.query('SELECT * FROM "PublishingIntent" WHERE id=$1 FOR UPDATE', [input.intentId])).rows[0];
      requireValue(intent?.state === "ACTIVE" && intent.currentRevision === input.revision, "STALE_REVISION");
      const existing = (await tx.query('SELECT * FROM "PublishingExternalAttempt" WHERE "intentId"=$1', [input.intentId])).rows[0];
      if (existing) {
        requireValue(existing.id === input.attemptId && existing.jobId === input.jobId && existing.actor === input.actor && existing.owner === input.owner && BigInt(existing.epoch) === input.epoch, "ATTEMPT_EXISTS");
        return { attemptId: existing.id, maySend: false };
      }
      const job = (await tx.query(`SELECT j.id FROM "PublishingJob" j JOIN "PublishingIntentRevision" r ON r."intentId"=j."intentId" AND r.revision=j."intentRevision"
        WHERE j.id=$1 AND j."intentId"=$2 AND j."intentRevision"=$3 AND j."ownershipEpoch"=$4 AND j.phase='PREPARED'
        AND j."postId"=$5 AND j.platform=$6 AND r."dueAt"<=clock_timestamp() FOR UPDATE OF j`, [input.jobId, input.intentId, input.revision, input.epoch.toString(), intent.postId, intent.platform])).rows[0];
      requireValue(job, "JOB_NOT_ELIGIBLE");
      await tx.query('INSERT INTO "PublishingExternalAttempt" (id,"intentId",revision,"jobId",owner,epoch,actor) VALUES($1,$2,$3,$4,$5,$6,$7)', [input.attemptId, input.intentId, input.revision, input.jobId, input.owner, input.epoch.toString(), input.actor]);
      await tx.query(`UPDATE "PublishingJob" SET phase='EXTERNAL_PENDING' WHERE id=$1`, [input.jobId]);
      return { attemptId: input.attemptId, maySend: true };
    });
  }
  async function recordOutcome(input) {
    for (const value of [input.operationId, input.attemptId, input.actor]) identifier(value);
    requireValue(input.remoteReference === void 0 || typeof input.remoteReference === "string" && input.remoteReference.length > 0 && input.remoteReference.length <= 500, "INVALID_REFERENCE");
    return atomic(async (tx) => {
      const attempt = (await tx.query('SELECT * FROM "PublishingExternalAttempt" WHERE id=$1 FOR UPDATE', [input.attemptId])).rows[0];
      requireValue(attempt, "ATTEMPT_MISSING");
      const previous = (await tx.query('SELECT * FROM "PublishingAttemptEvent" WHERE "operationId"=$1', [input.operationId])).rows[0];
      if (previous) {
        requireValue(previous.attemptId === input.attemptId && previous.actor === input.actor && previous.outcome === input.outcome && previous.remoteReference === (input.remoteReference ?? null), "OPERATION_CONFLICT");
        return;
      }
      requireValue(outcomeAllowed(attempt.outcome, input.outcome), "OUTCOME_TERMINAL");
      requireValue(!attempt.remoteReference || !input.remoteReference || attempt.remoteReference === input.remoteReference, "REFERENCE_CONFLICT");
      requireValue(!["ACCEPTED", "CONFIRMED"].includes(input.outcome) || input.remoteReference || attempt.remoteReference, "REFERENCE_REQUIRED");
      await tx.query('INSERT INTO "PublishingAttemptEvent" ("operationId","attemptId",outcome,"remoteReference",actor) VALUES($1,$2,$3,$4,$5)', [input.operationId, input.attemptId, input.outcome, input.remoteReference ?? null, input.actor]);
      await tx.query('UPDATE "PublishingExternalAttempt" SET outcome=$2,"remoteReference"=COALESCE("remoteReference",$3) WHERE id=$1', [input.attemptId, input.outcome, input.remoteReference ?? null]);
    });
  }
  async function recoverAttempt(id3) {
    identifier(id3);
    return atomic(async (tx) => ({ record: (await tx.query('SELECT * FROM "PublishingExternalAttempt" WHERE id=$1', [id3])).rows[0] ?? null, maySend: false }));
  }
  return { transition, createIntent, reviseIntent, authorize, recordOutcome, recoverAttempt };
}

// lib/publishing/externalAuthorization.ts
var providerInvocations = /* @__PURE__ */ new WeakMap();
function registerProviderExecutionRequest(auth, target2, operation, payload) {
  const entry = providerInvocations.get(auth);
  if (!entry || entry.targetHash !== policyHash(target2) || entry.request) throw new PublicationAuthorizationError("PROVIDER_CONTEXT_NOT_FRESH");
  entry.request = { operation, payloadHash: policyHash(payload) };
}
var PublicationAuthorizationError = class extends Error {
  constructor(code) {
    super(code);
    this.code = code;
    this.name = "PublicationAuthorizationError";
  }
};
function ensure(ok, code) {
  if (!ok) throw new PublicationAuthorizationError(code);
}
function identifier2(s) {
  ensure(typeof s === "string" && /^[a-zA-Z0-9_-]{1,120}$/.test(s), "INVALID_IDENTIFIER");
}
function target(job) {
  return { jobId: job.id, intentId: job.intentId, revision: job.revision, generation: job.generation, platform: job.platform, accountBindingId: job.accountBindingId, accountVersion: job.accountVersion, providerAccountId: job.providerAccountId, connectionId: job.connectionId, contentHash: job.contentHash };
}
function validTarget(t) {
  ensure(t && typeof t === "object", "PUBLICATION_TARGET_REQUIRED");
  for (const s of [t.jobId, t.intentId, t.accountBindingId, t.connectionId]) identifier2(s);
  ensure([t.revision, t.generation, t.accountVersion].every((n) => Number.isSafeInteger(n) && n > 0 && n <= 2147483647) && ["INSTAGRAM", "TIKTOK", "FACEBOOK", "LINKEDIN", "X"].includes(t.platform) && typeof t.providerAccountId === "string" && t.providerAccountId.length > 0 && /^[a-f0-9]{64}$/.test(t.contentHash), "INVALID_TARGET");
}
function seal(v) {
  if (v && typeof v === "object") {
    for (const x of Object.values(v)) seal(x);
    Object.freeze(v);
  }
  return v;
}
async function readJob(tx, jobId) {
  const j = (await tx.query(`SELECT j.id,j."postId",j.platform,j.phase,j."workerToken",j."remoteId",j."intentId",j."intentRevision" AS revision,
 r."dueAt",b."accountBindingId",b."accountVersion",b."contentHash",a."calendarId",v."providerAccountId",v."connectionId",COALESCE(g.generation,1) AS generation
 FROM "PublishingJob" j JOIN "PublishingCanonicalRevision" b ON b."jobId"=j.id JOIN "PublishingIntentRevision" r ON r."intentId"=j."intentId" AND r.revision=j."intentRevision"
 JOIN "PublishingAccountBinding" a ON a.id=b."accountBindingId" JOIN "PublishingAccountVersion" v ON v."bindingId"=a.id AND v.version=b."accountVersion"
 LEFT JOIN "PublishingRetryGeneration" g ON g."jobId"=j.id WHERE j.id=$1`, [jobId])).rows[0];
  ensure(j, "CANONICAL_JOB_MISSING");
  return j;
}
function createExternalPublicationAuthorization(deps) {
  const ttl = deps.capabilityTtlMs ?? 15e3;
  ensure(Number.isSafeInteger(ttl) && ttl > 0 && ttl <= 3e4, "INVALID_CAPABILITY_TTL");
  const registry = /* @__PURE__ */ new WeakMap();
  async function atomic(fn) {
    return deps.database.transaction(async (tx) => {
      ensure((await tx.query("SHOW transaction_isolation")).rows[0]?.transaction_isolation === "read committed", "AUTHORIZATION_ISOLATION_REQUIRED");
      return fn(tx);
    });
  }
  async function authorize(input) {
    input = Object.freeze({ ...input });
    validTarget(input);
    identifier2(input.operationId);
    identifier2(input.actor);
    identifier2(input.workerToken);
    ensure(["NETLIFY", "VPS"].includes(input.owner) && typeof input.epoch === "bigint" && input.epoch > BigInt(0), "INVALID_OWNER");
    const requestHash = policyHash({ ...input, epoch: String(input.epoch) });
    const committed = await atomic(async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`external-auth:${input.operationId}`]);
      const old = (await tx.query(`SELECT * FROM "PublishingAuthorizationOperation" WHERE "operationId"=$1`, [input.operationId])).rows[0];
      if (old) {
        ensure(old.actor === input.actor && old.requestHash === requestHash, "OPERATION_CONFLICT");
        return { receipt: { outcome: "REPLAY", authorizationId: old.authorizationId, maySend: false } };
      }
      const job = await readJob(tx, input.jobId);
      ensure(policyHash(target(job)) === policyHash({ jobId: input.jobId, intentId: input.intentId, revision: input.revision, generation: input.generation, platform: input.platform, accountBindingId: input.accountBindingId, accountVersion: input.accountVersion, providerAccountId: input.providerAccountId, connectionId: input.connectionId, contentHash: input.contentHash }), "PUBLICATION_IDENTITY_CONFLICT");
      const existing = (await tx.query(`SELECT id FROM "PublishingSendCapability" WHERE "jobId"=$1`, [job.id])).rows[0];
      if (existing) return { receipt: { outcome: "PENDING_RECONCILIATION", authorizationId: existing.id, maySend: false } };
      ensure(job.workerToken === input.workerToken, "WORKER_CLAIM_FENCED");
      const proof = await deps.validation.validateBeforeExternal(tx, { job, owner: input.owner, epoch: input.epoch });
      const authorizationId = (0, import_node_crypto3.randomUUID)(), attemptId = (0, import_node_crypto3.randomUUID)();
      let rootAttemptId = null, retryGenerationId = null;
      if (job.generation === 1) {
        const scoped = createPublishingOwnership({ transaction: (fn) => fn(tx) });
        const r = await scoped.authorize({ attemptId, intentId: job.intentId, revision: job.revision, jobId: job.id, owner: input.owner, epoch: input.epoch, actor: input.actor });
        ensure(r.maySend, "INITIAL_ATTEMPT_ALREADY_EXISTS");
        rootAttemptId = attemptId;
      } else {
        const g = (await tx.query(`SELECT * FROM "PublishingRetryGeneration" WHERE "jobId"=$1 FOR UPDATE`, [job.id])).rows[0];
        ensure(g && g.generation === job.generation && g.revision === job.revision && g.intentId === job.intentId && g.outcome === "READY", "RETRY_GENERATION_NOT_ELIGIBLE");
        const e = (await tx.query(`SELECT * FROM "PublishingRetryEvidence" WHERE id=$1`, [g.evidenceId])).rows[0];
        ensure(e && e.actorStopped && e.verified && e.retryable && e.intentId === job.intentId && e.rootAttemptId === g.rootAttemptId && e.predecessorGenerationId === g.predecessorGenerationId, "TRUSTED_RETRY_EVIDENCE_REQUIRED");
        await tx.query(`UPDATE "PublishingRetryGeneration" SET outcome='AUTHORIZED',owner=$2,epoch=$3,"authorizationId"=$4 WHERE id=$1`, [g.id, input.owner, String(input.epoch), authorizationId]);
        await tx.query(`INSERT INTO "PublishingRetryEvent"("operationId","generationId",outcome,actor) VALUES($1,$2,'AUTHORIZED',$3)`, [(0, import_node_crypto3.randomUUID)(), g.id, input.actor]);
        await tx.query(`UPDATE "PublishingJob" SET phase='EXTERNAL_PENDING' WHERE id=$1`, [job.id]);
        retryGenerationId = g.id;
      }
      const secret = (0, import_node_crypto3.randomBytes)(32).toString("hex"), tokenHash = (0, import_node_crypto3.createHash)("sha256").update(secret).digest("hex");
      await tx.query(`INSERT INTO "PublishingSendCapability"(id,"jobId","intentId",revision,generation,platform,"accountBindingId","accountVersion","providerAccountId","connectionId","contentHash",owner,epoch,actor,"workerToken","rootAttemptId","retryGenerationId","tokenHash","expiresAt")
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,LEAST($19::timestamptz,clock_timestamp()+$20*interval '1 millisecond'))`, [authorizationId, job.id, job.intentId, job.revision, job.generation, job.platform, job.accountBindingId, job.accountVersion, job.providerAccountId, job.connectionId, job.contentHash, input.owner, String(input.epoch), input.actor, input.workerToken, rootAttemptId, retryGenerationId, tokenHash, proof.validUntil, ttl]);
      await tx.query(`INSERT INTO "PublishingAuthorizationOperation"("operationId","authorizationId",actor,"requestHash") VALUES($1,$2,$3,$4)`, [input.operationId, authorizationId, input.actor, requestHash]);
      return { authorizationId, secret, target: target(job) };
    });
    if ("receipt" in committed) return committed.receipt;
    const capability = Object.freeze({});
    registry.set(capability, { id: committed.authorizationId, secret: committed.secret, target: committed.target, used: false });
    return { outcome: "AUTHORIZED", authorizationId: committed.authorizationId, maySend: true, capability };
  }
  async function recover(operationId) {
    identifier2(operationId);
    return atomic(async (tx) => {
      const row = (await tx.query(`SELECT o."authorizationId",c."jobId",c."intentId",c.revision,c.generation,c.state,c."expiresAt"<=clock_timestamp() AS expired FROM "PublishingAuthorizationOperation" o JOIN "PublishingSendCapability" c ON c.id=o."authorizationId" WHERE o."operationId"=$1`, [operationId])).rows[0] ?? null;
      return { record: row, maySend: false };
    });
  }
  async function consume(capability, expected) {
    expected = Object.freeze({ ...expected });
    validTarget(expected);
    const handle = capability && registry.get(capability);
    ensure(handle && !handle.used, "PUBLICATION_CAPABILITY_REQUIRED");
    ensure(policyHash(handle.target) === policyHash(expected), "CAPABILITY_PUBLICATION_MISMATCH");
    handle.used = true;
    return atomic(async (tx) => {
      const metadata = (await tx.query(`SELECT * FROM "PublishingSendCapability" WHERE id=$1`, [handle.id])).rows[0];
      ensure(metadata, "CAPABILITY_MISSING");
      const owner = (await tx.query(`SELECT * FROM "PublishingOwnership" WHERE id=1 FOR SHARE`)).rows[0];
      ensure(owner?.enabled && owner.state === metadata.owner && String(owner.epoch) === String(metadata.epoch), "CAPABILITY_OWNERSHIP_FENCED");
      const job = await readJob(tx, expected.jobId);
      ensure(policyHash(target(job)) === policyHash(expected), "CAPABILITY_PUBLICATION_MISMATCH");
      ensure(job.workerToken === metadata.workerToken, "CAPABILITY_WORKER_FENCED");
      const validated = await deps.validation.validateExecution(tx, job);
      const i = (await tx.query(`SELECT * FROM "PublishingIntent" WHERE id=$1 FOR UPDATE`, [job.intentId])).rows[0];
      ensure(i?.state === "ACTIVE" && i.currentRevision === job.revision, "INTENT_FENCED");
      const j = (await tx.query(`SELECT phase FROM "PublishingJob" WHERE id=$1 FOR UPDATE`, [job.id])).rows[0];
      ensure(j?.phase === "EXTERNAL_PENDING", "PUBLICATION_ALREADY_RESOLVED");
      const c = (await tx.query(`SELECT *,"expiresAt">clock_timestamp() AS live FROM "PublishingSendCapability" WHERE id=$1 FOR UPDATE`, [handle.id])).rows[0];
      ensure(c.state === "ISSUED" && c.live && c.tokenHash === (0, import_node_crypto3.createHash)("sha256").update(handle.secret).digest("hex"), "CAPABILITY_EXPIRED_REVOKED_OR_SPENT");
      const post = (await tx.query(`SELECT platform,"postType",caption,cta,hashtags,"taggedAccounts","linkUrl","tikTokSettings" FROM "CalendarPost" WHERE id=$1`, [job.postId])).rows[0];
      const assets = (await tx.query(`SELECT id,"fileKey","mediaType","displayOrder",to_jsonb(a)->>'objectVersion' AS "objectVersion",to_jsonb(a)->>'contentSha256' AS "contentSha256" FROM "CalendarPostAsset" a WHERE "postId"=$1 ORDER BY "displayOrder",id`, [job.postId])).rows;
      ensure(post && publishingContentHash(post, assets) === job.contentHash, "SUBMISSION_CONTENT_CHANGED");
      await tx.query(`UPDATE "PublishingSendCapability" SET state='CONSUMED',"consumedAt"=clock_timestamp(),"consumedFenceVersion"=$2,"consumedValidUntil"=LEAST("expiresAt",$3::timestamptz) WHERE id=$1`, [c.id, validated.fenceVersion, validated.validUntil]);
      await tx.query(`INSERT INTO "PublishingCapabilityEvent"("operationId","authorizationId",transition,actor,"requestHash") VALUES($1,$2,'CONSUMED',$3,$4)`, [(0, import_node_crypto3.randomUUID)(), c.id, c.actor, policyHash(expected)]);
      return { authorizationId: c.id, actor: c.actor, deadline: new Date(Math.min(c.expiresAt.getTime(), validated.validUntil.getTime())), submission: seal({ target: { ...expected }, post, assets, authorization: { id: c.id, actor: c.actor, owner: c.owner, epoch: String(c.epoch), rootAttemptId: c.rootAttemptId, retryGenerationId: c.retryGenerationId, expiresAt: new Date(Math.min(c.expiresAt.getTime(), validated.validUntil.getTime())).toISOString() } }) };
    });
  }
  async function revoke(input) {
    input = Object.freeze({ ...input });
    for (const s of [input.operationId, input.authorizationId, input.actor]) identifier2(s);
    ensure(typeof input.reason === "string" && input.reason.length > 0 && input.reason.length <= 200, "INVALID_REVOCATION_REASON");
    return atomic(async (tx) => {
      const c = (await tx.query(`SELECT * FROM "PublishingSendCapability" WHERE id=$1 FOR UPDATE`, [input.authorizationId])).rows[0];
      ensure(c && c.actor === input.actor, "CAPABILITY_ACTOR_CONFLICT");
      const digest = policyHash(input), prior = (await tx.query(`SELECT * FROM "PublishingCapabilityEvent" WHERE "operationId"=$1`, [input.operationId])).rows[0];
      if (prior) {
        ensure(prior.requestHash === digest, "OPERATION_CONFLICT");
        return { outcome: "REVOKED", maySend: false };
      }
      if (c.state !== "ISSUED") return { outcome: "PENDING_RECONCILIATION", maySend: false };
      await tx.query(`UPDATE "PublishingSendCapability" SET state='REVOKED' WHERE id=$1`, [c.id]);
      await tx.query(`INSERT INTO "PublishingCapabilityEvent"("operationId","authorizationId",transition,actor,"requestHash") VALUES($1,$2,'REVOKED',$3,$4)`, [input.operationId, c.id, input.actor, digest]);
      return { outcome: "REVOKED", maySend: false };
    });
  }
  async function recordOutcome(input) {
    input = Object.freeze({ ...input });
    for (const s of [input.operationId, input.authorizationId, input.actor]) identifier2(s);
    ensure(["ACCEPTED", "CONFIRMED", "REJECTED", "UNKNOWN"].includes(input.outcome), "INVALID_OUTCOME");
    ensure(input.reference === void 0 || typeof input.reference === "string" && input.reference.length > 0 && input.reference.length <= 500, "INVALID_REFERENCE");
    return atomic(async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`auth-outcome:${input.operationId}`]);
      const old = (await tx.query(`SELECT * FROM "PublishingAuthorizationOutcome" WHERE "operationId"=$1`, [input.operationId])).rows[0], digest = policyHash(input);
      if (old) {
        ensure(old.requestHash === digest, "OPERATION_CONFLICT");
        return { replay: true, maySend: false };
      }
      const c = (await tx.query(`SELECT * FROM "PublishingSendCapability" WHERE id=$1`, [input.authorizationId])).rows[0];
      ensure(c && c.actor === input.actor && c.state === "CONSUMED", "OUTCOME_REQUIRES_SPENT_CAPABILITY");
      await tx.query(`SELECT id FROM "PublishingIntent" WHERE id=$1 FOR UPDATE`, [c.intentId]);
      await tx.query(`SELECT id FROM "PublishingJob" WHERE id=$1 FOR UPDATE`, [c.jobId]);
      if (c.rootAttemptId) await createPublishingOwnership({ transaction: (fn) => fn(tx) }).recordOutcome({ operationId: (0, import_node_crypto3.randomUUID)(), attemptId: c.rootAttemptId, actor: input.actor, outcome: input.outcome, remoteReference: input.reference });
      else {
        const g = (await tx.query(`SELECT * FROM "PublishingRetryGeneration" WHERE id=$1 FOR UPDATE`, [c.retryGenerationId])).rows[0];
        ensure(outcomeAllowed(g.outcome, input.outcome), "OUTCOME_TERMINAL");
        ensure(!g.remoteReference || !input.reference || g.remoteReference === input.reference, "REFERENCE_CONFLICT");
        ensure(!["ACCEPTED", "CONFIRMED"].includes(input.outcome) || g.remoteReference || input.reference, "REFERENCE_REQUIRED");
        await tx.query(`INSERT INTO "PublishingRetryEvent"("operationId","generationId",outcome,"remoteReference",actor) VALUES($1,$2,$3,$4,$5)`, [(0, import_node_crypto3.randomUUID)(), g.id, input.outcome, input.reference ?? null, input.actor]);
        await tx.query(`UPDATE "PublishingRetryGeneration" SET outcome=$2,"remoteReference"=COALESCE("remoteReference",$3) WHERE id=$1`, [g.id, input.outcome, input.reference ?? null]);
      }
      const phase = { ACCEPTED: "PROVIDER_PENDING", CONFIRMED: "CONFIRMED", REJECTED: "REJECTED", UNKNOWN: "OUTCOME_UNKNOWN" }[input.outcome];
      await tx.query(`UPDATE "PublishingJob" SET phase=$2,"remoteId"=COALESCE("remoteId",$3) WHERE id=$1`, [c.jobId, phase, input.reference ?? null]);
      await tx.query(`INSERT INTO "PublishingAuthorizationOutcome"("operationId","authorizationId",actor,outcome,"remoteReference","requestHash") VALUES($1,$2,$3,$4,$5,$6)`, [input.operationId, c.id, input.actor, input.outcome, input.reference ?? null, digest]);
      return { replay: false, maySend: false };
    });
  }
  return {
    authorize,
    recover,
    revoke,
    recordOutcome,
    registerProviderRequest: registerProviderExecutionRequest,
    /** No global fetch fallback, URLs or caller payloads. Driver is trusted synthetic composition. */
    transport(driver, options) {
      ensure(typeof driver === "function", "SYNTHETIC_DRIVER_REQUIRED");
      return {
        async publish(input) {
          ensure(input && typeof input === "object", "PUBLICATION_CONTEXT_REQUIRED");
          const spent = await consume(input.capability, input.target);
          ensure(Date.now() < spent.deadline.getTime(), "CAPABILITY_EXPIRED_BEFORE_INVOCATION");
          providerInvocations.set(spent.submission.authorization, { targetHash: policyHash(spent.submission.target) });
          let observed;
          try {
            observed = await driver(spent.submission);
            ensure(observed && ["ACCEPTED", "CONFIRMED", "REJECTED", "UNKNOWN"].includes(observed.outcome), "INVALID_PROVIDER_OBSERVATION");
          } catch {
            observed = { outcome: "UNKNOWN" };
          } finally {
            providerInvocations.delete(spent.submission.authorization);
          }
          if (options) {
            try {
              return await options.persistObservation(spent.submission, observed);
            } catch {
              return { outcome: "UNKNOWN", ..."reference" in observed && observed.reference ? { reference: observed.reference } : {} };
            }
          }
          try {
            await recordOutcome({ operationId: (0, import_node_crypto3.randomUUID)(), authorizationId: spent.authorizationId, actor: spent.actor, outcome: observed.outcome, reference: "reference" in observed ? observed.reference : void 0 });
          } catch {
            return { outcome: "UNKNOWN", ..."reference" in observed && observed.reference ? { reference: observed.reference } : {} };
          }
          return observed;
        }
      };
    }
  };
}

// lib/tiktokSettings.ts
var TIKTOK_CONSENT_VERSION = "2026-10-08-v2-conversion";
var emptyTikTokSettings = {
  privacyLevel: null,
  allowComment: false,
  allowDuet: false,
  allowStitch: false,
  disclosureEnabled: false,
  yourBrand: false,
  brandedContent: false,
  photoTitle: "",
  isAigc: false
};
function parseTikTokSettings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Review your TikTok settings before publishing.");
  const input = value;
  const result = { ...emptyTikTokSettings };
  for (const key of ["allowComment", "allowDuet", "allowStitch", "disclosureEnabled", "yourBrand", "brandedContent", "isAigc"]) {
    if (typeof input[key] !== "boolean") throw new Error(`Choose a valid TikTok ${key} setting.`);
    result[key] = input[key];
  }
  if (typeof input.privacyLevel !== "string" || !["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"].includes(input.privacyLevel)) throw new Error("Choose TikTok visibility before publishing.");
  result.privacyLevel = input.privacyLevel;
  if (typeof input.photoTitle !== "string" || input.photoTitle.length > 90) throw new Error("TikTok photo title must be at most 90 characters.");
  result.photoTitle = input.photoTitle;
  return result;
}
function validateTikTokSettings(settings, creator, isVideo) {
  if (!settings.privacyLevel || !creator.privacy_level_options.includes(settings.privacyLevel)) throw new Error("This account no longer allows the selected visibility. Refresh TikTok settings and choose again.");
  if (settings.disclosureEnabled && !settings.yourBrand && !settings.brandedContent) throw new Error("You need to indicate if your content promotes yourself, a third party, or both.");
  if (!settings.disclosureEnabled && (settings.yourBrand || settings.brandedContent)) throw new Error("Enable Content Disclosure or clear its selections.");
  if (settings.brandedContent && !["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS"].includes(settings.privacyLevel)) throw new Error("Branded content visibility must be public or friends and cannot be set to private.");
  if (settings.allowComment && creator.comment_disabled) throw new Error("Comments are disabled in this TikTok account. Review your settings again.");
  if (isVideo && (settings.allowDuet && creator.duet_disabled || settings.allowStitch && creator.stitch_disabled)) throw new Error("Duet or Stitch is now disabled in this TikTok account. Review your settings again.");
  if (!isVideo && (settings.allowDuet || settings.allowStitch)) throw new Error("Duet and Stitch are unavailable for photo posts.");
}
function tikTokPostInfo(settings, creator, isVideo) {
  return {
    privacy_level: settings.privacyLevel,
    disable_comment: creator.comment_disabled || !settings.allowComment,
    ...isVideo ? { disable_duet: creator.duet_disabled || !settings.allowDuet, disable_stitch: creator.stitch_disabled || !settings.allowStitch, is_aigc: settings.isAigc } : {},
    brand_organic_toggle: settings.disclosureEnabled && settings.yourBrand,
    brand_content_toggle: settings.disclosureEnabled && settings.brandedContent
  };
}

// lib/publishing/providerJournal.ts
function createProviderJournal(deps) {
  async function append(event) {
    const { id: id3, ...body } = event;
    if (id3 !== policyHash(body) || !["SUBMISSION", "RESPONSE", "STATUS"].includes(event.kind) || !["ACCEPTED", "CONFIRMED", "REJECTED", "UNKNOWN"].includes(event.outcome) || !/^[a-f0-9]{64}$/.test(event.responseHash) || event.reference !== void 0 && (typeof event.reference !== "string" || !event.reference.length || event.reference.length > 500) || ["ACCEPTED", "CONFIRMED"].includes(event.outcome) && !event.reference || event.publicationReferences !== void 0 && (!Array.isArray(event.publicationReferences) || event.publicationReferences.length > 35 || event.publicationReferences.some((r) => typeof r !== "string" || !r.length || r.length > 500)) || event.permalink !== void 0 && (typeof event.permalink !== "string" || event.permalink.length > 2e3 || !/^https:\/\//.test(event.permalink))) throw Error("INVALID_PROVIDER_JOURNAL_EVENT");
    let spooled = true;
    try {
      await deps.spool.append(event);
    } catch (error) {
      spooled = false;
      if (event.kind === "SUBMISSION") throw error;
    }
    try {
      await deps.database.transaction(async (tx) => {
        const c = (await tx.query(`SELECT "jobId",platform,state FROM "PublishingSendCapability" WHERE id=$1`, [event.authorizationId])).rows[0];
        if (!c || c.jobId !== event.jobId || c.platform !== event.platform || c.state !== "CONSUMED") throw Error("JOURNAL_CAPABILITY_CONFLICT");
        const old = (await tx.query(`SELECT * FROM "PublishingProviderJournal" WHERE id=$1`, [event.id])).rows[0];
        if (old) {
          if (old.responseHash !== event.responseHash || old.reference !== (event.reference ?? null) || old.outcome !== event.outcome || old.authorizationId !== event.authorizationId || old.operation !== event.operation || old.kind !== event.kind || policyHash(old.publicationReferences ?? null) !== policyHash(event.publicationReferences ?? null) || (old.permalink ?? null) !== (event.permalink ?? null)) throw Error("JOURNAL_OPERATION_CONFLICT");
          return;
        }
        await tx.query(`INSERT INTO "PublishingProviderJournal"(id,"authorizationId","jobId",platform,kind,outcome,reference,"responseHash",operation,"publicationReferences",permalink) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [event.id, event.authorizationId, event.jobId, event.platform, event.kind, event.outcome, event.reference ?? null, event.responseHash, event.operation, event.publicationReferences ?? null, event.permalink ?? null]);
      });
      return { database: true, spooled };
    } catch {
      return { database: false, spooled };
    }
  }
  async function observations(authorizationId) {
    const spool = await deps.spool.records(authorizationId);
    let rows = [];
    try {
      rows = await deps.database.transaction(async (tx) => (await tx.query(`SELECT id,"authorizationId","jobId",platform,kind,outcome,reference,"responseHash",operation,"publicationReferences",permalink FROM "PublishingProviderJournal" WHERE "authorizationId"=$1 ORDER BY "createdAt",id`, [authorizationId])).rows);
    } catch {
    }
    const all = /* @__PURE__ */ new Map();
    for (const e of [...spool, ...rows]) {
      const event = { ...e, reference: e.reference ?? void 0, publicationReferences: e.publicationReferences ?? void 0, permalink: e.permalink ?? void 0 }, { id: id3, ...body } = event;
      if (id3 !== policyHash(body)) throw Error("JOURNAL_INTEGRITY_FAILED");
      all.set(id3, event);
    }
    return [...all.values()];
  }
  async function project(event) {
    const c = await deps.database.transaction(async (tx) => {
      const cap = (await tx.query(`SELECT * FROM "PublishingSendCapability" WHERE id=$1`, [event.authorizationId])).rows[0];
      if (!cap || cap.state !== "CONSUMED" || cap.jobId !== event.jobId || cap.platform !== event.platform) throw Error("JOURNAL_CAPABILITY_CONFLICT");
      const a = cap.rootAttemptId ? (await tx.query(`SELECT outcome,"remoteReference" FROM "PublishingExternalAttempt" WHERE id=$1`, [cap.rootAttemptId])).rows[0] : (await tx.query(`SELECT outcome,"remoteReference" FROM "PublishingRetryGeneration" WHERE id=$1`, [cap.retryGenerationId])).rows[0];
      return { actor: cap.actor, outcome: a.outcome, reference: a.remoteReference };
    });
    if (c.outcome === "CONFIRMED") {
      if (event.reference && event.reference !== c.reference) throw Error("REFERENCE_CONFLICT");
      return { outcome: "CONFIRMED", reference: c.reference };
    }
    if (c.outcome === "REJECTED") {
      if (event.outcome !== "REJECTED") throw Error("TERMINAL_PROVIDER_CONFLICT");
      return { outcome: "REJECTED" };
    }
    if (c.outcome !== event.outcome || c.reference !== (event.reference ?? null)) await deps.authorization.recordOutcome({ operationId: "provider-" + event.id, authorizationId: event.authorizationId, actor: c.actor, outcome: event.outcome, reference: event.reference });
    return event.outcome === "ACCEPTED" || event.outcome === "CONFIRMED" ? { outcome: event.outcome, reference: event.reference } : event.outcome === "UNKNOWN" ? { outcome: "UNKNOWN", ...event.reference ? { reference: event.reference } : {} } : { outcome: "REJECTED" };
  }
  async function capture(event) {
    const saved = await append(event);
    if (!saved.database && !saved.spooled) return { outcome: "UNKNOWN", ...event.reference ? { reference: event.reference } : {} };
    if (event.kind === "SUBMISSION") return { outcome: "UNKNOWN" };
    try {
      return await project(event);
    } catch {
      return { outcome: "UNKNOWN", ...event.reference ? { reference: event.reference } : {} };
    }
  }
  return {
    append,
    observations,
    capture,
    project,
    event(input) {
      return { ...input, id: policyHash(input) };
    }
  };
}

// lib/publishing/capabilityProviders.ts
function check(ok, code) {
  if (!ok) throw Error(code);
}
function ref(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 500 ? value : typeof value === "number" && Number.isSafeInteger(value) ? String(value) : void 0;
}
function okay(r) {
  return r.status >= 200 && r.status < 300 && (!r.body.error || r.body.error.code === "ok");
}
function classifyProviderSubmission(operation, response, artifact) {
  if (!okay(response)) return response.status < 500 && response.definitiveNoSend?.verified && response.definitiveNoSend.evidenceReference ? { outcome: "REJECTED" } : { outcome: "UNKNOWN" };
  let reference = operation === "LI_POST" ? ref(response.headers?.["x-restli-id"]) : operation === "X_TWEET" ? ref(response.body.data?.id) : operation.startsWith("TT_") ? ref(response.body.data?.publish_id ?? response.body.publish_id) : operation === "FB_REEL_FINISH" ? ref(response.body.id ?? artifact.refs[0]) : ref(response.body.post_id ?? response.body.id);
  if (!reference) return { outcome: "UNKNOWN" };
  return { outcome: ["TT_VIDEO_INIT", "TT_PHOTO_INIT", "FB_VIDEO", "FB_REEL_FINISH"].includes(operation) || operation === "LI_POST" && response.body.lifecycleState !== "PUBLISHED" ? "ACCEPTED" : "CONFIRMED", reference };
}
function createCapabilityProviderIntegration(deps) {
  check(deps.environment === "isolated-mock" && deps.io.kind === "local-mock", "LOCAL_MOCK_COMPOSITION_REQUIRED");
  const journal = createProviderJournal(deps);
  const io = new Proxy(deps.io, { get(object, key) {
    const value = Reflect.get(object, key);
    if (typeof value !== "function") return value;
    return (...args) => {
      if (deps.signal?.aborted) throw Error("PROVIDER_INTEGRATION_STOPPING");
      return Reflect.apply(value, object, args);
    };
  } });
  async function snapshot(target2) {
    return deps.database.transaction(async (tx) => {
      const r = (await tx.query(`SELECT j.id,j."postId",j.platform,j.phase,j."workerToken",j."remoteId",j."intentId",j."intentRevision" AS revision,r."dueAt",b."accountBindingId",b."accountVersion",b."contentHash",a."calendarId",v."providerAccountId",v."connectionId",COALESCE(g.generation,1) AS generation
    FROM "PublishingJob" j JOIN "PublishingCanonicalRevision" b ON b."jobId"=j.id JOIN "PublishingIntentRevision" r ON r."intentId"=j."intentId" AND r.revision=j."intentRevision" JOIN "PublishingAccountBinding" a ON a.id=b."accountBindingId"
    JOIN "PublishingAccountVersion" v ON v."bindingId"=a.id AND v.version=b."accountVersion" LEFT JOIN "PublishingRetryGeneration" g ON g."jobId"=j.id WHERE j.id=$1`, [target2.jobId])).rows[0];
      check(r, "CANONICAL_JOB_MISSING");
      check(["intentId", "revision", "generation", "platform", "accountBindingId", "accountVersion", "providerAccountId", "connectionId", "contentHash"].every((k) => r[k] === target2[k]), "PROVIDER_TARGET_CONFLICT");
      await deps.validation.validateExecution(tx, r);
      const post = (await tx.query(`SELECT platform,"postType",caption,cta,hashtags,"taggedAccounts","linkUrl","tikTokSettings" FROM "CalendarPost" WHERE id=$1`, [r.postId])).rows[0];
      const assets = (await tx.query(`SELECT id,"fileKey","mediaType","displayOrder",to_jsonb(a)->>'objectVersion' AS "objectVersion",to_jsonb(a)->>'contentSha256' AS "contentSha256" FROM "CalendarPostAsset" a WHERE "postId"=$1 ORDER BY "displayOrder",id`, [r.postId])).rows;
      check(publishingContentHash(post, assets) === target2.contentHash, "PROVIDER_CONTENT_CHANGED");
      return { post, assets };
    });
  }
  async function prepare(target2) {
    target2 = Object.freeze({ ...target2 });
    const existing = await deps.database.transaction(async (tx) => (await tx.query(`SELECT * FROM "PublishingProviderPreparation" WHERE "jobId"=$1`, [target2.jobId])).rows[0]);
    await deps.database.transaction(async (tx) => {
      const bound = (await tx.query(`SELECT v."connectionId",v."providerAccountId" FROM "PublishingAccountVersion" v JOIN "PublishingAccountBinding" b ON b.id=v."bindingId" JOIN "SocialConnection" s ON s.id=v."connectionId" WHERE b.id=$1 AND b."currentVersion"=$2 AND v.version=$2 AND b.state='CONNECTED' AND s.status='CONNECTED' AND s.platform=$3 AND s."platformAccountId"=v."providerAccountId"`, [target2.accountBindingId, target2.accountVersion, target2.platform])).rows[0];
      check(bound && bound.connectionId === target2.connectionId && bound.providerAccountId === target2.providerAccountId, "REFRESH_DESTINATION_CHANGED");
    });
    await io.refresh(target2);
    const { post, assets } = await snapshot(target2);
    if (existing) {
      check(existing.targetHash === policyHash(target2), "PREPARATION_TARGET_CONFLICT");
      return { prepared: true, maySend: false };
    }
    validatePublishContent(target2.platform, assets, buildCaption(post), post.postType);
    const video = assets.some((a) => a.mediaType === "VIDEO"), caption = buildCaption(post);
    let refs = [];
    let creator;
    if (target2.platform === "TIKTOK") {
      await io.reserveRate(target2, "creator");
      creator = await io.creatorInfo(target2);
      validateTikTokSettings(parseTikTokSettings(post.tikTokSettings), creator, video);
    }
    const media = await io.media(target2, assets, creator);
    if (target2.platform === "INSTAGRAM") {
      for (let i = 0; i < assets.length; i++) {
        const r = await io.prepare(target2, "IG_CONTAINER", { media: media[i], mediaType: assets[i].mediaType, carousel: assets.length > 1, caption: assets.length === 1 ? buildCaption({ ...post, linkUrl: null }) : void 0 });
        check(okay(r) && ref(r.body.id), "IG_CONTAINER_NOT_READY");
        refs.push(ref(r.body.id));
        if (assets[i].mediaType === "VIDEO") {
          const status = await io.prepare(target2, "IG_CONTAINER_STATUS", { reference: refs.at(-1) });
          check(okay(status) && status.body.status_code === "FINISHED", "IG_CONTAINER_NOT_READY");
        }
      }
      if (refs.length > 1) {
        const r = await io.prepare(target2, "IG_CAROUSEL", { children: refs, caption: buildCaption({ ...post, linkUrl: null }) });
        check(okay(r) && ref(r.body.id), "IG_CAROUSEL_NOT_READY");
        refs = [ref(r.body.id)];
      }
    } else if (target2.platform === "FACEBOOK") {
      if (video && /reel/i.test(post.postType ?? "")) {
        const r = await io.prepare(target2, "FB_REEL_START", { upload_phase: "start" });
        check(okay(r) && ref(r.body.video_id), "FB_REEL_NOT_READY");
        refs = [ref(r.body.video_id)];
        const upload = await io.prepare(target2, "FB_REEL_UPLOAD", { video_id: refs[0], media: media[0], ...r.body.upload_url ? { uploadUrl: r.body.upload_url } : {} });
        check(okay(upload), "FB_REEL_NOT_READY");
      } else if (!video) for (const url of media) {
        const r = await io.prepare(target2, "FB_PHOTO", { url, published: false });
        check(okay(r) && ref(r.body.id), "FB_PHOTO_NOT_READY");
        refs.push(ref(r.body.id));
      }
    } else if (target2.platform === "LINKEDIN" || target2.platform === "X") for (let i = 0; i < media.length; i++) {
      const r = await io.prepare(target2, target2.platform === "X" ? "X_MEDIA" : "LI_MEDIA", { media: media[i], mediaType: assets[i].mediaType });
      check(okay(r) && ref(r.body.id), "MEDIA_NOT_READY");
      refs.push(ref(r.body.id));
    }
    const artifact = { media, refs, video, creator: creator ?? null };
    await snapshot(target2);
    await deps.database.transaction(async (tx) => {
      const old = (await tx.query(`SELECT * FROM "PublishingProviderPreparation" WHERE "jobId"=$1`, [target2.jobId])).rows[0];
      if (old) {
        check(old.targetHash === policyHash(target2), "PREPARATION_TARGET_CONFLICT");
        return;
      }
      await tx.query(`INSERT INTO "PublishingProviderPreparation"("jobId","targetHash","contentHash",artifact) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [target2.jobId, policyHash(target2), target2.contentHash, artifact]);
    });
    return { prepared: true, maySend: false };
  }
  const transport = deps.authorization.transport(async (submission) => {
    const t = submission.target;
    const p = await deps.database.transaction(async (tx) => (await tx.query(`SELECT * FROM "PublishingProviderPreparation" WHERE "jobId"=$1`, [t.jobId])).rows[0]);
    check(p && p.targetHash === policyHash(t) && p.contentHash === t.contentHash, "PROVIDER_PREPARATION_REQUIRED");
    const a = p.artifact;
    const caption = buildCaption(submission.post);
    let operation, payload;
    switch (t.platform) {
      case "INSTAGRAM":
        operation = "IG_MEDIA_PUBLISH";
        payload = { creation_id: a.refs[0] };
        break;
      case "TIKTOK": {
        const settings = parseTikTokSettings(submission.post.tikTokSettings);
        await io.reserveRate(t, "creator");
        const creator = await io.creatorInfo(t);
        validateTikTokSettings(settings, creator, a.video);
        await io.reserveRate(t, "init");
        operation = a.video ? "TT_VIDEO_INIT" : "TT_PHOTO_INIT";
        payload = { post_info: { ...tikTokPostInfo(settings, creator, a.video), title: a.video ? caption : settings.photoTitle, ...!a.video ? { description: caption } : {} }, source_info: { source: "PULL_FROM_URL", ...a.video ? { video_url: a.media[0] } : { photo_images: a.media } }, ...!a.video ? { media_type: "PHOTO", post_mode: "DIRECT_POST", is_aigc: settings.isAigc } : {} };
        break;
      }
      case "FACEBOOK":
        operation = a.video ? /reel/i.test(String(submission.post.postType ?? "")) ? "FB_REEL_FINISH" : "FB_VIDEO" : "FB_FEED";
        payload = operation === "FB_REEL_FINISH" ? { upload_phase: "finish", video_state: "PUBLISHED", video_id: a.refs[0], description: caption } : operation === "FB_VIDEO" ? { file_url: a.media[0], description: caption } : { message: caption, ...a.refs.length ? { attached_media: a.refs.map((id3) => ({ media_fbid: id3 })) } : submission.post.linkUrl ? { link: submission.post.linkUrl } : {} };
        break;
      case "LINKEDIN":
        operation = "LI_POST";
        payload = { author: t.providerAccountId.startsWith("urn:li:") ? t.providerAccountId : `urn:li:person:${t.providerAccountId}`, commentary: caption, lifecycleState: "PUBLISHED", visibility: "PUBLIC", media: a.refs };
        break;
      case "X":
        operation = "X_TWEET";
        payload = { text: caption, ...a.refs.length ? { media: { media_ids: a.refs } } : {} };
        break;
    }
    deps.authorization.registerProviderRequest(submission.authorization, t, operation, payload);
    const base = { authorizationId: submission.authorization.id, jobId: t.jobId, platform: t.platform, operation };
    await journal.append(journal.event({ ...base, kind: "SUBMISSION", outcome: "UNKNOWN", responseHash: policyHash({ operation }) }));
    await snapshot(t);
    check(Date.now() < new Date(submission.authorization.expiresAt).getTime(), "CAPABILITY_EXPIRED_BEFORE_PROVIDER");
    let observed;
    let digest;
    try {
      const response = await io.submit(t, operation, payload, submission.authorization);
      observed = classifyProviderSubmission(operation, response, a);
      digest = policyHash(response);
    } catch {
      observed = { outcome: "UNKNOWN", ...operation === "FB_REEL_FINISH" && a.refs[0] ? { reference: a.refs[0] } : {} };
      digest = policyHash({ interrupted: true });
    }
    const event = journal.event({ ...base, kind: "RESPONSE", outcome: observed.outcome, ..."reference" in observed && observed.reference ? { reference: observed.reference } : {}, responseHash: digest });
    try {
      await journal.capture(event);
    } catch {
      return { outcome: "UNKNOWN", ..."reference" in observed && observed.reference ? { reference: observed.reference } : {} };
    }
    if (observed.outcome === "CONFIRMED") {
      if (t.platform === "INSTAGRAM") await (async () => {
        const response = await io.lookup(t, "IG_PERMALINK", observed.reference);
        if (response.status >= 200 && response.status < 300 && response.body.id === observed.reference && typeof response.body.permalink === "string" && /^https:\/\/(?:www\.)?instagram\.com\//.test(response.body.permalink)) await journal.capture(journal.event({ ...base, kind: "STATUS", outcome: "CONFIRMED", reference: observed.reference, permalink: response.body.permalink, responseHash: policyHash(response), operation: "IG_PERMALINK" }));
      })().catch(() => {
      });
      await io.report?.(t, observed.reference).catch(() => {
      });
    }
    return observed;
  }, { persistObservation: async (submission, observed) => {
    const rows = await journal.observations(submission.authorization.id);
    const response = [...rows].reverse().find((e) => e.kind === "RESPONSE");
    if (response) return journal.project(response);
    const event = journal.event({ authorizationId: submission.authorization.id, jobId: submission.target.jobId, platform: submission.target.platform, operation: "pre-submission-failure", kind: "RESPONSE", outcome: "UNKNOWN", ..."reference" in observed && observed.reference ? { reference: observed.reference } : {}, responseHash: policyHash({ unknown: true }) });
    return journal.capture(event);
  } });
  async function reconcile(authorizationId) {
    const c = await deps.database.transaction(async (tx) => (await tx.query(`SELECT * FROM "PublishingSendCapability" WHERE id=$1`, [authorizationId])).rows[0]);
    check(c && c.state === "CONSUMED", "RECONCILIATION_REQUIRES_CONSUMED_ATTEMPT");
    const target2 = { jobId: c.jobId, intentId: c.intentId, revision: c.revision, generation: c.generation, platform: c.platform, accountBindingId: c.accountBindingId, accountVersion: c.accountVersion, providerAccountId: c.providerAccountId, connectionId: c.connectionId, contentHash: c.contentHash };
    const records = await journal.observations(authorizationId);
    for (const e of records) await journal.append(e);
    const known = [...records].reverse().find((e) => e.reference);
    if (!known) return journal.capture(journal.event({ authorizationId, jobId: c.jobId, platform: c.platform, operation: "reconciliation-no-reference", kind: "STATUS", outcome: "UNKNOWN", responseHash: policyHash({ noReference: true }) }));
    if (known.outcome === "CONFIRMED" || known.outcome === "REJECTED") return journal.project(known);
    const connected = await deps.database.transaction(async (tx) => (await tx.query(`SELECT s.id FROM "SocialConnection" s JOIN "PublishingAccountVersion" v ON v."connectionId"=s.id WHERE v."bindingId"=$1 AND v.version=$2 AND s.id=$3 AND s.platform=$4 AND s."platformAccountId"=$5 AND s.status='CONNECTED'`, [target2.accountBindingId, target2.accountVersion, target2.connectionId, target2.platform, target2.providerAccountId])).rows.length > 0);
    if (!connected) return { outcome: "UNKNOWN", reference: known.reference };
    await io.refresh(target2, { reconciliation: true });
    if (target2.platform === "TIKTOK") await io.reserveRate(target2, "status");
    const operation = target2.platform === "TIKTOK" ? "TT_STATUS" : target2.platform === "FACEBOOK" ? "FB_VIDEO_STATUS" : target2.platform === "INSTAGRAM" ? "IG_PERMALINK" : target2.platform === "LINKEDIN" ? "LI_POST_GET" : "X_TWEET_GET";
    let response;
    try {
      response = await io.lookup(target2, operation, known.reference);
    } catch {
      return { outcome: "UNKNOWN", reference: known.reference };
    }
    const verified = okay(response) && (operation === "TT_STATUS" ? response.body.status === "PUBLISH_COMPLETE" : operation === "FB_VIDEO_STATUS" ? response.body.video_status === "ready" && response.body.publishing_status === "complete" : response.body.verified === true);
    const ids = target2.platform === "TIKTOK" ? response.body.data?.publicaly_available_post_id ?? response.body.publicaly_available_post_id : void 0;
    const references = Array.isArray(ids) ? ids.map(ref).filter((id3) => id3 !== void 0) : void 0;
    const event = journal.event({ authorizationId, jobId: c.jobId, platform: c.platform, operation, kind: "STATUS", outcome: verified ? "CONFIRMED" : known.outcome === "ACCEPTED" ? "ACCEPTED" : "UNKNOWN", reference: known.reference, responseHash: policyHash(response), ...references?.length ? { publicationReferences: references } : {} });
    return journal.capture(event);
  }
  return {
    prepare,
    publish: transport.publish,
    reconcile,
    // Trusted callback import: identity is checked against the consumed capability.
    observe: journal.capture
  };
}

// lib/publishing/canonicalWorker.ts
function createInactiveCanonicalWorker(deps) {
  const disabled = deps.environment === "production-disabled" && deps.io.kind === "native-disabled";
  if (!disabled && (deps.environment !== "isolated-mock" || deps.io.kind !== "local-mock")) throw Error("INACTIVE_MOCK_WORKER_REQUIRED");
  const concurrency = deps.concurrency ?? 2, timeout = deps.jobTimeoutMs ?? 3e4, grace = deps.shutdownGraceMs ?? 5e3;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 3 || !Number.isInteger(timeout) || timeout < 1 || timeout > 6e4 || !Number.isInteger(grace) || grace < 0 || grace > 1e4) throw Error("INVALID_WORKER_BOUNDS");
  const store = createCanonicalWorkerStore(deps), actor = deps.actor, owner = deps.owner, epoch = deps.epoch;
  const authorization = createExternalPublicationAuthorization(deps);
  const controllers = /* @__PURE__ */ new Set(), active = /* @__PURE__ */ new Set(), unsettled = /* @__PURE__ */ new Set(), jobs = /* @__PURE__ */ new Set();
  let stopping = false, closing;
  function result(jobId, state, code) {
    return { jobId, state, ...code ? { code } : {} };
  }
  function observation(jobId, o) {
    return { jobId, state: { CONFIRMED: "confirmed", ACCEPTED: "provider-pending", REJECTED: "rejected", UNKNOWN: "outcome-unknown" }[o.outcome], ..."reference" in o && o.reference ? { reference: o.reference } : {} };
  }
  function checkpoint(signal) {
    if (stopping || signal.aborted) throw Error("WORKER_STOPPING");
  }
  function layer(signal) {
    return createCapabilityProviderIntegration({ environment: "isolated-mock", database: deps.database, validation: deps.validation, authorization, spool: deps.spool, io: deps.io, signal });
  }
  async function work(target2, signal, stage, recoverOnly) {
    let claim;
    try {
      checkpoint(signal);
      const { job, cap } = await store.recovery(target2);
      checkpoint(signal);
      if (job.phase === "CONFIRMED") return result(job.id, "confirmed");
      if (job.phase === "REJECTED") return result(job.id, "rejected");
      if (job.phase === "CANCELLED") return result(job.id, "blocked", "CANCELLED");
      if (cap) {
        if (cap.state !== "CONSUMED") return result(job.id, "outcome-unknown", "AUTHORIZATION_REQUIRES_RECONCILIATION");
        if (cap.phase === "EXTERNAL_PENDING" && !cap.expired) return result(job.id, "deferred", "ATTEMPT_MAY_BE_ACTIVE");
        const outcome = await layer(signal).reconcile(cap.id);
        if (["CONFIRMED", "REJECTED"].includes(outcome.outcome) && job.workerToken) await deps.executionCoordination?.release({ target: target2, workerToken: job.workerToken }).catch(() => {
        });
        return observation(job.id, outcome);
      }
      if (recoverOnly) return result(job.id, "deferred", "NO_AUTHORIZED_ATTEMPT");
      const claimed = claim = await store.claim(target2);
      checkpoint(signal);
      await deps.executionCoordination?.acquire(claimed);
      checkpoint(signal);
      await deps.snapshotMedia?.(claimed.target);
      checkpoint(signal);
      const providers = layer(signal);
      await providers.prepare(claimed.target);
      checkpoint(signal);
      stage.authorizationStarted = true;
      const grant = await authorization.authorize({ ...claimed.target, operationId: (0, import_node_crypto4.randomUUID)(), actor, owner, epoch, workerToken: claimed.workerToken });
      checkpoint(signal);
      if (!grant.maySend) return result(job.id, "outcome-unknown", "NO_FRESH_SEND_CAPABILITY");
      return observation(job.id, await providers.publish({ target: claimed.target, capability: grant.capability }));
    } catch (error) {
      const code = error instanceof Error ? "code" in error && typeof error.code === "string" ? error.code : error.message : "WORKER_OPERATION_FAILED";
      if (stage.authorizationStarted) return result(target2.jobId, "outcome-unknown", code);
      if (stopping || signal.aborted) return result(target2.jobId, "deferred", "WORKER_STOPPING");
      if (/OWNERSHIP|EPOCH/.test(code)) return result(target2.jobId, "fenced", code);
      if (/JOB_NOT_ELIGIBLE|NOT_DUE|UNCONFIRMED|TRANSACTION/.test(code)) return result(target2.jobId, "deferred", code);
      return result(target2.jobId, "blocked", code);
    } finally {
      if (claim) await deps.executionCoordination?.release(claim).catch(() => {
      });
      await deps.projectStatus?.(target2).catch(() => {
      });
    }
  }
  function run(target2, recoverOnly = false, budgetMs = timeout) {
    if (!target2 || typeof target2.jobId !== "string") return Promise.reject(Error("EXACT_PUBLICATION_HINT_REQUIRED"));
    if (disabled) return Promise.resolve(result(target2.jobId, "blocked", "PUBLISHING_DISABLED"));
    target2 = Object.freeze({ ...target2 });
    if (stopping) return Promise.resolve(result(target2.jobId, "stopping"));
    if (jobs.has(target2.jobId) || jobs.size >= concurrency) return Promise.resolve(result(target2.jobId, "deferred", "LOCAL_WORKER_CAPACITY"));
    jobs.add(target2.jobId);
    const controller = new AbortController(), stage = { authorizationStarted: false };
    controllers.add(controller);
    let abortListener;
    const interrupted = new Promise((resolve) => {
      abortListener = () => resolve(result(target2.jobId, stage.authorizationStarted ? "outcome-unknown" : "deferred", "WORKER_DEADLINE_OR_SHUTDOWN"));
      controller.signal.addEventListener("abort", abortListener, { once: true });
    });
    const timer = setTimeout(() => controller.abort(), Math.max(1, Math.min(timeout, budgetMs)));
    const task = work(target2, controller.signal, stage, recoverOnly);
    unsettled.add(task);
    void task.finally(() => {
      unsettled.delete(task);
      jobs.delete(target2.jobId);
      controllers.delete(controller);
    });
    const bounded = Promise.race([task, interrupted]).finally(() => {
      clearTimeout(timer);
      controller.signal.removeEventListener("abort", abortListener);
      active.delete(bounded);
    });
    active.add(bounded);
    return bounded;
  }
  async function pollOnce(limit = concurrency, deadline) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 5) throw Error("INVALID_WORKER_POLL_LIMIT");
    if (disabled) return { state: "disabled", results: [] };
    if (stopping) return { state: "stopping", results: [] };
    if (jobs.size >= concurrency) return { state: "busy", results: [] };
    const hints = await store.poll(Math.min(limit, concurrency - jobs.size));
    const remaining = () => deadline === void 0 ? timeout : Math.max(0, deadline - import_node_perf_hooks.performance.now());
    const recovery = remaining() > 0 ? await Promise.all(hints.recovery.map((t) => run(t, true, remaining()))) : [];
    const fresh = remaining() > 0 ? await Promise.all(hints.ready.map((t) => run(t, false, remaining()))) : [];
    return { state: hints.fenced ? "fenced" : "polled", results: [...recovery, ...fresh] };
  }
  async function drain(options) {
    if (!Number.isInteger(options.durationMs) || options.durationMs < 1 || options.durationMs > 6e4 || !Number.isInteger(options.maxRounds) || options.maxRounds < 1 || options.maxRounds > 100) throw Error("INVALID_WORKER_DRAIN_BOUNDS");
    const start = import_node_perf_hooks.performance.now(), rounds = [];
    for (let n = 0; n < options.maxRounds && !stopping && import_node_perf_hooks.performance.now() - start < options.durationMs; n++) {
      const r = await pollOnce(concurrency, start + options.durationMs);
      rounds.push(r);
      if (!r.results.length) break;
    }
    return rounds;
  }
  function close() {
    if (closing) return closing;
    stopping = true;
    if (disabled) return closing = Promise.resolve({ quiescent: true, pendingOperations: 0 });
    closing = (async () => {
      const timer = setTimeout(() => {
        for (const c of controllers) c.abort();
      }, grace);
      try {
        await Promise.allSettled([...active]);
      } finally {
        clearTimeout(timer);
        for (const c of controllers) c.abort();
      }
      return { quiescent: unsettled.size === 0, pendingOperations: unsettled.size };
    })();
    return closing;
  }
  return {
    run: (t) => run(t),
    recover: (t) => run(t, true),
    pollOnce: (limit) => pollOnce(limit),
    drain,
    close,
    status: () => ({ stopping, available: Math.max(0, concurrency - jobs.size), pendingOperations: unsettled.size })
  };
}

// lib/publishing/validationAdapters.ts
var import_node_crypto8 = require("node:crypto");

// lib/calendarTeamPolicy.ts
var TEAM_PERMISSIONS = {
  "calendar.view": { label: "View calendar", group: "Content" },
  "calendar.edit": { label: "Plan and edit content", group: "Content" },
  "creatives.upload": { label: "Upload creatives to planned posts", group: "Content" },
  "publishing.manage": { label: "Publish to social channels", group: "Content" },
  "delivery.manage": { label: "Deliver content for client review", group: "Content" },
  "analytics.view": { label: "View analytics and reports", group: "Insights" },
  "analytics.manage": { label: "Sync and analyze performance", group: "Insights" },
  "inbox.view": { label: "Read messages", group: "Customer care" },
  "inbox.reply": { label: "Reply to messages and draft AI replies", group: "Customer care" },
  "leads.view": { label: "View leads", group: "Customer care" },
  "leads.manage": { label: "Manage leads", group: "Customer care" },
  "ai.generate": { label: "Generate AI content", group: "Business knowledge" },
  "knowledge.view": { label: "Read business knowledge", group: "Business knowledge" },
  "knowledge.manage": { label: "Upload documents and manage knowledge", group: "Business knowledge" },
  "people.view": { label: "View team and access history", group: "Administration" },
  "people.manage": { label: "Invite and manage teammates", group: "Administration" },
  "channels.view": { label: "View connected channels", group: "Administration" },
  "channels.manage": { label: "Manage channel connections", group: "Administration" },
  "workspace.manage": { label: "Manage workspace and client access settings", group: "Administration" }
};
var ALL_TEAM_PERMISSIONS = Object.keys(TEAM_PERMISSIONS);
var SOCIAL = ["calendar.view", "calendar.edit", "creatives.upload", "publishing.manage", "delivery.manage", "analytics.view", "analytics.manage", "ai.generate", "knowledge.view", "channels.view"];
var TEAM_ROLES = {
  OWNER: { label: "Owner", description: "Owns the workspace, billing, and all access decisions.", defaults: ALL_TEAM_PERMISSIONS, allowed: ALL_TEAM_PERMISSIONS },
  MANAGER: { label: "Manager", description: "Runs this workspace, its team, channels, and business knowledge. Billing and ownership stay with the owner.", defaults: ALL_TEAM_PERMISSIONS, allowed: ALL_TEAM_PERMISSIONS },
  SOCIAL_MEDIA_MANAGER: { label: "Social Media Manager", description: "Plans content, delivers it for client review, publishes, and tracks results.", defaults: SOCIAL, allowed: [...SOCIAL, "inbox.view", "inbox.reply", "leads.view", "leads.manage"] },
  CREATIVE_CONTRIBUTOR: { label: "Creative Contributor", description: "Views planned content and uploads creative assets. Cannot edit the calendar or publish.", defaults: ["calendar.view", "creatives.upload"], allowed: ["calendar.view", "creatives.upload"] },
  INBOX_AGENT: { label: "Inbox Agent", description: "Reads and replies to messages only. No calendar, leads, reports, documents, or team access.", defaults: ["inbox.view", "inbox.reply"], allowed: ["inbox.view", "inbox.reply"] },
  VIEWER: { label: "Viewer", description: "Reads the selected areas without making changes.", defaults: ["calendar.view"], allowed: ["calendar.view", "analytics.view", "inbox.view", "leads.view", "knowledge.view", "channels.view"] }
};
function normalizeTeamRole(role) {
  if (role === "EDIT_CALENDAR") return "SOCIAL_MEDIA_MANAGER";
  if (role === "ADD_CONTENT") return "CREATIVE_CONTRIBUTOR";
  if (role === "VIEW_ONLY") return "VIEWER";
  return Object.hasOwn(TEAM_ROLES, role) ? role : null;
}
var DEPENDENCIES = {
  "calendar.edit": "calendar.view",
  "creatives.upload": "calendar.view",
  "publishing.manage": "calendar.view",
  "delivery.manage": "calendar.view",
  "workspace.manage": "calendar.view",
  "analytics.manage": "analytics.view",
  "inbox.reply": "inbox.view",
  "leads.manage": "leads.view",
  "people.manage": "people.view",
  "channels.manage": "channels.view",
  "knowledge.manage": "knowledge.view",
  "ai.generate": "calendar.edit"
};
function effectiveTeamPermissions(role, permissions = [], custom = false) {
  const normalized = normalizeTeamRole(role);
  if (!normalized) return [];
  if (normalized === "OWNER") return [...ALL_TEAM_PERMISSIONS];
  const config = TEAM_ROLES[normalized];
  const selected = custom ? permissions : config.defaults;
  const result = new Set(selected.filter((p) => config.allowed.includes(p)));
  for (let pass = 0; pass < 3; pass++) for (const [permission, dependency] of Object.entries(DEPENDENCIES)) if (result.has(permission) && dependency && !result.has(dependency)) result.delete(permission);
  return [...result];
}

// lib/tiktokConsent.ts
var import_node_crypto5 = require("node:crypto");
function tikTokConsentHash(post, settings, accountId) {
  return (0, import_node_crypto5.createHash)("sha256").update(JSON.stringify({
    version: TIKTOK_CONSENT_VERSION,
    accountId,
    caption: buildCaption(post),
    postType: post.postType ?? null,
    settings,
    assets: [...post.assets].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id.localeCompare(b.id)).map((a) => ({ id: a.id, key: a.fileKey, type: a.mediaType, ...a.objectVersion != null && a.contentSha256 != null ? { objectVersion: a.objectVersion, contentSha256: a.contentSha256 } : {} }))
  })).digest("hex");
}

// lib/publishing/canonicalStore.ts
var import_node_crypto7 = require("node:crypto");

// lib/publishing/intentActions.ts
var import_node_crypto6 = require("node:crypto");
var IntentActionError = class extends Error {
  constructor(code) {
    super(code);
    this.code = code;
    this.name = "IntentActionError";
  }
};
var platforms = ["INSTAGRAM", "TIKTOK", "FACEBOOK", "LINKEDIN", "X"];
function check2(ok, code) {
  if (!ok) throw new IntentActionError(code);
}
function id(value) {
  check2(typeof value === "string" && /^[a-zA-Z0-9_-]{1,120}$/.test(value), "INVALID_IDENTIFIER");
}
function fingerprint(value) {
  function stable2(v) {
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(stable2);
    if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable2(v[k])]));
    return v;
  }
  return (0, import_node_crypto6.createHash)("sha256").update(JSON.stringify(stable2(value))).digest("hex");
}
function createPublishingIntentActions(deps) {
  async function atomic(run) {
    try {
      return await deps.database.transaction(async (tx) => {
        const isolation = (await tx.query("SHOW transaction_isolation")).rows[0]?.transaction_isolation;
        check2(isolation === "read committed", "ACTION_REQUIRES_READ_COMMITTED");
        return run(tx);
      });
    } catch (e) {
      if (e instanceof IntentActionError) throw e;
      throw new IntentActionError("ACTION_TRANSACTION_UNCONFIRMED");
    }
  }
  async function latest(tx, intentId) {
    return (await tx.query(`SELECT id,outcome,generation,"remoteReference","jobId" FROM "PublishingRetryGeneration" WHERE "intentId"=$1 ORDER BY generation DESC LIMIT 1`, [intentId])).rows[0] ?? (await tx.query(`SELECT *,1 AS generation FROM "PublishingExternalAttempt" WHERE "intentId"=$1`, [intentId])).rows[0];
  }
  function blocked(attempt) {
    if (attempt?.outcome === "CONFIRMED") return "NEW_AUTHORIZED_INTENT_REQUIRED";
    if (attempt && ["AUTHORIZED", "ACCEPTED", "UNKNOWN"].includes(attempt.outcome)) return "PENDING_RECONCILIATION";
  }
  async function invalidate(tx, i, operationId, reason) {
    await tx.query(`INSERT INTO "PublishingRevisionInvalidation"("intentId",revision,"operationId",reason) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [i.id, i.currentRevision, operationId, reason]);
    const generations = (await tx.query(`UPDATE "PublishingRetryGeneration" SET outcome='CANCELLED' WHERE "intentId"=$1 AND outcome='READY' RETURNING id`, [i.id])).rows;
    for (const g of generations) await tx.query(`INSERT INTO "PublishingRetryEvent"("operationId","generationId",outcome,actor) VALUES($1,$2,'CANCELLED','intent-action')`, [(0, import_node_crypto6.randomUUID)(), g.id]);
    await tx.query(`UPDATE "PublishingJob" SET phase='CANCELLED',"workerToken"=NULL,"workerUntil"=NULL,"updatedAt"=clock_timestamp() WHERE "intentId"=$1 AND "intentRevision"=$2 AND phase IN ('READY','PREPARED')`, [i.id, i.currentRevision]);
  }
  async function revision(tx, i, input, action) {
    check2(input.dueAt instanceof Date && Number.isFinite(input.dueAt.getTime()), "INVALID_DUE_TIME");
    await deps.validateDueTime(tx, input, action);
    const next = i ? i.currentRevision + 1 : 1;
    check2(Number.isSafeInteger(next) && next < 2147483647, "REVISION_EXHAUSTED");
    if (!i) await tx.query(`INSERT INTO "PublishingIntent"(id,"postId",platform,"currentRevision") VALUES($1,$2,$3,1)`, [input.intentId, input.postId, input.platform]);
    await tx.query(`INSERT INTO "PublishingIntentRevision"("intentId",revision,"dueAt") VALUES($1,$2,$3)`, [input.intentId, next, input.dueAt]);
    if (i) await tx.query(`UPDATE "PublishingIntent" SET state='ACTIVE',"currentRevision"=$2 WHERE id=$1`, [i.id, next]);
    const jobId = (0, import_node_crypto6.randomUUID)(), admissionId = (0, import_node_crypto6.randomUUID)();
    await tx.query(`INSERT INTO "PublishingAdmission"(id,platform) VALUES($1,$2)`, [admissionId, input.platform]);
    await tx.query(`INSERT INTO "PublishingJob"(id,"admissionId","postId",platform,lease,phase,"availableAt","intentId","intentRevision")
      SELECT $1,$2,$3,$4,GREATEST(clock_timestamp()::timestamp(3),COALESCE(max(lease)+interval '1 millisecond',clock_timestamp()::timestamp(3))),'READY',$5,$6,$7
      FROM "PublishingJob" WHERE "postId"=$3 AND platform=$4`, [jobId, admissionId, input.postId, input.platform, input.dueAt, input.intentId, next]);
    await deps.bindRevision?.(tx, input, next, jobId);
    return { next, jobId };
  }
  async function perform(action, input) {
    for (const v of [input.operationId, input.actor, input.intentId, input.postId]) id(v);
    check2(platforms.includes(input.platform) && Number.isSafeInteger(input.expectedRevision) && input.expectedRevision >= 0 && input.expectedRevision < 2147483647, "INVALID_REQUEST");
    if (input.dueAt !== void 0) check2(input.dueAt instanceof Date && Number.isFinite(input.dueAt.getTime()), "INVALID_DUE_TIME");
    const hash2 = fingerprint({ ...input, action });
    return atomic(async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [input.operationId]);
      await deps.lockAndValidatePost(tx, input, action);
      const prior = (await tx.query(`SELECT * FROM "PublishingAction" WHERE "operationId"=$1`, [input.operationId])).rows[0];
      if (prior) {
        check2(prior.actor === input.actor && prior.requestHash === hash2, "OPERATION_CONFLICT");
        return prior.result;
      }
      const i = (await tx.query(`SELECT * FROM "PublishingIntent" WHERE "postId"=$1 ORDER BY id FOR UPDATE`, [input.postId])).rows;
      const current = i.find((x) => x.id === input.intentId);
      const result = { outcome: "APPLIED", intentId: input.intentId };
      check2(!current || current.platform === input.platform, "INTENT_IDENTITY_CONFLICT");
      if (!current) {
        check2(action === "schedule" && input.expectedRevision === 0 && !i.some((x) => x.platform === input.platform), "INTENT_MISSING_OR_CONFLICT");
        const r = await revision(tx, void 0, input, action);
        result.revision = r.next;
        result.jobId = r.jobId;
      } else {
        result.revision = current.currentRevision;
        if (current.currentRevision !== input.expectedRevision) {
          result.outcome = "CONFLICT";
          result.code = "STALE_REVISION";
        } else {
          const affected = action === "edit" ? i : [current];
          for (const item of affected) {
            let busy = blocked(await latest(tx, item.id));
            const jobEvidence = (await tx.query(`SELECT phase,"remoteId",confirmation FROM "PublishingJob" WHERE "intentId"=$1 AND (phase IN ('EXTERNAL_PENDING','PROVIDER_PENDING','OUTCOME_UNKNOWN','CONFIRMED') OR "remoteId" IS NOT NULL OR confirmation IS NOT NULL) LIMIT 1`, [item.id])).rows[0];
            if (jobEvidence && busy !== "NEW_AUTHORIZED_INTENT_REQUIRED") busy = jobEvidence.phase === "CONFIRMED" ? "NEW_AUTHORIZED_INTENT_REQUIRED" : "PENDING_RECONCILIATION";
            if (busy) {
              result.outcome = busy;
              result.code = "EXTERNAL_ATTEMPT_EXISTS";
              break;
            }
          }
          if (result.outcome === "APPLIED") {
            const predecessor = await latest(tx, current.id);
            if (action === "retry") {
              check2(current.state === "ACTIVE" && predecessor?.outcome === "REJECTED", "RETRY_NOT_ELIGIBLE");
              id(input.evidenceId);
              const proof = (await tx.query(`SELECT * FROM "PublishingRetryEvidence" WHERE id=$1 AND "intentId"=$2`, [input.evidenceId, current.id])).rows[0];
              check2(proof && (predecessor.generation === 1 ? proof.rootAttemptId : proof.predecessorGenerationId) === predecessor.id, "RETRY_EVIDENCE_MISSING");
              const successor = (await tx.query(`SELECT id FROM "PublishingRetryGeneration" WHERE "rootAttemptId"=$1 OR "predecessorGenerationId"=$1`, [predecessor.id])).rows[0];
              if (successor) {
                result.outcome = "CONFLICT";
                result.code = "RETRY_ALREADY_CREATED";
              } else {
                await invalidate(tx, current, input.operationId, action);
                const r = await revision(tx, current, input, action), generationId = (0, import_node_crypto6.randomUUID)();
                await tx.query(`INSERT INTO "PublishingRetryGeneration"(id,"intentId",revision,generation,"rootAttemptId","predecessorGenerationId","evidenceId","jobId","operationId","approvedBy") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [generationId, current.id, r.next, predecessor.generation + 1, predecessor.generation === 1 ? predecessor.id : null, predecessor.generation === 1 ? null : predecessor.id, proof.id, r.jobId, input.operationId, input.actor]);
                Object.assign(result, { revision: r.next, jobId: r.jobId, generationId });
              }
            } else if (action === "schedule" || action === "reschedule") {
              if (predecessor) {
                result.outcome = "CONFLICT";
                result.code = "EXPLICIT_RETRY_REQUIRED";
              } else if (action === "schedule" && current.state === "ACTIVE" || action === "reschedule" && current.state !== "ACTIVE") {
                result.outcome = "CONFLICT";
                result.code = "INTENT_STATE_CONFLICT";
              } else {
                await invalidate(tx, current, input.operationId, action);
                const r = await revision(tx, current, input, action);
                Object.assign(result, { revision: r.next, jobId: r.jobId });
              }
            } else {
              for (const item of affected) {
                await invalidate(tx, item, input.operationId, action);
                await tx.query(`UPDATE "PublishingIntent" SET state='CANCELLED' WHERE id=$1`, [item.id]);
              }
              if (action === "edit") await deps.applyEdit(tx, input);
            }
          }
        }
      }
      await tx.query(`INSERT INTO "PublishingAction"("operationId",actor,"requestHash","intentId",action,result) VALUES($1,$2,$3,$4,$5,$6)`, [input.operationId, input.actor, hash2, input.intentId, action, result]);
      return result;
    });
  }
  async function recordRetryEvidence(input) {
    for (const v of [input.id, input.actor, input.intentId, input.predecessorId]) id(v);
    check2(typeof input.evidenceReference === "string" && input.evidenceReference.length > 0 && input.evidenceReference.length <= 200, "INVALID_EVIDENCE");
    return atomic(async (tx) => {
      await tx.query(`SELECT id FROM "PublishingIntent" WHERE id=$1 FOR UPDATE`, [input.intentId]);
      const old = (await tx.query(`SELECT * FROM "PublishingRetryEvidence" WHERE id=$1`, [input.id])).rows[0];
      if (old) {
        check2(old.intentId === input.intentId && (old.rootAttemptId ?? old.predecessorGenerationId) === input.predecessorId && old.verifiedBy === input.actor && old.evidenceReference === input.evidenceReference, "OPERATION_CONFLICT");
        return { evidenceId: old.id };
      }
      const p = await latest(tx, input.intentId);
      check2(p?.id === input.predecessorId, "PREDECESSOR_NOT_CURRENT");
      check2(p.outcome !== "CONFIRMED" && !p.remoteReference && p.outcome !== "ACCEPTED", "PUBLICATION_EVIDENCE_CONFLICT");
      const job = (await tx.query(`SELECT * FROM "PublishingJob" WHERE id=$1 FOR UPDATE`, [p.jobId])).rows[0];
      check2(job && !job.remoteId && job.confirmation === null && job.phase !== "CONFIRMED", "PUBLICATION_EVIDENCE_CONFLICT");
      const proof = await deps.verifyRetryEvidence(tx, input);
      check2(proof.actorStopped === true && proof.verified === true && proof.retryable === true && ["NOT_SENT", "PROVIDER_REJECTED"].includes(proof.kind), "EVIDENCE_DENIED");
      check2(proof.kind === "NOT_SENT" || p.outcome === "REJECTED", "REJECTION_NOT_DEFINITIVE");
      if (p.outcome !== "REJECTED") {
        check2(["AUTHORIZED", "UNKNOWN"].includes(p.outcome), "EVIDENCE_DENIED");
        if (p.generation === 1) {
          await tx.query(`INSERT INTO "PublishingAttemptEvent"("operationId","attemptId",outcome,actor) VALUES($1,$2,'REJECTED',$3)`, [(0, import_node_crypto6.randomUUID)(), p.id, input.actor]);
          await tx.query(`UPDATE "PublishingExternalAttempt" SET outcome='REJECTED' WHERE id=$1`, [p.id]);
        } else {
          await tx.query(`INSERT INTO "PublishingRetryEvent"("operationId","generationId",outcome,actor) VALUES($1,$2,'REJECTED',$3)`, [(0, import_node_crypto6.randomUUID)(), p.id, input.actor]);
          await tx.query(`UPDATE "PublishingRetryGeneration" SET outcome='REJECTED' WHERE id=$1`, [p.id]);
        }
      }
      await tx.query(`UPDATE "PublishingJob" SET phase='REJECTED',"updatedAt"=clock_timestamp() WHERE id=$1`, [job.id]);
      await tx.query(`INSERT INTO "PublishingRetryEvidence"(id,"intentId","rootAttemptId","predecessorGenerationId",kind,"actorStopped",verified,retryable,"evidenceReference","verifiedBy") VALUES($1,$2,$3,$4,$5,true,true,true,$6,$7)`, [input.id, input.intentId, p.generation === 1 ? p.id : null, p.generation === 1 ? null : p.id, proof.kind, input.evidenceReference, input.actor]);
      return { evidenceId: input.id };
    });
  }
  return {
    schedule: (i) => perform("schedule", i),
    cancel: (i) => perform("cancel", i),
    reschedule: (i) => perform("reschedule", i),
    edit: (i) => perform("edit", i),
    retry: (i) => perform("retry", i),
    recordRetryEvidence
  };
}

// lib/publishing/canonicalContract.ts
function publicationKey(i) {
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(i.intentId) || ![i.revision, i.generation].every((n) => Number.isSafeInteger(n) && n > 0 && n <= 2147483647)) throw Error("INVALID_PUBLICATION_IDENTITY");
  return `${i.intentId}:${i.revision}:${i.generation}`;
}
function legacyProjection(phase) {
  switch (phase) {
    case "READY":
    case "PREPARED":
      return "SCHEDULED";
    case "EXTERNAL_PENDING":
    case "PROVIDER_PENDING":
    case "OUTCOME_UNKNOWN":
      return "PUBLISHING";
    case "CONFIRMED":
      return "PUBLISHED";
    case "REJECTED":
      return "FAILED";
    case "CANCELLED":
      return "NOT_SCHEDULED";
  }
}

// lib/publishing/canonicalStore.ts
var CanonicalPublishingError = class extends Error {
  constructor(code) {
    super(code);
    this.code = code;
    this.name = "CanonicalPublishingError";
  }
};
function requireValue2(ok, code) {
  if (!ok) throw new CanonicalPublishingError(code);
}
function identifier3(v) {
  requireValue2(typeof v === "string" && /^[a-zA-Z0-9_-]{1,120}$/.test(v), "INVALID_IDENTIFIER");
}
function hash(v) {
  const stable2 = (value) => value instanceof Date ? value.toISOString() : Array.isArray(value) ? value.map(stable2) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable2(value[k])])) : value;
  return (0, import_node_crypto7.createHash)("sha256").update(JSON.stringify(stable2(v))).digest("hex");
}
function createCanonicalIntentActions(deps) {
  requireValue2(!deps.bindRevision, "CANONICAL_BINDING_HOOK_RESERVED");
  return createPublishingIntentActions({ ...deps, async bindRevision(tx, input, revision, jobId) {
    requireValue2(input.destination, "EXPLICIT_DESTINATION_REQUIRED");
    const d = await deps.captureRevision(tx, input);
    requireValue2(input.destination.accountBindingId === d.accountBindingId && input.destination.accountVersion === d.accountVersion, "EXPLICIT_DESTINATION_MISMATCH");
    identifier3(d.accountBindingId);
    identifier3(d.calendarId);
    requireValue2(Number.isSafeInteger(d.accountVersion) && d.accountVersion > 0 && /^[0-9a-f]{64}$/.test(d.contentHash), "INVALID_REVISION_BINDING");
    const a = (await tx.query(`SELECT * FROM "PublishingAccountBinding" WHERE id=$1 FOR SHARE`, [d.accountBindingId])).rows[0];
    requireValue2(a && a.calendarId === d.calendarId && a.platform === input.platform && a.state === "CONNECTED" && a.currentVersion === d.accountVersion, "ACCOUNT_BINDING_CHANGED");
    await tx.query(`INSERT INTO "PublishingCanonicalRevision"("intentId",revision,"jobId","accountBindingId","accountVersion","contentHash","operationId") VALUES($1,$2,$3,$4,$5,$6,$7)`, [input.intentId, revision, jobId, d.accountBindingId, d.accountVersion, d.contentHash, input.operationId]);
  } });
}
var selection = `SELECT j.id,j."postId",j.platform,j.phase,j."workerToken",j."remoteId",j."workerUntil",j."ownershipEpoch",
 j."intentId",j."intentRevision" AS revision,r."dueAt",b."accountBindingId",b."accountVersion",b."contentHash",a."calendarId",
 v."providerAccountId",v."connectionId",COALESCE(g.generation,1) AS generation
 FROM "PublishingJob" j JOIN "PublishingCanonicalRevision" b ON b."jobId"=j.id
 JOIN "PublishingIntentRevision" r ON r."intentId"=j."intentId" AND r.revision=j."intentRevision"
 JOIN "PublishingAccountBinding" a ON a.id=b."accountBindingId"
 JOIN "PublishingAccountVersion" v ON v."bindingId"=a.id AND v.version=b."accountVersion"
 LEFT JOIN "PublishingRetryGeneration" g ON g."jobId"=j.id WHERE j.id=$1`;
function createCanonicalPublishingStore(deps) {
  const db = deps.database, leaseMs = deps.preparedLeaseMs ?? 18e4;
  requireValue2(Number.isSafeInteger(leaseMs) && leaseMs > 0 && leaseMs <= 18e4, "INVALID_PREPARED_LEASE");
  async function read(tx, id3) {
    const j = (await tx.query(selection, [id3])).rows[0];
    requireValue2(j, "CANONICAL_JOB_UNBOUND");
    publicationKey({ intentId: j.intentId, revision: j.revision, generation: j.generation });
    return j;
  }
  async function atomic(run) {
    return db.transaction(async (tx) => {
      requireValue2((await tx.query("SHOW transaction_isolation")).rows[0]?.transaction_isolation === "read committed", "CANONICAL_ISOLATION_REQUIRED");
      return run(tx);
    });
  }
  async function change(action, input) {
    for (const v of [input.operationId, input.actor, input.jobId]) identifier3(v);
    requireValue2(["NETLIFY", "VPS"].includes(input.owner) && input.epoch > BigInt(0), "INVALID_OWNER");
    const digest = hash({ ...input, epoch: String(input.epoch), action });
    return atomic(async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`canonical:${input.operationId}`]);
      const old = (await tx.query(`SELECT * FROM "PublishingCanonicalOperation" WHERE "operationId"=$1`, [input.operationId])).rows[0];
      if (old) {
        requireValue2(old.requestHash === digest && old.actor === input.actor, "OPERATION_CONFLICT");
        return old.result;
      }
      const owner = (await tx.query(`SELECT * FROM "PublishingOwnership" WHERE id=1 FOR SHARE`)).rows[0];
      requireValue2(owner?.enabled && owner.state === input.owner && BigInt(owner.epoch) === input.epoch, "OWNERSHIP_FENCED");
      const snapshot = await read(tx, input.jobId);
      await deps.lockAndValidate(tx, snapshot, action);
      const a = (await tx.query(`SELECT * FROM "PublishingAccountBinding" WHERE id=$1 FOR SHARE`, [snapshot.accountBindingId])).rows[0];
      requireValue2(a?.state === "CONNECTED" && a.currentVersion === snapshot.accountVersion, "ACCOUNT_BINDING_CHANGED");
      const i = (await tx.query(`SELECT * FROM "PublishingIntent" WHERE id=$1 FOR UPDATE`, [snapshot.intentId])).rows[0];
      requireValue2(i?.state === "ACTIVE" && i.currentRevision === snapshot.revision, "INTENT_FENCED");
      const j = (await tx.query(`SELECT *,"availableAt"<=clock_timestamp() AS available,"workerUntil"<=clock_timestamp() AS expired FROM "PublishingJob" WHERE id=$1 FOR UPDATE`, [snapshot.id])).rows[0];
      requireValue2(!(await tx.query(`SELECT 1 FROM "PublishingRevisionInvalidation" WHERE "intentId"=$1 AND revision=$2`, [i.id, snapshot.revision])).rows.length, "REVISION_INVALIDATED");
      requireValue2(j.available && (await tx.query(`SELECT "dueAt"<=clock_timestamp() AS due FROM "PublishingIntentRevision" WHERE "intentId"=$1 AND revision=$2`, [i.id, snapshot.revision])).rows[0]?.due, "JOB_NOT_DUE");
      requireValue2(j.phase === "READY" || action === "prepare" && j.phase === "PREPARED" && j.expired, "JOB_NOT_ELIGIBLE");
      if (action === "admit") await tx.query(`INSERT INTO "PublishingCanonicalExecution"("jobId","intentId",revision,generation) VALUES($1,$2,$3,$4) ON CONFLICT("jobId") DO NOTHING`, [j.id, i.id, snapshot.revision, snapshot.generation]);
      const result = { outcome: action === "admit" ? "ADMITTED" : "PREPARED", jobId: j.id, identity: { intentId: i.id, revision: snapshot.revision, generation: snapshot.generation }, maySend: false };
      if (action === "prepare") {
        requireValue2((await tx.query(`SELECT 1 FROM "PublishingCanonicalExecution" WHERE "jobId"=$1`, [j.id])).rows.length, "JOB_NOT_ADMITTED");
        result.workerToken = (0, import_node_crypto7.randomUUID)();
        await tx.query(`UPDATE "PublishingJob" SET phase='PREPARED',"workerToken"=$2,"workerUntil"=clock_timestamp()+$5*interval '1 millisecond',"ownershipEpoch"=$3,"accountId"=$4,"updatedAt"=clock_timestamp() WHERE id=$1`, [j.id, result.workerToken, String(input.epoch), snapshot.providerAccountId, leaseMs]);
      }
      await tx.query(`INSERT INTO "PublishingCanonicalOperation"("operationId","jobId",action,actor,"requestHash",result) VALUES($1,$2,$3,$4,$5,$6)`, [input.operationId, j.id, action, input.actor, digest, result]);
      return result;
    });
  }
  async function changeAccount(input) {
    for (const v of [input.operationId, input.actor, input.bindingId, input.calendarId, input.connectionId]) identifier3(v);
    requireValue2(["INSTAGRAM", "TIKTOK", "FACEBOOK", "LINKEDIN", "X"].includes(input.platform) && ["CONNECTED", "DISCONNECTED"].includes(input.state) && Number.isSafeInteger(input.expectedVersion) && input.expectedVersion >= 0 && input.expectedVersion < 2147483647 && typeof input.providerAccountId === "string" && input.providerAccountId.length > 0 && input.providerAccountId.length <= 500 && /^[0-9a-f]{64}$/.test(input.authorizationHash), "INVALID_ACCOUNT");
    return atomic(async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`account:${input.calendarId}:${input.platform}`]);
      const digest = hash(input), old = (await tx.query(`SELECT * FROM "PublishingAccountEvent" WHERE "operationId"=$1`, [input.operationId])).rows[0];
      if (old) {
        requireValue2(old.requestHash === digest && old.actor === input.actor, "OPERATION_CONFLICT");
        return { version: old.version };
      }
      const a = (await tx.query(`SELECT * FROM "PublishingAccountBinding" WHERE id=$1 FOR UPDATE`, [input.bindingId])).rows[0];
      requireValue2(a ? a.currentVersion === input.expectedVersion && a.calendarId === input.calendarId && a.platform === input.platform : input.expectedVersion === 0, "ACCOUNT_VERSION_CONFLICT");
      const version = input.expectedVersion + 1;
      if (!a) await tx.query(`INSERT INTO "PublishingAccountBinding"(id,"calendarId",platform,"currentVersion",state) VALUES($1,$2,$3,1,$4)`, [input.bindingId, input.calendarId, input.platform, input.state]);
      await tx.query(`INSERT INTO "PublishingAccountVersion"("bindingId",version,"providerAccountId","connectionId","authorizationHash") VALUES($1,$2,$3,$4,$5)`, [input.bindingId, version, input.providerAccountId, input.connectionId, input.authorizationHash]);
      if (a) await tx.query(`UPDATE "PublishingAccountBinding" SET "currentVersion"=$2,state=$3 WHERE id=$1`, [input.bindingId, version, input.state]);
      await tx.query(`INSERT INTO "PublishingAccountEvent"("operationId","bindingId",version,state,actor,"requestHash") VALUES($1,$2,$3,$4,$5,$6)`, [input.operationId, input.bindingId, version, input.state, input.actor, digest]);
      return { version };
    });
  }
  return {
    admit: (i) => change("admit", i),
    prepare: (i) => change("prepare", i),
    changeAccount,
    findJob: (id3) => {
      identifier3(id3);
      return atomic((tx) => read(tx, id3));
    },
    projection: async (id3) => legacyProjection((await atomic((tx) => read(tx, id3))).phase)
  };
}

// lib/publishing/validationAdapters.ts
var PublishingValidationError = class extends IntentActionError {
  constructor(code) {
    super(code);
    this.name = "PublishingValidationError";
  }
};
function ensure2(ok, code) {
  if (!ok) throw new PublishingValidationError(code);
}
function id2(v) {
  ensure2(typeof v === "string" && /^[a-zA-Z0-9_-]{1,120}$/.test(v), "INVALID_PRINCIPAL_OR_ID");
}
function createPublishingValidationAdapters(deps) {
  async function fence(tx, exclusive = false) {
    ensure2((await tx.query("SHOW transaction_isolation")).rows[0]?.transaction_isolation === "read committed", "VALIDATION_REQUIRES_READ_COMMITTED");
    const f = (await tx.query(`SELECT version FROM "PublishingEligibilityFence" WHERE id=1 FOR ${exclusive ? "UPDATE" : "SHARE"}`)).rows[0];
    ensure2(f, "ELIGIBILITY_FENCE_MISSING");
    return String(f.version);
  }
  async function clock(tx) {
    return (await tx.query("SELECT clock_timestamp() AS now")).rows[0].now;
  }
  async function workspace(tx, calendarId) {
    id2(calendarId);
    const calendar = (await tx.query(`SELECT id,"managerId","createdAt" FROM "SocialCalendar" WHERE id=$1`, [calendarId])).rows[0];
    ensure2(calendar, "WORKSPACE_MISSING");
    const owner = (await tx.query(`SELECT id,"isDeactivated","contentWorkspacePlan","contentWorkspaceBillingStatus","contentWorkspaceTrialEndsAt","isComped","compedUntil","workspaceCompedPlan","workspaceCompedUntil","billingComplimentaryGrants" FROM "Creator" WHERE id=$1`, [calendar.managerId])).rows[0];
    ensure2(owner, "OWNER_MISSING");
    const ordinal = (await tx.query(`SELECT count(*)::integer AS ordinal FROM "SocialCalendar" WHERE "managerId"=$1 AND ("createdAt",id)<=(SELECT "createdAt",id FROM "SocialCalendar" WHERE id=$2)`, [owner.id, calendar.id])).rows[0].ordinal;
    if ((await tx.query(`SELECT to_regclass('"PublishingResourceTombstone"') IS NOT NULL AS present`)).rows[0].present && (await tx.query(`SELECT 1 FROM "PublishingResourceTombstone" WHERE ("resourceType"='WORKSPACE' AND "resourceId"=$1) OR ("resourceType"='CREATOR' AND "resourceId"=$2)`, [calendar.id, owner.id])).rows.length) throw new PublishingValidationError("WORKSPACE_RETIRED");
    const billingRevocationPending = (await tx.query(`SELECT to_regclass('"PublishingBillingRevocationHold"') IS NOT NULL AS present`)).rows[0].present && !!(await tx.query(`SELECT 1 FROM "PublishingBillingRevocationHold" h WHERE h."ownerId"=$1 AND NOT EXISTS(SELECT 1 FROM "PublishingBillingRevocationResolution" r WHERE r."ownerId"=h."ownerId" AND r."holdOperationId"=h."operationId") LIMIT 1`, [owner.id])).rows.length;
    return { calendar, owner, ordinal, billingRevocationPending };
  }
  async function snapshot(tx, postId) {
    id2(postId);
    await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`policy-post:${postId}`]);
    const post = (await tx.query(`SELECT * FROM "CalendarPost" WHERE id=$1`, [postId])).rows[0];
    ensure2(post, "POST_MISSING");
    const w = await workspace(tx, post.calendarId);
    const assets = (await tx.query(`SELECT * FROM "CalendarPostAsset" WHERE "postId"=$1 ORDER BY "displayOrder",id`, [postId])).rows;
    return { post, ...w, assets };
  }
  function entitlement(s, now) {
    ensure2(!s.billingRevocationPending, "BILLING_RECONCILIATION_REQUIRED");
    ensure2(!s.owner.isDeactivated, "OWNER_DEACTIVATED");
    ensure2(workspaceEligibility(s.owner, s.ordinal, now).allowed, "WORKSPACE_ENTITLEMENT_DENIED");
  }
  async function creator(tx, s, principalId, permission) {
    id2(principalId);
    const actor = (await tx.query(`SELECT id,"isDeactivated" FROM "Creator" WHERE id=$1`, [principalId])).rows[0];
    ensure2(actor, "CREATOR_MISSING");
    ensure2(!actor.isDeactivated, "ACTOR_DEACTIVATED");
    if (principalId === s.owner.id) return actor;
    const m = (await tx.query(`SELECT * FROM "CalendarCollaborator" WHERE "calendarId"=$1 AND "creatorId"=$2`, [s.calendar.id, principalId])).rows[0];
    ensure2(m && effectiveTeamPermissions(m.role, m.permissions, m.customPermissions).includes(permission), "WORKSPACE_PERMISSION_DENIED");
    return actor;
  }
  function approved(s) {
    ensure2(!s.post.isAiDraft, "AI_DRAFT_INELIGIBLE");
    ensure2(s.post.approvalStatus === "APPROVED", "POST_APPROVAL_REQUIRED");
  }
  async function account(tx, s, d, now) {
    id2(d.accountBindingId);
    ensure2(Number.isSafeInteger(d.accountVersion) && d.accountVersion > 0, "INVALID_ACCOUNT_VERSION");
    const a = (await tx.query(`SELECT * FROM "PublishingAccountBinding" WHERE id=$1 FOR SHARE`, [d.accountBindingId])).rows[0];
    ensure2(a && a.calendarId === s.calendar.id && a.platform === s.post.platform && a.state === "CONNECTED" && a.currentVersion === d.accountVersion, "ACCOUNT_BINDING_CHANGED");
    ensure2(!(await tx.query(`SELECT 1 FROM "PublishingAccountInvalidation" WHERE "bindingId"=$1 AND version=$2`, [a.id, d.accountVersion])).rows.length, "ACCOUNT_VERSION_INVALIDATED");
    const version = (await tx.query(`SELECT * FROM "PublishingAccountVersion" WHERE "bindingId"=$1 AND version=$2`, [a.id, d.accountVersion])).rows[0];
    ensure2(version, "ACCOUNT_VERSION_MISSING");
    const c = (await tx.query(`SELECT id,"calendarId",platform,"platformAccountId",status,"tokenScopes","accessTokenExpiresAt",("accessToken" IS NOT NULL AND length("accessToken")>0) AS "hasAccessToken" FROM "SocialConnection" WHERE id=$1`, [version.connectionId])).rows[0];
    ensure2(c && c.calendarId === s.calendar.id && c.platform === s.post.platform && c.platformAccountId === version.providerAccountId && c.status === "CONNECTED", "SOCIAL_CONNECTION_CHANGED");
    ensure2(c.hasAccessToken && (!c.accessTokenExpiresAt || c.accessTokenExpiresAt > now), "SOCIAL_TOKEN_EXPIRED");
    ensure2(accountAuthorizationHash(c) === version.authorizationHash, "ACCOUNT_AUTHORIZATION_CHANGED");
    const scopes = new Set((c.tokenScopes ?? "").split(/[\s,]+/));
    const required = { INSTAGRAM: ["instagram_content_publish"], TIKTOK: ["video.publish"], FACEBOOK: ["pages_manage_posts", "pages_read_engagement"], X: ["tweet.write", ...s.assets.length ? ["media.write"] : []], LINKEDIN: [c.platformAccountId.startsWith("urn:li:organization:") ? "w_organization_social" : "w_member_social"] };
    ensure2(required[s.post.platform]?.every((scope) => scopes.has(scope)), "SOCIAL_PERMISSION_MISSING");
    validatePublishContent(s.post.platform, s.assets, buildCaption(s.post), s.post.postType);
    if (s.post.platform === "TIKTOK") {
      await creator(tx, s, s.post.tikTokConsentBy, "publishing.manage");
      const settings = parseTikTokSettings(s.post.tikTokSettings);
      ensure2(s.post.tikTokConsentAccountId === c.platformAccountId && s.post.tikTokConsentAt && s.post.tikTokConsentBy && s.post.tikTokConsentVersion === TIKTOK_CONSENT_VERSION && s.post.tikTokConsentHash === tikTokConsentHash({ ...s.post, assets: s.assets }, settings, c.platformAccountId), "TIKTOK_CONSENT_REQUIRED");
    }
    return { version, connection: c };
  }
  function expiry(s, connection, now) {
    const dates = [
      s.owner.contentWorkspaceTrialEndsAt,
      s.owner.compedUntil,
      s.owner.workspaceCompedUntil,
      connection.accessTokenExpiresAt,
      ...Array.isArray(s.owner.billingComplimentaryGrants) ? s.owner.billingComplimentaryGrants.map((g) => new Date(g.endsAt)) : []
    ].filter((d) => d instanceof Date && Number.isFinite(d.getTime()) && d > now);
    return new Date(Math.min(now.getTime() + 3e4, ...dates.map((d) => d.getTime())));
  }
  async function validateAction(tx, input, action) {
    await fence(tx, action === "edit");
    const s = await snapshot(tx, input.postId), now = await clock(tx);
    ensure2(s.post.platform === input.platform, "POST_PLATFORM_CHANGED");
    entitlement(s, now);
    await creator(tx, s, input.actor, action === "edit" ? "calendar.edit" : "publishing.manage");
    if (["schedule", "reschedule", "retry"].includes(action)) {
      approved(s);
      ensure2(input.destination, "EXPLICIT_DESTINATION_REQUIRED");
      await account(tx, s, input.destination, now);
    }
    if (action === "edit") ensure2(s.post.approvalStatus !== "APPROVED" && !["PUBLISHING", "PUBLISHED"].includes(publishingStatus(s.post)), "APPROVED_CONTENT_LOCKED");
  }
  async function captureRevision(tx, input) {
    await fence(tx);
    const s = await snapshot(tx, input.postId), now = await clock(tx);
    entitlement(s, now);
    approved(s);
    await creator(tx, s, input.actor, "publishing.manage");
    ensure2(input.destination, "EXPLICIT_DESTINATION_REQUIRED");
    await account(tx, s, input.destination, now);
    const revision = (await tx.query(`SELECT "currentRevision" FROM "PublishingIntent" WHERE id=$1`, [input.intentId])).rows[0]?.currentRevision;
    ensure2(revision, "INTENT_MISSING");
    await tx.query(`INSERT INTO "PublishingRevisionPolicy"("intentId",revision,"calendarId","ownerId","principalId","principalKind") VALUES($1,$2,$3,$4,$5,'CREATOR')`, [input.intentId, revision, s.calendar.id, s.owner.id, input.actor]);
    return { ...input.destination, calendarId: s.calendar.id, contentHash: publishingContentHash(s.post, s.assets) };
  }
  async function validateExecution(tx, job) {
    const fenceVersion = await fence(tx);
    const canonical = (await tx.query(`SELECT j."postId",j.platform,j."intentId",j."intentRevision" AS revision,b."accountBindingId",b."accountVersion",b."contentHash",a."calendarId",v."providerAccountId",v."connectionId",COALESCE(g.generation,1) AS generation
   FROM "PublishingJob" j JOIN "PublishingCanonicalRevision" b ON b."jobId"=j.id JOIN "PublishingAccountBinding" a ON a.id=b."accountBindingId"
   JOIN "PublishingAccountVersion" v ON v."bindingId"=a.id AND v.version=b."accountVersion" LEFT JOIN "PublishingRetryGeneration" g ON g."jobId"=j.id WHERE j.id=$1`, [job.id])).rows[0];
    ensure2(canonical && ["postId", "platform", "intentId", "revision", "generation", "accountBindingId", "accountVersion", "contentHash", "calendarId", "providerAccountId", "connectionId"].every((k) => canonical[k] === job[k]), "CANONICAL_JOB_IDENTITY_CHANGED");
    if ((await tx.query(`SELECT to_regclass('"PublishingEligibilityHold"') IS NOT NULL AS present`)).rows[0].present && (await tx.query(`SELECT 1 FROM "PublishingEligibilityHold" WHERE "intentId"=$1 AND revision=$2`, [job.intentId, job.revision])).rows.length) throw new PublishingValidationError("EXPLICIT_REAUTHORIZATION_REQUIRED");
    const s = await snapshot(tx, job.postId), now = await clock(tx);
    const p = (await tx.query(`SELECT * FROM "PublishingRevisionPolicy" WHERE "intentId"=$1 AND revision=$2`, [job.intentId, job.revision])).rows[0];
    ensure2(p && p.principalKind === "CREATOR" && p.calendarId === s.calendar.id && p.ownerId === s.owner.id, "REVISION_AUTHORITY_CHANGED");
    approved(s);
    ensure2(!(await tx.query(`SELECT 1 FROM "PublishingPostEligibilityInvalidation" WHERE "intentId"=$1 AND revision=$2`, [job.intentId, job.revision])).rows.length, "POST_APPROVAL_REVISION_INVALIDATED");
    ensure2(job.calendarId === s.calendar.id && job.platform === s.post.platform, "POST_IDENTITY_CHANGED");
    entitlement(s, now);
    approved(s);
    await creator(tx, s, p.principalId, "publishing.manage");
    ensure2(job.contentHash === publishingContentHash(s.post, s.assets), "APPROVED_CONTENT_CHANGED");
    const { connection, version } = await account(tx, s, job, now);
    ensure2(job.providerAccountId === version.providerAccountId && job.connectionId === connection.id, "CANONICAL_DESTINATION_CHANGED");
    return { principalId: p.principalId, fenceVersion, validUntil: expiry(s, connection, now), maySend: false };
  }
  async function validateBeforeExternal(tx, input) {
    const o = (await tx.query(`SELECT * FROM "PublishingOwnership" WHERE id=1 FOR SHARE`)).rows[0];
    ensure2(o?.enabled && o.state === input.owner && BigInt(o.epoch) === input.epoch, "OWNERSHIP_FENCED");
    const v = await validateExecution(tx, input.job);
    const i = (await tx.query(`SELECT * FROM "PublishingIntent" WHERE id=$1 FOR UPDATE`, [input.job.intentId])).rows[0];
    ensure2(i?.state === "ACTIVE" && i.currentRevision === input.job.revision, "INTENT_FENCED");
    const j = (await tx.query(`SELECT *,"workerUntil">clock_timestamp() AS live FROM "PublishingJob" WHERE id=$1 FOR UPDATE`, [input.job.id])).rows[0];
    ensure2(j?.phase === "PREPARED" && j.live && j.workerToken === input.job.workerToken && BigInt(j.ownershipEpoch) === input.epoch, "PREPARED_JOB_FENCED");
    await tx.query(`INSERT INTO "PublishingEligibilityWitness"(id,"jobId","principalId","fenceVersion","validUntil") VALUES($1,$2,$3,$4,$5)`, [(0, import_node_crypto8.randomUUID)(), j.id, v.principalId, v.fenceVersion, v.validUntil]);
    return v;
  }
  async function validateViewerApproval(tx, input) {
    await fence(tx, true);
    const s = await snapshot(tx, input.postId), now = await clock(tx);
    ensure2(s.calendar.id === input.calendarId, "VIEWER_CALENDAR_MISMATCH");
    entitlement(s, now);
    const viewer = await deps.verifyViewer(tx, { calendarId: input.calendarId, credential: input.credential });
    ensure2(viewer.calendarId === s.calendar.id && viewer.expiresAt > await clock(tx) && viewer.principalId, "VIEWER_AUTHORITY_DENIED");
    ensure2(!s.post.isAiDraft, "AI_DRAFT_INELIGIBLE");
    ensure2(!["PUBLISHING", "PUBLISHED"].includes(publishingStatus(s.post)), "POST_ALREADY_PUBLISHING");
    const busy = (await tx.query(`SELECT 1 FROM "PublishingExternalAttempt" a JOIN "PublishingIntent" i ON i.id=a."intentId" WHERE i."postId"=$1 AND a.outcome IN ('AUTHORIZED','ACCEPTED','UNKNOWN','CONFIRMED') UNION ALL SELECT 1 FROM "PublishingRetryGeneration" a JOIN "PublishingIntent" i ON i.id=a."intentId" WHERE i."postId"=$1 AND a.outcome IN ('AUTHORIZED','ACCEPTED','UNKNOWN','CONFIRMED')`, [input.postId])).rows;
    ensure2(!busy.length, "POST_EXTERNAL_CONFLICT");
    ensure2(s.assets.length || s.post.caption?.trim() && !["INSTAGRAM", "TIKTOK"].includes(s.post.platform), "NOTHING_TO_APPROVE");
    return { authority: "VIEWER_APPROVAL", principalId: viewer.principalId, calendarId: s.calendar.id, postId: s.post.id, maySend: false };
  }
  return {
    validateAction,
    captureRevision,
    validateExecution,
    validateBeforeExternal,
    validateViewerApproval,
    async validateViewerWorkspace(tx, input) {
      await fence(tx, true);
      const w = await workspace(tx, input.calendarId);
      entitlement(w, await clock(tx));
      const viewer = await deps.verifyViewer(tx, input);
      ensure2(viewer.calendarId === w.calendar.id && viewer.expiresAt > await clock(tx) && viewer.principalId, "VIEWER_AUTHORITY_DENIED");
      return { principalId: viewer.principalId, calendarId: w.calendar.id, maySend: false };
    },
    async validateWorkspacePermission(tx, input) {
      await fence(tx);
      const w = await workspace(tx, input.calendarId);
      const p = input.permission === "VIEW_ONLY" ? "calendar.view" : input.permission === "ADD_CONTENT" ? "creatives.upload" : input.permission === "EDIT_CALENDAR" ? "calendar.edit" : input.permission;
      await creator(tx, w, input.actor, p);
      if (!p.endsWith(".view") && p !== "people.manage") entitlement(w, await clock(tx));
      return { permission: p, calendarId: w.calendar.id, actor: input.actor, maySend: false };
    },
    intentActions: (applyEdit) => createCanonicalIntentActions({
      database: deps.database,
      lockAndValidatePost: validateAction,
      captureRevision,
      applyEdit,
      validateDueTime: async (_tx, i) => ensure2(i.dueAt instanceof Date && Number.isFinite(i.dueAt.getTime()), "INVALID_DUE_TIME"),
      verifyRetryEvidence: deps.verifyRetryEvidence
    }),
    contentIntentActions: (permission) => createCanonicalIntentActions({
      database: deps.database,
      captureRevision,
      applyEdit: async () => {
      },
      verifyRetryEvidence: deps.verifyRetryEvidence,
      validateDueTime: async () => {
        throw new PublishingValidationError("CONTENT_INVALIDATION_CANNOT_SCHEDULE");
      },
      lockAndValidatePost: async (tx, input, action) => {
        ensure2(action === "edit", "CONTENT_INVALIDATION_ONLY");
        await fence(tx, true);
        const s = await snapshot(tx, input.postId);
        ensure2(s.post.platform === input.platform, "POST_PLATFORM_CHANGED");
        entitlement(s, await clock(tx));
        await creator(tx, s, input.actor, permission);
        ensure2(s.post.approvalStatus !== "APPROVED" && !["PUBLISHING", "PUBLISHED"].includes(publishingStatus(s.post)), "APPROVED_CONTENT_LOCKED");
      }
    }),
    canonicalStore: (options) => createCanonicalPublishingStore({ database: deps.database, preparedLeaseMs: options?.preparedLeaseMs, lockAndValidate: (tx, job) => validateExecution(tx, job).then(() => {
    }) }),
    // Policy mutators must take this before any application/canonical row lock.
    lockForPolicyChange: (tx) => fence(tx, true)
  };
}

// workers/publishing/composition.ts
function createDisabledVpsWorker(configuration, deps) {
  const config = validateDisabledPublishingDeployment(configuration);
  if (deps.io.kind !== "native-disabled") throw Error("DISABLED_NATIVE_PROVIDER_PORTS_REQUIRED");
  return createInactiveCanonicalWorker({ ...deps, environment: "production-disabled", owner: "VPS", concurrency: config.workerConcurrency });
}
async function checkDisabledVpsComposition(configuration) {
  const denied = async () => {
    throw Error("DISABLED_CHECK_IO_FORBIDDEN");
  }, database = { transaction: denied }, validation = createPublishingValidationAdapters({ database, verifyViewer: denied, verifyRetryEvidence: denied });
  const io = { kind: "native-disabled", refresh: denied, reserveRate: denied, creatorInfo: denied, media: denied, prepare: denied, submit: denied, lookup: denied }, spool = { append: denied, records: denied };
  const worker = createDisabledVpsWorker(configuration, { database, validation, io, spool, actor: "disabled-check", epoch: BigInt(1) });
  const result = await worker.pollOnce();
  await worker.close();
  return { state: result.state, publishingEnabled: false, databaseConnected: false, maySend: false };
}

// workers/publishing/main.ts
if (process.argv.length === 3 && process.argv[2] === "--check") {
  if (Number(process.versions.node.split(".")[0]) !== 22) {
    console.error("WORKER_CHECK_FAILED: Node.js 22 is required.");
    process.exitCode = 78;
  } else {
    console.log(JSON.stringify(preparationStatus));
  }
} else if (process.argv.length === 4 && process.argv[2] === "--check-config") {
  try {
    const configuration = validateDisabledPublishingDeployment(JSON.parse(process.argv[3]));
    console.log(JSON.stringify({ state: "disabled-deployment-check", configuration, publishingEnabled: false, databaseConnected: false, productionGo: false, runtimeImplemented: false }));
  } catch {
    console.error("WORKER_CONFIGURATION_REJECTED");
    process.exitCode = 78;
  }
} else if (process.argv.length === 4 && process.argv[2] === "--check-composition") {
  try {
    void checkDisabledVpsComposition(JSON.parse(process.argv[3])).then((status) => console.log(JSON.stringify(status))).catch(() => {
      console.error("WORKER_COMPOSITION_REJECTED");
      process.exitCode = 78;
    });
  } catch {
    console.error("WORKER_COMPOSITION_REJECTED");
    process.exitCode = 78;
  }
} else {
  console.error("WORKER_START_BLOCKED: production runtime is not implemented.");
  process.exitCode = 78;
}
