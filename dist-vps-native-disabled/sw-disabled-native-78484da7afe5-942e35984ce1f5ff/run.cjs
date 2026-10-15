"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target2, all) => {
  for (var name in all)
    __defProp(target2, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target2) => (target2 = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target2, "default", { value: mod, enumerable: true }) : target2,
  mod
));

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
var init_complimentaryAccess = __esm({
  "lib/complimentaryAccess.ts"() {
    "use strict";
  }
});

// lib/contentWorkspaceEntitlements.ts
var STORAGE_GB, GB, CONTENT_WORKSPACE_PLANS;
var init_contentWorkspaceEntitlements = __esm({
  "lib/contentWorkspaceEntitlements.ts"() {
    "use strict";
    STORAGE_GB = {
      CREATOR: 5,
      STUDIO: 50,
      UNLIMITED: 200
    };
    GB = 1e9;
    CONTENT_WORKSPACE_PLANS = {
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
  }
});

// lib/publishing/state.ts
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
var PUBLISHING_PLATFORMS;
var init_state = __esm({
  "lib/publishing/state.ts"() {
    "use strict";
    PUBLISHING_PLATFORMS = ["INSTAGRAM", "TIKTOK", "FACEBOOK", "LINKEDIN", "X"];
  }
});

// lib/publishing/eligibilityPolicy.ts
function workspaceEligibility(owner, ordinal, now) {
  const trial = ["TRIAL", "ACTIVE"].includes(owner.contentWorkspaceBillingStatus) && !!owner.contentWorkspaceTrialEndsAt && owner.contentWorkspaceTrialEndsAt > now;
  const complimentary = workspaceComplimentaryPlan(owner, now);
  const access2 = !!complimentary || owner.contentWorkspaceBillingStatus === "ACTIVE" && !!owner.contentWorkspacePlan || owner.contentWorkspaceBillingStatus === "TRIAL" && !!owner.contentWorkspacePlan && trial;
  const order = ["CREATOR", "STUDIO", "UNLIMITED"];
  const plan = trial ? "UNLIMITED" : complimentary ? owner.contentWorkspaceBillingStatus === "ACTIVE" && owner.contentWorkspacePlan && order.indexOf(owner.contentWorkspacePlan) > order.indexOf(complimentary) ? owner.contentWorkspacePlan : complimentary : owner.contentWorkspacePlan;
  return { allowed: !!access2 && !!plan && Number.isInteger(ordinal) && ordinal > 0 && ordinal <= (plan ? CONTENT_WORKSPACE_PLANS[plan]?.activeWorkspaces ?? 0 : 0), plan };
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
var import_node_crypto;
var init_eligibilityPolicy = __esm({
  "lib/publishing/eligibilityPolicy.ts"() {
    "use strict";
    import_node_crypto = require("node:crypto");
    init_complimentaryAccess();
    init_contentWorkspaceEntitlements();
    init_state();
  }
});

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
var init_canonicalContract = __esm({
  "lib/publishing/canonicalContract.ts"() {
    "use strict";
  }
});

// lib/publishing/statusProjection.ts
function createCanonicalStatusProjection(deps) {
  const project = async (target2) => deps.database.transaction(async (tx) => {
    await deps.validation.lockForPolicyChange(tx);
    const j = (await tx.query(`SELECT j.*,i.state AS "intentState",i."currentRevision" FROM "PublishingJob" j JOIN "PublishingIntent" i ON i.id=j."intentId" WHERE j.id=$1`, [target2.jobId])).rows[0];
    if (!j || j.intentRevision !== j.currentRevision) return { projected: false, maySend: false };
    const field = j.platform === "INSTAGRAM" ? "instagramPublishStatus" : j.platform === "TIKTOK" ? "tikTokPublishStatus" : "publishStatus";
    const installed = (await tx.query(`SELECT to_regclass('"PublishingEligibilityHold"') IS NOT NULL AS present`)).rows[0].present;
    const invalid = (await tx.query(`SELECT 1 FROM "PublishingPostEligibilityInvalidation" WHERE "intentId"=$1 AND revision=$2`, [j.intentId, j.intentRevision])).rows.length > 0 || installed && (await tx.query(`SELECT 1 FROM "PublishingEligibilityHold" WHERE "intentId"=$1 AND revision=$2`, [j.intentId, j.intentRevision])).rows.length > 0;
    const status = invalid && ["READY", "PREPARED", "CANCELLED"].includes(j.phase) ? "NOT_SCHEDULED" : legacyProjection(j.phase);
    const updated = (await tx.query(`UPDATE "CalendarPost" SET "${field}"=$2 WHERE id=$1 AND platform=$3 RETURNING to_jsonb("CalendarPost") AS fields`, [j.postId, status, j.platform])).rows[0];
    if (!updated) return { projected: false, maySend: false };
    if (j.remoteId) {
      const referenceField = j.platform === "INSTAGRAM" ? "instagramMediaId" : j.platform === "TIKTOK" ? "tikTokPublishId" : "platformPostId";
      if (referenceField in updated.fields) await tx.query(`UPDATE "CalendarPost" SET "${referenceField}"=$2 WHERE id=$1`, [j.postId, j.remoteId]);
    }
    if (j.phase === "CONFIRMED") {
      const rows = (await tx.query(`SELECT "publicationReferences",permalink FROM "PublishingProviderJournal" WHERE "jobId"=$1 ORDER BY "createdAt" DESC,id DESC`, [j.id])).rows;
      const refs = rows.find((r) => r.publicationReferences?.length)?.publicationReferences, knownLink = rows.find((r) => r.permalink)?.permalink;
      if (j.platform === "TIKTOK" && refs?.[0] && "platformPostId" in updated.fields) await tx.query(`UPDATE "CalendarPost" SET "platformPostId"=$2 WHERE id=$1`, [j.postId, refs[0]]);
      const publishedField = j.platform === "INSTAGRAM" ? "instagramPublishedAt" : j.platform === "TIKTOK" ? "tikTokPublishedAt" : "publishedAt";
      if (publishedField in updated.fields) await tx.query(`UPDATE "CalendarPost" SET "${publishedField}"=COALESCE("${publishedField}",clock_timestamp()) WHERE id=$1`, [j.postId]);
      const link = knownLink ?? (j.remoteId ? j.platform === "X" ? `https://x.com/i/web/status/${encodeURIComponent(j.remoteId)}` : j.platform === "FACEBOOK" ? `https://www.facebook.com/${encodeURIComponent(j.remoteId)}` : j.platform === "LINKEDIN" ? `https://www.linkedin.com/feed/update/${encodeURIComponent(j.remoteId)}` : null : null), linkField = j.platform === "INSTAGRAM" ? "instagramPermalink" : "publishPermalink";
      if (link && linkField in updated.fields) await tx.query(`UPDATE "CalendarPost" SET "${linkField}"=$2 WHERE id=$1`, [j.postId, link]);
    }
    return { projected: true, maySend: false };
  });
  return async (target2) => {
    const result = await project(target2);
    try {
      return { ...result, reporting: await projectCanonicalPublishedRecord(deps.database, target2) };
    } catch {
      return { ...result, reportingPending: true };
    }
  };
}
async function projectCanonicalPublishedRecord(database, target2) {
  return database.transaction(async (tx) => {
    if (!(await tx.query(`SELECT to_regclass('"PublishedSocialPost"') IS NOT NULL AS present`)).rows[0].present) return { reported: false };
    const row = (await tx.query(`SELECT j."postId",j."remoteId",p."calendarId",p."postType",p."publishPermalink",p."instagramPermalink",COALESCE(p."instagramPublishedAt",p."tikTokPublishedAt",p."publishedAt") AS "publishedAt" FROM "PublishingJob" j JOIN "CalendarPost" p ON p.id=j."postId" JOIN "PublishingSendCapability" c ON c."jobId"=j.id JOIN "PublishingAccountVersion" v ON v."bindingId"=c."accountBindingId" AND v.version=c."accountVersion" JOIN "SocialConnection" s ON s.id=v."connectionId" WHERE j.id=$1 AND j.phase='CONFIRMED' AND c.state='CONSUMED' AND c."intentId"=$2 AND c.revision=$3 AND c.generation=$4 AND c.platform=$5 AND c."contentHash"=$6 AND c."accountBindingId"=$7 AND c."accountVersion"=$8 AND s.id=$9 AND s."platformAccountId"=$10`, [target2.jobId, target2.intentId, target2.revision, target2.generation, target2.platform, target2.contentHash, target2.accountBindingId, target2.accountVersion, target2.connectionId, target2.providerAccountId])).rows[0];
    if (!row) return { reported: false };
    if ((await tx.query(`SELECT 1 FROM "PublishingResourceTombstone" WHERE ("resourceType"='POST' AND "resourceId"=$1) OR ("resourceType"='WORKSPACE' AND "resourceId"=$2)`, [row.postId, row.calendarId])).rows.length) return { reported: false, reason: "RETIRED_CONTENT" };
    const refs = (await tx.query(`SELECT "publicationReferences" FROM "PublishingProviderJournal" WHERE "jobId"=$1 AND "publicationReferences" IS NOT NULL ORDER BY "createdAt" DESC LIMIT 1`, [target2.jobId])).rows[0]?.publicationReferences;
    const platformPostId = target2.platform === "TIKTOK" ? refs?.[0] ?? null : row.remoteId;
    const id3 = policyHash({ jobId: target2.jobId, connectionId: target2.connectionId });
    const written = (await tx.query(`INSERT INTO "PublishedSocialPost"(id,"calendarId","calendarPostId","socialConnectionId",platform,"platformPostId","providerReference",permalink,status,"publishedAt","platformPostType","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,'PUBLISHED',COALESCE($9,clock_timestamp()),$10,clock_timestamp()) ON CONFLICT("calendarPostId","socialConnectionId") DO UPDATE SET "platformPostId"=COALESCE("PublishedSocialPost"."platformPostId",EXCLUDED."platformPostId"),"providerReference"=COALESCE("PublishedSocialPost"."providerReference",EXCLUDED."providerReference"),permalink=COALESCE("PublishedSocialPost".permalink,EXCLUDED.permalink),"publishedAt"=COALESCE("PublishedSocialPost"."publishedAt",EXCLUDED."publishedAt"),"updatedAt"=clock_timestamp(),status='PUBLISHED',"platformPostType"=COALESCE("PublishedSocialPost"."platformPostType",EXCLUDED."platformPostType") WHERE ("PublishedSocialPost"."platformPostId" IS NULL OR EXCLUDED."platformPostId" IS NULL OR "PublishedSocialPost"."platformPostId"=EXCLUDED."platformPostId") AND ("PublishedSocialPost"."providerReference" IS NULL OR "PublishedSocialPost"."providerReference"=EXCLUDED."providerReference") RETURNING id`, [id3, row.calendarId, row.postId, target2.connectionId, target2.platform, platformPostId, row.remoteId, target2.platform === "INSTAGRAM" ? row.instagramPermalink : row.publishPermalink, row.publishedAt, row.postType])).rows;
    return { reported: written.length === 1, ...!written.length ? { reason: "HISTORICAL_REPORTING_CONFLICT" } : {} };
  });
}
var init_statusProjection = __esm({
  "lib/publishing/statusProjection.ts"() {
    "use strict";
    init_eligibilityPolicy();
    init_canonicalContract();
  }
});

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
      const extensions = (await tx.query(`SELECT to_regclass('"PublishingEligibilityHold"') IS NOT NULL AS holds,to_regclass('"PublishingResourceTombstone"') IS NOT NULL AS retired`)).rows[0];
      const ready = enabled ? (await tx.query(`SELECT j.id FROM "PublishingJob" j JOIN "PublishingCanonicalRevision" b ON b."jobId"=j.id
    JOIN "PublishingIntent" i ON i.id=j."intentId" JOIN "PublishingIntentRevision" r ON r."intentId"=i.id AND r.revision=j."intentRevision"
    WHERE i.state='ACTIVE' AND i."currentRevision"=j."intentRevision" AND r."dueAt"<=clock_timestamp() AND j."availableAt"<=clock_timestamp()
    AND (j.phase='READY' OR j.phase='PREPARED' AND j."workerUntil"<=clock_timestamp())
    AND NOT EXISTS(SELECT 1 FROM "PublishingRevisionInvalidation" WHERE "intentId"=i.id AND revision=j."intentRevision")
    AND NOT EXISTS(SELECT 1 FROM "PublishingSendCapability" WHERE "jobId"=j.id)
    AND NOT EXISTS(SELECT 1 FROM "PublishingPostEligibilityInvalidation" v WHERE v."intentId"=i.id AND v.revision=j."intentRevision")
    ${extensions.holds ? `AND NOT EXISTS(SELECT 1 FROM "PublishingEligibilityHold" h WHERE h."intentId"=i.id AND h.revision=j."intentRevision")` : ""}
    ${extensions.retired ? `AND NOT EXISTS(SELECT 1 FROM "PublishingResourceTombstone" t JOIN "CalendarPost" p ON p.id=j."postId" JOIN "SocialCalendar" c ON c.id=p."calendarId" WHERE (t."resourceType"='POST' AND t."resourceId"=p.id) OR (t."resourceType"='WORKSPACE' AND t."resourceId"=c.id) OR (t."resourceType"='CREATOR' AND t."resourceId"=c."managerId"))` : ""}
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
  async function parkUnsent(target2, cause) {
    await inspect(target2);
    return deps.database.transaction(async (tx) => {
      await tx.query(`SELECT version FROM "PublishingEligibilityFence" WHERE id=1 FOR UPDATE`);
      const o = (await tx.query(`SELECT * FROM "PublishingOwnership" WHERE id=1 FOR SHARE`)).rows[0];
      if (!o?.enabled || o.state !== owner || BigInt(o.epoch) !== epoch) return;
      const pending = (await tx.query(`SELECT j.id FROM "PublishingJob" j WHERE j.id=$1 AND j.phase IN ('READY','PREPARED') AND NOT EXISTS(SELECT 1 FROM "PublishingSendCapability" WHERE "jobId"=j.id) FOR UPDATE`, [target2.jobId])).rows[0];
      if (!pending) return;
      const permanent = /ENTITLEMENT|APPROVAL|AI_DRAFT|DEACTIVATED|PERMISSION|ACCOUNT_BINDING|ACCOUNT_VERSION|ACCOUNT_AUTHORITY|POST_RETIRED|WORKSPACE_RETIRED/.test(cause);
      if (permanent && (await tx.query(`SELECT to_regclass('"PublishingEligibilityHold"') IS NOT NULL AS present`)).rows[0].present) {
        await tx.query(`INSERT INTO "PublishingEligibilityHold"("intentId",revision,reason) SELECT "intentId",revision,'CURRENT_POLICY_REAUTHORISATION_REQUIRED' FROM "PublishingCanonicalRevision" WHERE "jobId"=$1 ON CONFLICT DO NOTHING`, [target2.jobId]);
      } else {
        await tx.query(`UPDATE "PublishingJob" SET "availableAt"=clock_timestamp()+interval '30 seconds' WHERE id=$1 AND (phase='READY' OR phase='PREPARED' AND "workerUntil">clock_timestamp())`, [target2.jobId]);
      }
    });
  }
  return { poll, claim, inspect, recovery, parkUnsent };
}
var import_node_crypto2;
var init_canonicalWorkerStore = __esm({
  "lib/publishing/canonicalWorkerStore.ts"() {
    "use strict";
    import_node_crypto2 = require("node:crypto");
    init_eligibilityPolicy();
  }
});

// lib/tiktokProbe.ts
function resolveTikTokProbe() {
  if (!binaryPromise) binaryPromise = locateTikTokBinary("probe").catch((error) => {
    binaryPromise = void 0;
    throw error;
  });
  return binaryPromise;
}
function resolveTikTokConverter() {
  if (!converterPromise) converterPromise = locateTikTokBinary("converter").catch((error) => {
    converterPromise = void 0;
    throw error;
  });
  return converterPromise;
}
async function locateTikTokBinary(kind) {
  const name = kind === "probe" ? "ffprobe" : "ffmpeg";
  const relative = kind === "probe" ? (0, import_node_path.join)("node_modules", "ffprobe-static", "bin", process.platform, process.arch, process.platform === "win32" ? "ffprobe.exe" : "ffprobe") : (0, import_node_path.join)("node_modules", "ffmpeg-static", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  const roots = new Set([process.env.LAMBDA_TASK_ROOT, process.cwd()].filter((root) => !!root));
  let parent = process.cwd();
  for (let depth = 0; depth < 6; depth++) {
    roots.add(parent);
    parent = (0, import_node_path.join)(parent, "..");
  }
  for (const root of roots) {
    const archive = (0, import_node_path.join)(root, ".media-bin", `${name}-${process.platform}-${process.arch}.gz`);
    try {
      await (0, import_promises.access)(archive, import_node_fs.constants.R_OK);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    const directory = await (0, import_promises.mkdtemp)((0, import_node_path.join)((0, import_node_os.tmpdir)(), "showwork-media-"));
    const executable = (0, import_node_path.join)(directory, name);
    try {
      await (0, import_promises2.pipeline)((0, import_node_fs.createReadStream)(archive), (0, import_node_zlib.createGunzip)(), (0, import_node_fs.createWriteStream)(executable, { mode: 448 }));
      await (0, import_promises.chmod)(executable, 448);
      return executable;
    } catch (error) {
      await (0, import_promises.rm)(directory, { recursive: true, force: true });
      throw error;
    }
  }
  for (const root of roots) {
    const binary = (0, import_node_path.join)(root, relative);
    try {
      await (0, import_promises.access)(binary, import_node_fs.constants.X_OK);
      return binary;
    } catch (error) {
      if (error.code !== "EACCES") continue;
      const directory = await (0, import_promises.mkdtemp)((0, import_node_path.join)((0, import_node_os.tmpdir)(), "showwork-probe-"));
      const executable = (0, import_node_path.join)(directory, name);
      await (0, import_promises.copyFile)(binary, executable);
      await (0, import_promises.chmod)(executable, 448);
      return executable;
    }
  }
  throw new Error(`Media preparation is unavailable on the server (${kind} missing). Redeploy with the TikTok media binary included.`);
}
var import_promises, import_node_fs, import_node_zlib, import_promises2, import_node_path, import_node_os, binaryPromise, converterPromise;
var init_tiktokProbe = __esm({
  "lib/tiktokProbe.ts"() {
    "use strict";
    import_promises = require("node:fs/promises");
    import_node_fs = require("node:fs");
    import_node_zlib = require("node:zlib");
    import_promises2 = require("node:stream/promises");
    import_node_path = require("node:path");
    import_node_os = require("node:os");
  }
});

// lib/tiktokMediaPolicy.ts
function validateTikTokMediaProbe(probe, size, type, maxDuration) {
  const stream = probe.streams?.find((s) => s.codec_type === "video");
  if (!stream || !stream.width || !stream.height) throw new Error("Could not verify this file's dimensions. Upload a readable image or video.");
  if (type === "VIDEO") {
    const duration = Number(probe.format?.duration || stream.duration);
    const [numerator, denominator = "1"] = (stream.avg_frame_rate || "").split("/");
    const fps = Number(numerator) / Number(denominator);
    if (!Number.isFinite(duration) || duration <= 0 || duration > maxDuration) throw new Error(`This TikTok account supports videos up to ${maxDuration} seconds. Shorten the video before publishing.`);
    if (!Number.isFinite(fps) || fps < 23 || fps > 60) throw new Error("TikTok videos must have a frame rate between 23 and 60 FPS.");
    if (Math.min(stream.width, stream.height) < 360 || Math.max(stream.width, stream.height) > 4096) throw new Error("TikTok video dimensions must be between 360 and 4096 pixels on each side.");
    if (!["h264", "hevc", "vp8", "vp9"].includes(stream.codec_name || "") || !/(mov|mp4|matroska|webm)/.test(probe.format?.format_name || "")) throw new Error("Use an MP4, MOV or WebM video with H.264, H.265, VP8 or VP9 encoding.");
    if (size > 4 * 1024 ** 3) throw new Error("TikTok videos must be 4 GB or smaller.");
  } else {
    if (!["mjpeg", "webp"].includes(stream.codec_name || "")) throw new Error("The prepared TikTok photo must be JPEG or WebP.");
    if (Math.max(stream.width, stream.height) > 1920 || Math.min(stream.width, stream.height) > 1080) throw new Error("Resize TikTok photos to 1080p or smaller before publishing.");
    if (size > 20 * 1024 ** 2) throw new Error("Each TikTok photo must be 20 MB or smaller.");
  }
}
async function convertTikTokImage(input) {
  const image = (0, import_sharp.default)(input, { animated: false, limitInputPixels: 1e8 });
  const metadata = await image.metadata();
  const rotated = (metadata.orientation || 1) >= 5;
  const width = rotated ? metadata.height : metadata.width;
  const height = rotated ? metadata.width : metadata.height;
  const landscape = (width || 0) > (height || 0);
  return image.rotate().flatten({ background: "#ffffff" }).resize({ width: landscape ? 1920 : 1080, height: landscape ? 1080 : 1920, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}
async function prepareTikTokImage(input, filename = "") {
  try {
    return await convertTikTokImage(input);
  } catch {
    const brands = input.subarray(8, 64).toString("ascii");
    if (input.subarray(4, 8).toString("ascii") === "ftyp" && /heic|heix|hevc|hevx|mif1|msf1/.test(brands)) {
      try {
        const convert = require("heic-convert");
        return await convertTikTokImage(Buffer.from(await convert({ buffer: input, format: "PNG" })));
      } catch {
        throw new Error("This HEIC/HEIF image could not be decoded. Export a PNG or JPEG copy from your photo app and try again.");
      }
    }
    const binary = await resolveTikTokConverter();
    const directory = await (0, import_promises3.mkdtemp)((0, import_node_path2.join)((0, import_node_os2.tmpdir)(), "showwork-image-"));
    try {
      const extension = filename.split(".").pop()?.toLowerCase();
      const source = (0, import_node_path2.join)(directory, `source.${extension && /^[a-z0-9]{1,8}$/.test(extension) ? extension : "bin"}`);
      const output = (0, import_node_path2.join)(directory, "frame.png");
      await (0, import_promises3.writeFile)(source, input);
      await run(binary, ["-v", "error", "-nostdin", "-protocol_whitelist", "file,pipe", "-format_whitelist", IMAGE_FORMATS, "-i", source, "-frames:v", "1", "-vf", "scale=1080:1080:force_original_aspect_ratio=decrease", output], { timeout: 3e4, maxBuffer: 1024 * 1024 });
      const { readFile: readFile2 } = await import("node:fs/promises");
      return await convertTikTokImage(await readFile2(output));
    } catch {
      throw new Error("This image could not be decoded for TikTok. Export it as PNG or JPEG and upload that copy. Proprietary camera/editor files may require their original software.");
    } finally {
      await (0, import_promises3.rm)(directory, { recursive: true, force: true });
    }
  }
}
function validateTikTokSourceVideo(probe, size, maxDuration) {
  const stream = probe.streams?.find((s) => s.codec_type === "video");
  const duration = Number(probe.format?.duration || stream?.duration);
  if (!stream || !stream.width || !stream.height || !Number.isFinite(duration) || duration <= 0) throw new Error("This video could not be decoded. Export a playable video and upload it again.");
  if (duration > maxDuration) throw new Error(`This TikTok account supports videos up to ${maxDuration} seconds. Shorten the video before publishing.`);
  if (size > 4 * 1024 ** 3) throw new Error("TikTok videos must be 4 GB or smaller.");
}
function tikTokConversionArgs(url, output, probe) {
  const stream = probe.streams?.find((s) => s.codec_type === "video");
  const [n, d = "1"] = (stream?.avg_frame_rate || "30/1").split("/");
  const sourceFps = Number(n) / Number(d);
  const fps = Number.isFinite(sourceFps) && sourceFps >= 23 && sourceFps <= 60 ? sourceFps : 30;
  return [
    "-v",
    "error",
    "-nostdin",
    "-rw_timeout",
    "15000000",
    "-protocol_whitelist",
    "https,http,tls,tcp",
    "-format_whitelist",
    VIDEO_FORMATS,
    "-i",
    url,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-vf",
    `scale=w='min(1920,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,pad=max(360\\,iw):max(360\\,ih):(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps},format=yuv420p`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "22",
    "-threads",
    "2",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    // Bound temporary disk use. Duration comparison below rejects truncation.
    "-fs",
    String(450 * 1024 ** 2),
    output
  ];
}
var import_sharp, import_node_child_process, import_node_util, import_promises3, import_node_path2, import_node_os2, run, VIDEO_FORMATS, IMAGE_FORMATS;
var init_tiktokMediaPolicy = __esm({
  "lib/tiktokMediaPolicy.ts"() {
    "use strict";
    import_sharp = __toESM(require("sharp"));
    import_node_child_process = require("node:child_process");
    import_node_util = require("node:util");
    import_promises3 = require("node:fs/promises");
    import_node_path2 = require("node:path");
    import_node_os2 = require("node:os");
    init_tiktokProbe();
    run = (0, import_node_util.promisify)(import_node_child_process.execFile);
    VIDEO_FORMATS = "mov,matroska,webm,avi,asf,flv,mpeg,mpegvideo,mpegts,ogg,rm,mxf,dv,nut";
    IMAGE_FORMATS = "image2,image2pipe,jpeg_pipe,png_pipe,webp_pipe,bmp_pipe,tiff_pipe,jpeg2000_pipe,exr_pipe,psd_pipe,ico,gif,apng,mov,avif";
  }
});

// lib/publishing/nativeTikTokMedia.ts
async function prepareCanonicalTikTokMedia(input) {
  if (input.mediaType === "PHOTO") {
    if (input.bytes.length > 100 * 1024 * 1024) throw Error("TIKTOK_IMAGE_SOURCE_TOO_LARGE");
    const bytes = await prepareTikTokImage(input.bytes, input.fileKey);
    if (bytes.length > 20 * 1024 * 1024) throw Error("TIKTOK_PREPARED_IMAGE_TOO_LARGE");
    return { bytes, type: "image/jpeg" };
  }
  if (input.mediaType !== "VIDEO") throw Error("TIKTOK_MEDIA_TYPE_REQUIRED");
  const directory = await (0, import_promises4.mkdtemp)((0, import_node_path3.join)((0, import_node_os3.tmpdir)(), "showwork-canonical-media-"));
  try {
    const source = (0, import_node_path3.join)(directory, "source"), output = (0, import_node_path3.join)(directory, "video.mp4");
    await (0, import_promises4.writeFile)(source, input.bytes);
    const probeBinary = await resolveTikTokProbe();
    const inspect = async (file) => JSON.parse((await run2(probeBinary, ["-v", "error", "-protocol_whitelist", "file,pipe", "-show_streams", "-show_format", "-of", "json", file], { timeout: 1e4, maxBuffer: 1024 * 1024 })).stdout);
    const probe = await inspect(source);
    validateTikTokSourceVideo(probe, input.bytes.length, input.creator.max_video_post_duration_sec);
    let compatible = ["video/mp4", "video/quicktime", "video/webm"].includes(input.type) && (!(probe.format?.format_name || "").includes("matroska") || input.type === "video/webm");
    try {
      validateTikTokMediaProbe(probe, input.bytes.length, "VIDEO", input.creator.max_video_post_duration_sec);
    } catch {
      compatible = false;
    }
    if (compatible) return null;
    const args = tikTokConversionArgs(source, output, probe);
    args[args.indexOf("-protocol_whitelist") + 1] = "file,pipe";
    await run2(await resolveTikTokConverter(), args, { timeout: 45e3, maxBuffer: 1024 * 1024 });
    const size = (await (0, import_promises4.stat)(output)).size, result = await inspect(output);
    validateTikTokMediaProbe(result, size, "VIDEO", input.creator.max_video_post_duration_sec);
    const duration = Number(probe.format?.duration || probe.streams?.find((s) => s.codec_type === "video")?.duration);
    if (Math.abs(duration - Number(result.format?.duration)) > Math.max(0.5, duration * 2e-3)) throw Error("TIKTOK_CONVERSION_INCOMPLETE");
    return { bytes: await (0, import_promises4.readFile)(output), type: "video/mp4" };
  } finally {
    await (0, import_promises4.rm)(directory, { recursive: true, force: true });
  }
}
var import_node_child_process2, import_node_util2, import_promises4, import_node_path3, import_node_os3, run2;
var init_nativeTikTokMedia = __esm({
  "lib/publishing/nativeTikTokMedia.ts"() {
    "use strict";
    import_node_child_process2 = require("node:child_process");
    import_node_util2 = require("node:util");
    import_promises4 = require("node:fs/promises");
    import_node_path3 = require("node:path");
    import_node_os3 = require("node:os");
    init_tiktokMediaPolicy();
    init_tiktokProbe();
    run2 = (0, import_node_util2.promisify)(import_node_child_process2.execFile);
  }
});

// lib/publishing/transactionDatabase.ts
function createPublishingTransactionDatabase(pool, options) {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(options.schema)) throw new PublishingTransactionError("INVALID_SCHEMA");
  return { async transaction(run3) {
    if (active.getStore()) throw new PublishingTransactionError("NESTED_PUBLISHING_TRANSACTION");
    return active.run(true, async () => {
      const c = await pool.connect();
      let commitStarted = false, broken = false, open = false;
      const tx = { async query(sql, values) {
        if (!open) throw new PublishingTransactionError("TRANSACTION_SCOPE_CLOSED");
        if (!/^\s*(SELECT|INSERT|UPDATE|DELETE|WITH|SHOW)\b/i.test(sql) || /;|\b(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|PREPARE\s+TRANSACTION|SET\s+(?:LOCAL\s+)?TRANSACTION)\b/i.test(sql))
          throw new PublishingTransactionError("TRANSACTION_CONTROL_FORBIDDEN");
        return c.query({ text: sql, values: values?.map(utcParameter), types: utcTypes });
      } };
      try {
        await c.query("BEGIN ISOLATION LEVEL READ COMMITTED");
        await c.query(`SET LOCAL search_path TO "${options.schema}"`);
        await c.query("SET LOCAL timezone='UTC'");
        await c.query("SET LOCAL statement_timeout='3000ms'");
        await c.query("SET LOCAL lock_timeout='2000ms'");
        open = true;
        const value = await run3(tx);
        open = false;
        commitStarted = true;
        await c.query("COMMIT");
        return value;
      } catch (e) {
        open = false;
        if (commitStarted) {
          broken = true;
          throw new PublishingTransactionError("PUBLISHING_COMMIT_UNCONFIRMED");
        }
        try {
          await c.query("ROLLBACK");
        } catch {
          broken = true;
        }
        throw e;
      } finally {
        open = false;
        c.release(broken);
      }
    });
  } };
}
var import_node_async_hooks, import_pg, PublishingTransactionError, active, utcTypes, utcParameter;
var init_transactionDatabase = __esm({
  "lib/publishing/transactionDatabase.ts"() {
    "use strict";
    import_node_async_hooks = require("node:async_hooks");
    import_pg = require("pg");
    PublishingTransactionError = class extends Error {
      constructor(code) {
        super(code);
        this.code = code;
        this.name = "PublishingTransactionError";
      }
    };
    active = new import_node_async_hooks.AsyncLocalStorage();
    utcTypes = { getTypeParser: ((oid, format) => oid === 1114 && format !== "binary" ? (value) => {
      if (value === "infinity" || value === "-infinity") return import_pg.types.getTypeParser(oid, "text")(value);
      const date = /* @__PURE__ */ new Date(value.replace(" ", "T") + "Z");
      if (!Number.isFinite(date.getTime())) throw new PublishingTransactionError("INVALID_APPLICATION_TIMESTAMP");
      return date;
    } : import_pg.types.getTypeParser(oid, format)) };
    utcParameter = (value) => value instanceof Date ? value.toISOString() : Array.isArray(value) ? value.map(utcParameter) : value;
  }
});

// lib/publishing/objectStorageAdapters.ts
function createPublishingObjectStorage(deps) {
  if (!deps.bucket || !/^publishing\/[A-Za-z0-9_-]+\/$/.test(deps.prefix)) throw Error("PUBLISHING_STORAGE_CONFIGURATION_REQUIRED");
  const limit = deps.maxMediaBytes ?? 512 * 1024 * 1024;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 512 * 1024 * 1024) throw Error("INVALID_MEDIA_LIMIT");
  const key = (value) => {
    if (!/^[A-Za-z0-9_./-]+$/.test(value) || value.split("/").some((segment) => segment === ".." || segment === ".") || value.startsWith("/")) throw Error("UNSAFE_OBJECT_KEY");
    return deps.prefix + value;
  };
  async function read(value, version, max = 4096, source = false) {
    const storageKey = source ? key(value).slice(deps.prefix.length) : key(value);
    const conditional = version?.startsWith("etag:") ? version.slice(5) : void 0;
    if (conditional && !/^"[A-Za-z0-9_-]+"$/.test(conditional)) throw Error("STRONG_OBJECT_ETAG_REQUIRED");
    const response = await deps.client.send(new import_client_s3.GetObjectCommand({ Bucket: deps.bucket, Key: storageKey, ...conditional ? { IfMatch: conditional } : version ? { VersionId: version } : {} }), { abortSignal: AbortSignal.timeout(3e4) });
    if (!response.Body || response.ContentLength === void 0 || response.ContentLength > max) throw Error("STORAGE_OBJECT_LENGTH_REQUIRED");
    let length = 0;
    const chunks = [];
    for await (const chunk of response.Body) {
      length += chunk.byteLength;
      if (length > max) throw Error("STORAGE_OBJECT_TOO_LARGE");
      chunks.push(Buffer.from(chunk));
    }
    if (length !== response.ContentLength) throw Error("STORAGE_OBJECT_TRUNCATED");
    const actualVersion = conditional ? response.ETag ? "etag:" + response.ETag : void 0 : response.VersionId ?? (response.ETag ? "etag:" + response.ETag : void 0);
    return { bytes: Buffer.concat(chunks), version: actualVersion, type: response.ContentType ?? "application/octet-stream" };
  }
  const journal = {
    async putIfAbsent(value, body) {
      if (!/^publishing\/[A-Za-z0-9_-]+\/[a-f0-9]{64}$/.test(value) || Buffer.byteLength(body) > 4096) throw Error("INVALID_JOURNAL_OBJECT");
      try {
        await deps.client.send(new import_client_s3.PutObjectCommand({ Bucket: deps.bucket, Key: key(value), Body: body, ContentType: "application/json", IfNoneMatch: "*" }), { abortSignal: AbortSignal.timeout(3e4) });
      } catch (error) {
        if (error.$metadata?.httpStatusCode !== 412) throw error;
      }
      const stored = (await read(value)).bytes.toString("utf8");
      if (stored !== body) {
        let equivalent = false;
        try {
          equivalent = policyHash(JSON.parse(stored)) === policyHash(JSON.parse(body));
        } catch {
        }
        if (!equivalent) throw Error("JOURNAL_STORAGE_CONFLICT");
      }
      return { durablyCommitted: true };
    },
    async read(value) {
      return (await read(value)).bytes.toString("utf8");
    },
    async list(value) {
      if (!/^publishing\/[A-Za-z0-9_-]+\/$/.test(value)) throw Error("INVALID_JOURNAL_PREFIX");
      let token;
      const values = [];
      do {
        const page = await deps.client.send(new import_client_s3.ListObjectsV2Command({ Bucket: deps.bucket, Prefix: key(value), ContinuationToken: token }), { abortSignal: AbortSignal.timeout(3e4) });
        for (const item of page.Contents ?? []) if (item.Key) values.push(item.Key.slice(deps.prefix.length));
        if (values.length > 1e4) throw Error("JOURNAL_LIST_LIMIT");
        token = page.IsTruncated ? page.NextContinuationToken : void 0;
        if (page.IsTruncated && !token) throw Error("JOURNAL_PAGINATION_INVALID");
      } while (token);
      return values.sort();
    }
  };
  async function materialize(input) {
    if (!/^[A-Za-z0-9_-]+$/.test(input.jobId) || !/^[A-Za-z0-9_-]+$/.test(input.assetId) || !/^[a-f0-9]{64}$/.test(input.contentSha256)) throw Error("INVALID_MEDIA_IDENTITY");
    const source = await read(input.sourceKey, input.objectVersion, limit, true);
    if (source.version !== input.objectVersion || (0, import_node_crypto3.createHash)("sha256").update(source.bytes).digest("hex") !== input.contentSha256) throw Error("MEDIA_SOURCE_CHANGED");
    const blobKey = `publishing/${input.jobId}/${input.assetId}/${input.contentSha256}`;
    try {
      await deps.client.send(new import_client_s3.PutObjectCommand({ Bucket: deps.bucket, Key: blobKey, Body: source.bytes, ContentType: source.type, IfNoneMatch: "*" }), { abortSignal: AbortSignal.timeout(3e4) });
    } catch (error) {
      if (error.$metadata?.httpStatusCode !== 412) throw error;
    }
    const copied = await read(blobKey, void 0, limit, true);
    if ((0, import_node_crypto3.createHash)("sha256").update(copied.bytes).digest("hex") !== input.contentSha256) throw Error("IMMUTABLE_MEDIA_COPY_CONFLICT");
    return { blobKey, objectVersion: input.objectVersion, contentSha256: input.contentSha256 };
  }
  async function verifySource(sourceKey, version) {
    const source = await read(sourceKey, version, limit, true);
    if (!source.version || source.version.startsWith("etag:") && !/^etag:"[A-Za-z0-9_-]+"$/.test(source.version)) throw Error("VERIFIED_SOURCE_VERSION_REQUIRED");
    if (version && source.version !== version) throw Error("MEDIA_SOURCE_CHANGED");
    return { objectVersion: source.version, contentSha256: (0, import_node_crypto3.createHash)("sha256").update(source.bytes).digest("hex"), sizeBytes: String(source.bytes.length), mediaType: source.type.startsWith("video/") ? "VIDEO" : source.type.startsWith("image/") ? "PHOTO" : (() => {
      throw Error("INVALID_SOURCE_MEDIA_TYPE");
    })() };
  }
  const originalKey = (value) => {
    const checked = key(value).slice(deps.prefix.length);
    if (checked.startsWith("publishing/")) throw Error("IMMUTABLE_STORAGE_OPERATION_FORBIDDEN");
    return checked;
  };
  async function originalVersion(value) {
    try {
      const object = await deps.client.send(new import_client_s3.HeadObjectCommand({ Bucket: deps.bucket, Key: originalKey(value) }), { abortSignal: AbortSignal.timeout(3e4) });
      const version = object.VersionId ?? (object.ETag ? "etag:" + object.ETag : null);
      if (!version) throw Error("ORIGINAL_VERSION_REQUIRED");
      return version;
    } catch (error) {
      if (error.$metadata?.httpStatusCode === 404) return null;
      throw error;
    }
  }
  async function deleteOriginalVersion(value, version) {
    if (version.startsWith("etag:") && !/^etag:"[A-Za-z0-9_-]+"$/.test(version)) throw Error("STRONG_OBJECT_ETAG_REQUIRED");
    if (!version) throw Error("ORIGINAL_VERSION_REQUIRED");
    await deps.client.send(new import_client_s3.DeleteObjectCommand({ Bucket: deps.bucket, Key: originalKey(value), ...version.startsWith("etag:") ? { IfMatch: version.slice(5) } : { VersionId: version } }), { abortSignal: AbortSignal.timeout(3e4) });
  }
  async function completeOriginalMultipart(value, uploadId, parts) {
    if (!uploadId || parts.length < 1 || parts.length > 1e4 || parts.some((part, index) => part.PartNumber !== index + 1)) throw Error("INVALID_MULTIPART_COMPLETION");
    const storageKey = originalKey(value), uploaded = [];
    let marker, pages = 0;
    do {
      if (++pages > 100) throw Error("MULTIPART_PAGE_LIMIT");
      const page = await deps.client.send(new import_client_s3.ListPartsCommand({ Bucket: deps.bucket, Key: storageKey, UploadId: uploadId, PartNumberMarker: marker }), { abortSignal: AbortSignal.timeout(3e4) });
      for (const part of page.Parts ?? []) if (part.PartNumber && part.ETag) uploaded.push({ PartNumber: part.PartNumber, ETag: part.ETag });
      if (uploaded.length > 1e4) throw Error("MULTIPART_PART_LIMIT");
      marker = page.IsTruncated ? page.NextPartNumberMarker === void 0 ? (() => {
        throw Error("MULTIPART_PAGINATION_INVALID");
      })() : String(page.NextPartNumberMarker) : void 0;
    } while (marker);
    uploaded.sort((a, b) => a.PartNumber - b.PartNumber);
    if (uploaded.length !== parts.length || uploaded.some((part, index) => part.PartNumber !== parts[index].PartNumber)) throw Error("MULTIPART_PARTS_INCOMPLETE");
    await deps.client.send(new import_client_s3.CompleteMultipartUploadCommand({ Bucket: deps.bucket, Key: storageKey, UploadId: uploadId, MultipartUpload: { Parts: uploaded } }), { abortSignal: AbortSignal.timeout(3e4) });
  }
  async function readPinned(blobKey, contentSha256) {
    if (!/^publishing\/[A-Za-z0-9_-]+\//.test(blobKey) || !/^[a-f0-9]{64}$/.test(contentSha256)) throw Error("INVALID_MEDIA_PIN");
    const value = await read(blobKey, void 0, limit, true);
    if ((0, import_node_crypto3.createHash)("sha256").update(value.bytes).digest("hex") !== contentSha256) throw Error("IMMUTABLE_MEDIA_COPY_CONFLICT");
    return { bytes: value.bytes, type: value.type };
  }
  async function storePrepared(jobId, assetId, bytes, type) {
    if (!/^[A-Za-z0-9_-]+$/.test(jobId) || !/^[A-Za-z0-9_-]+$/.test(assetId) || !bytes.length || bytes.length > limit) throw Error("INVALID_PREPARED_MEDIA");
    const hash2 = (0, import_node_crypto3.createHash)("sha256").update(bytes).digest("hex"), blobKey = `publishing/${jobId}/${assetId}/${hash2}.${type === "image/jpeg" ? "jpg" : "mp4"}`;
    try {
      await deps.client.send(new import_client_s3.PutObjectCommand({ Bucket: deps.bucket, Key: blobKey, Body: bytes, ContentType: type, IfNoneMatch: "*" }), { abortSignal: AbortSignal.timeout(3e4) });
    } catch (error) {
      if (error.$metadata?.httpStatusCode !== 412) throw error;
    }
    await readPinned(blobKey, hash2);
    return blobKey;
  }
  const preparationKey = (jobId, requestHash) => {
    if (!/^[A-Za-z0-9_-]+$/.test(jobId) || !/^[a-f0-9]{64}$/.test(requestHash)) throw Error("INVALID_PROVIDER_PREPARATION_KEY");
    return `publishing/preparation-${jobId}/${requestHash}`;
  };
  async function readPreparation(jobId, requestHash) {
    try {
      return JSON.parse((await read(preparationKey(jobId, requestHash))).bytes.toString("utf8"));
    } catch (error) {
      if (error.$metadata?.httpStatusCode === 404) return null;
      throw error;
    }
  }
  async function writePreparation(jobId, requestHash, response) {
    await journal.putIfAbsent(preparationKey(jobId, requestHash), JSON.stringify(response));
  }
  return { journal, materialize, verifySource, originalVersion, deleteOriginalVersion, completeOriginalMultipart, readPinned, storePrepared, readPreparation, writePreparation };
}
var import_node_crypto3, import_client_s3;
var init_objectStorageAdapters = __esm({
  "lib/publishing/objectStorageAdapters.ts"() {
    "use strict";
    import_node_crypto3 = require("node:crypto");
    import_client_s3 = require("@aws-sdk/client-s3");
    init_eligibilityPolicy();
  }
});

// lib/publishing/sharedJournal.ts
function createSharedPublishingJournal(storage) {
  return {
    async append(event) {
      const value = JSON.stringify(Object.fromEntries(Object.entries(event).sort(([a], [b]) => a.localeCompare(b))));
      if (Buffer.byteLength(value) > 4096) throw Error("JOURNAL_EVENT_TOO_LARGE");
      const key = `publishing/${event.authorizationId}/${event.id}`;
      const receipt = await storage.putIfAbsent(key, value);
      if (receipt?.durablyCommitted !== true) throw Error("JOURNAL_DURABILITY_UNACKNOWLEDGED");
      if (policyHash(JSON.parse(await storage.read(key))) !== policyHash(JSON.parse(value))) throw Error("JOURNAL_STORAGE_CONFLICT");
    },
    async records(authorizationId) {
      const keys = await storage.list(`publishing/${authorizationId}/`), rows = [];
      for (const key of keys) {
        const event = JSON.parse(await storage.read(key));
        const { id: id3, ...body } = event;
        if (event.authorizationId !== authorizationId || id3 !== policyHash(body)) throw Error("JOURNAL_INTEGRITY_FAILED");
        rows.push(event);
      }
      return rows;
    }
  };
}
var init_sharedJournal = __esm({
  "lib/publishing/sharedJournal.ts"() {
    "use strict";
    init_eligibilityPolicy();
  }
});

// lib/calendarTeamPolicy.ts
function normalizeTeamRole(role) {
  if (role === "EDIT_CALENDAR") return "SOCIAL_MEDIA_MANAGER";
  if (role === "ADD_CONTENT") return "CREATIVE_CONTRIBUTOR";
  if (role === "VIEW_ONLY") return "VIEWER";
  return Object.hasOwn(TEAM_ROLES, role) ? role : null;
}
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
var TEAM_PERMISSIONS, ALL_TEAM_PERMISSIONS, SOCIAL, TEAM_ROLES, DEPENDENCIES;
var init_calendarTeamPolicy = __esm({
  "lib/calendarTeamPolicy.ts"() {
    "use strict";
    TEAM_PERMISSIONS = {
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
    ALL_TEAM_PERMISSIONS = Object.keys(TEAM_PERMISSIONS);
    SOCIAL = ["calendar.view", "calendar.edit", "creatives.upload", "publishing.manage", "delivery.manage", "analytics.view", "analytics.manage", "ai.generate", "knowledge.view", "channels.view"];
    TEAM_ROLES = {
      OWNER: { label: "Owner", description: "Owns the workspace, billing, and all access decisions.", defaults: ALL_TEAM_PERMISSIONS, allowed: ALL_TEAM_PERMISSIONS },
      MANAGER: { label: "Manager", description: "Runs this workspace, its team, channels, and business knowledge. Billing and ownership stay with the owner.", defaults: ALL_TEAM_PERMISSIONS, allowed: ALL_TEAM_PERMISSIONS },
      SOCIAL_MEDIA_MANAGER: { label: "Social Media Manager", description: "Plans content, delivers it for client review, publishes, and tracks results.", defaults: SOCIAL, allowed: [...SOCIAL, "inbox.view", "inbox.reply", "leads.view", "leads.manage"] },
      CREATIVE_CONTRIBUTOR: { label: "Creative Contributor", description: "Views planned content and uploads creative assets. Cannot edit the calendar or publish.", defaults: ["calendar.view", "creatives.upload"], allowed: ["calendar.view", "creatives.upload"] },
      INBOX_AGENT: { label: "Inbox Agent", description: "Reads and replies to messages only. No calendar, leads, reports, documents, or team access.", defaults: ["inbox.view", "inbox.reply"], allowed: ["inbox.view", "inbox.reply"] },
      VIEWER: { label: "Viewer", description: "Reads the selected areas without making changes.", defaults: ["calendar.view"], allowed: ["calendar.view", "analytics.view", "inbox.view", "leads.view", "knowledge.view", "channels.view"] }
    };
    DEPENDENCIES = {
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
  }
});

// lib/tiktokSettings.ts
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
var TIKTOK_CONSENT_VERSION, emptyTikTokSettings;
var init_tiktokSettings = __esm({
  "lib/tiktokSettings.ts"() {
    "use strict";
    TIKTOK_CONSENT_VERSION = "2026-10-08-v2-conversion";
    emptyTikTokSettings = {
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
  }
});

// lib/tiktokConsent.ts
function tikTokConsentHash(post, settings, accountId) {
  return (0, import_node_crypto4.createHash)("sha256").update(JSON.stringify({
    version: TIKTOK_CONSENT_VERSION,
    accountId,
    caption: buildCaption(post),
    postType: post.postType ?? null,
    settings,
    assets: [...post.assets].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id.localeCompare(b.id)).map((a) => ({ id: a.id, key: a.fileKey, type: a.mediaType, ...a.objectVersion != null && a.contentSha256 != null ? { objectVersion: a.objectVersion, contentSha256: a.contentSha256 } : {} }))
  })).digest("hex");
}
var import_node_crypto4;
var init_tiktokConsent = __esm({
  "lib/tiktokConsent.ts"() {
    "use strict";
    import_node_crypto4 = require("node:crypto");
    init_state();
    init_tiktokSettings();
  }
});

// lib/publishing/intentActions.ts
function check(ok, code) {
  if (!ok) throw new IntentActionError(code);
}
function id(value) {
  check(typeof value === "string" && /^[a-zA-Z0-9_-]{1,120}$/.test(value), "INVALID_IDENTIFIER");
}
function fingerprint(value) {
  function stable2(v) {
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(stable2);
    if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable2(v[k])]));
    return v;
  }
  return (0, import_node_crypto5.createHash)("sha256").update(JSON.stringify(stable2(value))).digest("hex");
}
function createPublishingIntentActions(deps) {
  async function atomic(run3) {
    try {
      return await deps.database.transaction(async (tx) => {
        const isolation = (await tx.query("SHOW transaction_isolation")).rows[0]?.transaction_isolation;
        check(isolation === "read committed", "ACTION_REQUIRES_READ_COMMITTED");
        return run3(tx);
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
    for (const g of generations) await tx.query(`INSERT INTO "PublishingRetryEvent"("operationId","generationId",outcome,actor) VALUES($1,$2,'CANCELLED','intent-action')`, [(0, import_node_crypto5.randomUUID)(), g.id]);
    await tx.query(`UPDATE "PublishingJob" SET phase='CANCELLED',"workerToken"=NULL,"workerUntil"=NULL,"updatedAt"=clock_timestamp() WHERE "intentId"=$1 AND "intentRevision"=$2 AND phase IN ('READY','PREPARED')`, [i.id, i.currentRevision]);
  }
  async function revision(tx, i, input, action) {
    check(input.dueAt instanceof Date && Number.isFinite(input.dueAt.getTime()), "INVALID_DUE_TIME");
    await deps.validateDueTime(tx, input, action);
    const next = i ? i.currentRevision + 1 : 1;
    check(Number.isSafeInteger(next) && next < 2147483647, "REVISION_EXHAUSTED");
    if (!i) await tx.query(`INSERT INTO "PublishingIntent"(id,"postId",platform,"currentRevision") VALUES($1,$2,$3,1)`, [input.intentId, input.postId, input.platform]);
    await tx.query(`INSERT INTO "PublishingIntentRevision"("intentId",revision,"dueAt") VALUES($1,$2,$3)`, [input.intentId, next, input.dueAt]);
    if (i) await tx.query(`UPDATE "PublishingIntent" SET state='ACTIVE',"currentRevision"=$2 WHERE id=$1`, [i.id, next]);
    const jobId = (0, import_node_crypto5.randomUUID)(), admissionId = (0, import_node_crypto5.randomUUID)();
    await tx.query(`INSERT INTO "PublishingAdmission"(id,platform) VALUES($1,$2)`, [admissionId, input.platform]);
    await tx.query(`INSERT INTO "PublishingJob"(id,"admissionId","postId",platform,lease,phase,"availableAt","intentId","intentRevision")
      SELECT $1,$2,$3,$4,GREATEST(clock_timestamp()::timestamp(3),COALESCE(max(lease)+interval '1 millisecond',clock_timestamp()::timestamp(3))),'READY',$5,$6,$7
      FROM "PublishingJob" WHERE "postId"=$3 AND platform=$4`, [jobId, admissionId, input.postId, input.platform, input.dueAt, input.intentId, next]);
    await deps.bindRevision?.(tx, input, next, jobId);
    return { next, jobId };
  }
  async function perform(action, input) {
    for (const v of [input.operationId, input.actor, input.intentId, input.postId]) id(v);
    check(platforms.includes(input.platform) && Number.isSafeInteger(input.expectedRevision) && input.expectedRevision >= 0 && input.expectedRevision < 2147483647, "INVALID_REQUEST");
    if (input.dueAt !== void 0) check(input.dueAt instanceof Date && Number.isFinite(input.dueAt.getTime()), "INVALID_DUE_TIME");
    const hash2 = fingerprint({ ...input, action });
    return atomic(async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [input.operationId]);
      await deps.lockAndValidatePost(tx, input, action);
      const prior = (await tx.query(`SELECT * FROM "PublishingAction" WHERE "operationId"=$1`, [input.operationId])).rows[0];
      if (prior) {
        check(prior.actor === input.actor && prior.requestHash === hash2, "OPERATION_CONFLICT");
        return prior.result;
      }
      const i = (await tx.query(`SELECT * FROM "PublishingIntent" WHERE "postId"=$1 ORDER BY id FOR UPDATE`, [input.postId])).rows;
      const current = i.find((x) => x.id === input.intentId);
      const result = { outcome: "APPLIED", intentId: input.intentId };
      check(!current || current.platform === input.platform, "INTENT_IDENTITY_CONFLICT");
      if (!current) {
        check(action === "schedule" && input.expectedRevision === 0 && !i.some((x) => x.platform === input.platform), "INTENT_MISSING_OR_CONFLICT");
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
              check(current.state === "ACTIVE" && predecessor?.outcome === "REJECTED", "RETRY_NOT_ELIGIBLE");
              id(input.evidenceId);
              const proof = (await tx.query(`SELECT * FROM "PublishingRetryEvidence" WHERE id=$1 AND "intentId"=$2`, [input.evidenceId, current.id])).rows[0];
              check(proof && (predecessor.generation === 1 ? proof.rootAttemptId : proof.predecessorGenerationId) === predecessor.id, "RETRY_EVIDENCE_MISSING");
              const successor = (await tx.query(`SELECT id FROM "PublishingRetryGeneration" WHERE "rootAttemptId"=$1 OR "predecessorGenerationId"=$1`, [predecessor.id])).rows[0];
              if (successor) {
                result.outcome = "CONFLICT";
                result.code = "RETRY_ALREADY_CREATED";
              } else {
                await invalidate(tx, current, input.operationId, action);
                const r = await revision(tx, current, input, action), generationId = (0, import_node_crypto5.randomUUID)();
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
    check(typeof input.evidenceReference === "string" && input.evidenceReference.length > 0 && input.evidenceReference.length <= 200, "INVALID_EVIDENCE");
    return atomic(async (tx) => {
      await tx.query(`SELECT id FROM "PublishingIntent" WHERE id=$1 FOR UPDATE`, [input.intentId]);
      const old = (await tx.query(`SELECT * FROM "PublishingRetryEvidence" WHERE id=$1`, [input.id])).rows[0];
      if (old) {
        check(old.intentId === input.intentId && (old.rootAttemptId ?? old.predecessorGenerationId) === input.predecessorId && old.verifiedBy === input.actor && old.evidenceReference === input.evidenceReference, "OPERATION_CONFLICT");
        return { evidenceId: old.id };
      }
      const p = await latest(tx, input.intentId);
      check(p?.id === input.predecessorId, "PREDECESSOR_NOT_CURRENT");
      check(p.outcome !== "CONFIRMED" && !p.remoteReference && p.outcome !== "ACCEPTED", "PUBLICATION_EVIDENCE_CONFLICT");
      const job = (await tx.query(`SELECT * FROM "PublishingJob" WHERE id=$1 FOR UPDATE`, [p.jobId])).rows[0];
      check(job && !job.remoteId && job.confirmation === null && job.phase !== "CONFIRMED", "PUBLICATION_EVIDENCE_CONFLICT");
      const proof = await deps.verifyRetryEvidence(tx, input);
      check(proof.actorStopped === true && proof.verified === true && proof.retryable === true && ["NOT_SENT", "PROVIDER_REJECTED"].includes(proof.kind), "EVIDENCE_DENIED");
      check(proof.kind === "NOT_SENT" || p.outcome === "REJECTED", "REJECTION_NOT_DEFINITIVE");
      if (p.outcome !== "REJECTED") {
        check(["AUTHORIZED", "UNKNOWN"].includes(p.outcome), "EVIDENCE_DENIED");
        if (p.generation === 1) {
          await tx.query(`INSERT INTO "PublishingAttemptEvent"("operationId","attemptId",outcome,actor) VALUES($1,$2,'REJECTED',$3)`, [(0, import_node_crypto5.randomUUID)(), p.id, input.actor]);
          await tx.query(`UPDATE "PublishingExternalAttempt" SET outcome='REJECTED' WHERE id=$1`, [p.id]);
        } else {
          await tx.query(`INSERT INTO "PublishingRetryEvent"("operationId","generationId",outcome,actor) VALUES($1,$2,'REJECTED',$3)`, [(0, import_node_crypto5.randomUUID)(), p.id, input.actor]);
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
var import_node_crypto5, IntentActionError, platforms;
var init_intentActions = __esm({
  "lib/publishing/intentActions.ts"() {
    "use strict";
    import_node_crypto5 = require("node:crypto");
    IntentActionError = class extends Error {
      constructor(code) {
        super(code);
        this.code = code;
        this.name = "IntentActionError";
      }
    };
    platforms = ["INSTAGRAM", "TIKTOK", "FACEBOOK", "LINKEDIN", "X"];
  }
});

// lib/publishing/canonicalStore.ts
function requireValue(ok, code) {
  if (!ok) throw new CanonicalPublishingError(code);
}
function identifier(v) {
  requireValue(typeof v === "string" && /^[a-zA-Z0-9_-]{1,120}$/.test(v), "INVALID_IDENTIFIER");
}
function hash(v) {
  const stable2 = (value) => value instanceof Date ? value.toISOString() : Array.isArray(value) ? value.map(stable2) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable2(value[k])])) : value;
  return (0, import_node_crypto6.createHash)("sha256").update(JSON.stringify(stable2(v))).digest("hex");
}
function createCanonicalIntentActions(deps) {
  requireValue(!deps.bindRevision, "CANONICAL_BINDING_HOOK_RESERVED");
  return createPublishingIntentActions({ ...deps, async bindRevision(tx, input, revision, jobId) {
    requireValue(input.destination, "EXPLICIT_DESTINATION_REQUIRED");
    const d = await deps.captureRevision(tx, input);
    requireValue(input.destination.accountBindingId === d.accountBindingId && input.destination.accountVersion === d.accountVersion, "EXPLICIT_DESTINATION_MISMATCH");
    identifier(d.accountBindingId);
    identifier(d.calendarId);
    requireValue(Number.isSafeInteger(d.accountVersion) && d.accountVersion > 0 && /^[0-9a-f]{64}$/.test(d.contentHash), "INVALID_REVISION_BINDING");
    const a = (await tx.query(`SELECT * FROM "PublishingAccountBinding" WHERE id=$1 FOR SHARE`, [d.accountBindingId])).rows[0];
    requireValue(a && a.calendarId === d.calendarId && a.platform === input.platform && a.state === "CONNECTED" && a.currentVersion === d.accountVersion, "ACCOUNT_BINDING_CHANGED");
    await tx.query(`INSERT INTO "PublishingCanonicalRevision"("intentId",revision,"jobId","accountBindingId","accountVersion","contentHash","operationId") VALUES($1,$2,$3,$4,$5,$6,$7)`, [input.intentId, revision, jobId, d.accountBindingId, d.accountVersion, d.contentHash, input.operationId]);
  } });
}
function createCanonicalPublishingStore(deps) {
  const db = deps.database, leaseMs = deps.preparedLeaseMs ?? 18e4;
  requireValue(Number.isSafeInteger(leaseMs) && leaseMs > 0 && leaseMs <= 18e4, "INVALID_PREPARED_LEASE");
  async function read(tx, id3) {
    const j = (await tx.query(selection, [id3])).rows[0];
    requireValue(j, "CANONICAL_JOB_UNBOUND");
    publicationKey({ intentId: j.intentId, revision: j.revision, generation: j.generation });
    return j;
  }
  async function atomic(run3) {
    return db.transaction(async (tx) => {
      requireValue((await tx.query("SHOW transaction_isolation")).rows[0]?.transaction_isolation === "read committed", "CANONICAL_ISOLATION_REQUIRED");
      return run3(tx);
    });
  }
  async function change(action, input) {
    for (const v of [input.operationId, input.actor, input.jobId]) identifier(v);
    requireValue(["NETLIFY", "VPS"].includes(input.owner) && input.epoch > BigInt(0), "INVALID_OWNER");
    const digest = hash({ ...input, epoch: String(input.epoch), action });
    return atomic(async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`canonical:${input.operationId}`]);
      const old = (await tx.query(`SELECT * FROM "PublishingCanonicalOperation" WHERE "operationId"=$1`, [input.operationId])).rows[0];
      if (old) {
        requireValue(old.requestHash === digest && old.actor === input.actor, "OPERATION_CONFLICT");
        return old.result;
      }
      const owner = (await tx.query(`SELECT * FROM "PublishingOwnership" WHERE id=1 FOR SHARE`)).rows[0];
      requireValue(owner?.enabled && owner.state === input.owner && BigInt(owner.epoch) === input.epoch, "OWNERSHIP_FENCED");
      const snapshot = await read(tx, input.jobId);
      await deps.lockAndValidate(tx, snapshot, action);
      const a = (await tx.query(`SELECT * FROM "PublishingAccountBinding" WHERE id=$1 FOR SHARE`, [snapshot.accountBindingId])).rows[0];
      requireValue(a?.state === "CONNECTED" && a.currentVersion === snapshot.accountVersion, "ACCOUNT_BINDING_CHANGED");
      const i = (await tx.query(`SELECT * FROM "PublishingIntent" WHERE id=$1 FOR UPDATE`, [snapshot.intentId])).rows[0];
      requireValue(i?.state === "ACTIVE" && i.currentRevision === snapshot.revision, "INTENT_FENCED");
      const j = (await tx.query(`SELECT *,"availableAt"<=clock_timestamp() AS available,"workerUntil"<=clock_timestamp() AS expired FROM "PublishingJob" WHERE id=$1 FOR UPDATE`, [snapshot.id])).rows[0];
      requireValue(!(await tx.query(`SELECT 1 FROM "PublishingRevisionInvalidation" WHERE "intentId"=$1 AND revision=$2`, [i.id, snapshot.revision])).rows.length, "REVISION_INVALIDATED");
      requireValue(j.available && (await tx.query(`SELECT "dueAt"<=clock_timestamp() AS due FROM "PublishingIntentRevision" WHERE "intentId"=$1 AND revision=$2`, [i.id, snapshot.revision])).rows[0]?.due, "JOB_NOT_DUE");
      requireValue(j.phase === "READY" || action === "prepare" && j.phase === "PREPARED" && j.expired, "JOB_NOT_ELIGIBLE");
      if (action === "admit") await tx.query(`INSERT INTO "PublishingCanonicalExecution"("jobId","intentId",revision,generation) VALUES($1,$2,$3,$4) ON CONFLICT("jobId") DO NOTHING`, [j.id, i.id, snapshot.revision, snapshot.generation]);
      const result = { outcome: action === "admit" ? "ADMITTED" : "PREPARED", jobId: j.id, identity: { intentId: i.id, revision: snapshot.revision, generation: snapshot.generation }, maySend: false };
      if (action === "prepare") {
        requireValue((await tx.query(`SELECT 1 FROM "PublishingCanonicalExecution" WHERE "jobId"=$1`, [j.id])).rows.length, "JOB_NOT_ADMITTED");
        result.workerToken = (0, import_node_crypto6.randomUUID)();
        await tx.query(`UPDATE "PublishingJob" SET phase='PREPARED',"workerToken"=$2,"workerUntil"=clock_timestamp()+$5*interval '1 millisecond',"ownershipEpoch"=$3,"accountId"=$4,"updatedAt"=clock_timestamp() WHERE id=$1`, [j.id, result.workerToken, String(input.epoch), snapshot.providerAccountId, leaseMs]);
      }
      await tx.query(`INSERT INTO "PublishingCanonicalOperation"("operationId","jobId",action,actor,"requestHash",result) VALUES($1,$2,$3,$4,$5,$6)`, [input.operationId, j.id, action, input.actor, digest, result]);
      return result;
    });
  }
  async function changeAccount(input) {
    for (const v of [input.operationId, input.actor, input.bindingId, input.calendarId, input.connectionId]) identifier(v);
    requireValue(["INSTAGRAM", "TIKTOK", "FACEBOOK", "LINKEDIN", "X"].includes(input.platform) && ["CONNECTED", "DISCONNECTED"].includes(input.state) && Number.isSafeInteger(input.expectedVersion) && input.expectedVersion >= 0 && input.expectedVersion < 2147483647 && typeof input.providerAccountId === "string" && input.providerAccountId.length > 0 && input.providerAccountId.length <= 500 && /^[0-9a-f]{64}$/.test(input.authorizationHash), "INVALID_ACCOUNT");
    return atomic(async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`account:${input.calendarId}:${input.platform}`]);
      const digest = hash(input), old = (await tx.query(`SELECT * FROM "PublishingAccountEvent" WHERE "operationId"=$1`, [input.operationId])).rows[0];
      if (old) {
        requireValue(old.requestHash === digest && old.actor === input.actor, "OPERATION_CONFLICT");
        return { version: old.version };
      }
      const a = (await tx.query(`SELECT * FROM "PublishingAccountBinding" WHERE id=$1 FOR UPDATE`, [input.bindingId])).rows[0];
      requireValue(a ? a.currentVersion === input.expectedVersion && a.calendarId === input.calendarId && a.platform === input.platform : input.expectedVersion === 0, "ACCOUNT_VERSION_CONFLICT");
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
      identifier(id3);
      return atomic((tx) => read(tx, id3));
    },
    projection: async (id3) => legacyProjection((await atomic((tx) => read(tx, id3))).phase)
  };
}
var import_node_crypto6, CanonicalPublishingError, selection;
var init_canonicalStore = __esm({
  "lib/publishing/canonicalStore.ts"() {
    "use strict";
    import_node_crypto6 = require("node:crypto");
    init_intentActions();
    init_canonicalContract();
    CanonicalPublishingError = class extends Error {
      constructor(code) {
        super(code);
        this.code = code;
        this.name = "CanonicalPublishingError";
      }
    };
    selection = `SELECT j.id,j."postId",j.platform,j.phase,j."workerToken",j."remoteId",j."workerUntil",j."ownershipEpoch",
 j."intentId",j."intentRevision" AS revision,r."dueAt",b."accountBindingId",b."accountVersion",b."contentHash",a."calendarId",
 v."providerAccountId",v."connectionId",COALESCE(g.generation,1) AS generation
 FROM "PublishingJob" j JOIN "PublishingCanonicalRevision" b ON b."jobId"=j.id
 JOIN "PublishingIntentRevision" r ON r."intentId"=j."intentId" AND r.revision=j."intentRevision"
 JOIN "PublishingAccountBinding" a ON a.id=b."accountBindingId"
 JOIN "PublishingAccountVersion" v ON v."bindingId"=a.id AND v.version=b."accountVersion"
 LEFT JOIN "PublishingRetryGeneration" g ON g."jobId"=j.id WHERE j.id=$1`;
  }
});

// lib/publishing/validationAdapters.ts
function ensure(ok, code) {
  if (!ok) throw new PublishingValidationError(code);
}
function id2(v) {
  ensure(typeof v === "string" && /^[a-zA-Z0-9_-]{1,120}$/.test(v), "INVALID_PRINCIPAL_OR_ID");
}
function createPublishingValidationAdapters(deps) {
  async function fence(tx, exclusive = false) {
    ensure((await tx.query("SHOW transaction_isolation")).rows[0]?.transaction_isolation === "read committed", "VALIDATION_REQUIRES_READ_COMMITTED");
    const f = (await tx.query(`SELECT version FROM "PublishingEligibilityFence" WHERE id=1 FOR ${exclusive ? "UPDATE" : "SHARE"}`)).rows[0];
    ensure(f, "ELIGIBILITY_FENCE_MISSING");
    return String(f.version);
  }
  async function clock(tx) {
    return (await tx.query("SELECT clock_timestamp() AS now")).rows[0].now;
  }
  async function workspace(tx, calendarId) {
    id2(calendarId);
    const calendar = (await tx.query(`SELECT id,"managerId","createdAt" FROM "SocialCalendar" WHERE id=$1`, [calendarId])).rows[0];
    ensure(calendar, "WORKSPACE_MISSING");
    const owner = (await tx.query(`SELECT id,"isDeactivated","contentWorkspacePlan","contentWorkspaceBillingStatus","contentWorkspaceTrialEndsAt","isComped","compedUntil","workspaceCompedPlan","workspaceCompedUntil","billingComplimentaryGrants" FROM "Creator" WHERE id=$1`, [calendar.managerId])).rows[0];
    ensure(owner, "OWNER_MISSING");
    const hasRetirement = (await tx.query(`SELECT to_regclass('"PublishingResourceTombstone"') IS NOT NULL AS present`)).rows[0].present;
    const ordinal = (await tx.query(`SELECT count(*)::integer AS ordinal FROM "SocialCalendar" c WHERE "managerId"=$1 AND ("createdAt",id)<=(SELECT "createdAt",id FROM "SocialCalendar" WHERE id=$2) ${hasRetirement ? `AND NOT EXISTS(SELECT 1 FROM "PublishingResourceTombstone" t WHERE t."resourceType"='WORKSPACE' AND t."resourceId"=c.id)` : ""}`, [owner.id, calendar.id])).rows[0].ordinal;
    if ((await tx.query(`SELECT to_regclass('"PublishingResourceTombstone"') IS NOT NULL AS present`)).rows[0].present && (await tx.query(`SELECT 1 FROM "PublishingResourceTombstone" WHERE ("resourceType"='WORKSPACE' AND "resourceId"=$1) OR ("resourceType"='CREATOR' AND "resourceId"=$2)`, [calendar.id, owner.id])).rows.length) throw new PublishingValidationError("WORKSPACE_RETIRED");
    const billingRevocationPending = (await tx.query(`SELECT to_regclass('"PublishingBillingRevocationHold"') IS NOT NULL AS present`)).rows[0].present && !!(await tx.query(`SELECT 1 FROM "PublishingBillingRevocationHold" h WHERE h."ownerId"=$1 AND NOT EXISTS(SELECT 1 FROM "PublishingBillingRevocationResolution" r WHERE r."ownerId"=h."ownerId" AND r."holdOperationId"=h."operationId") LIMIT 1`, [owner.id])).rows.length;
    return { calendar, owner, ordinal, billingRevocationPending };
  }
  async function snapshot(tx, postId) {
    id2(postId);
    await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`policy-post:${postId}`]);
    const post = (await tx.query(`SELECT * FROM "CalendarPost" WHERE id=$1`, [postId])).rows[0];
    ensure(post, "POST_MISSING");
    if ((await tx.query(`SELECT to_regclass('"PublishingResourceTombstone"') IS NOT NULL AS present`)).rows[0].present && (await tx.query(`SELECT 1 FROM "PublishingResourceTombstone" WHERE "resourceType"='POST' AND "resourceId"=$1`, [postId])).rows.length) throw new PublishingValidationError("POST_RETIRED");
    const w = await workspace(tx, post.calendarId);
    const assets = (await tx.query(`SELECT * FROM "CalendarPostAsset" WHERE "postId"=$1 ORDER BY "displayOrder",id`, [postId])).rows;
    return { post, ...w, assets };
  }
  function entitlement(s, now) {
    ensure(!s.billingRevocationPending, "BILLING_RECONCILIATION_REQUIRED");
    ensure(!s.owner.isDeactivated, "OWNER_DEACTIVATED");
    ensure(workspaceEligibility(s.owner, s.ordinal, now).allowed, "WORKSPACE_ENTITLEMENT_DENIED");
  }
  async function creator(tx, s, principalId, permission) {
    id2(principalId);
    const actor = (await tx.query(`SELECT id,"isDeactivated" FROM "Creator" WHERE id=$1`, [principalId])).rows[0];
    ensure(actor, "CREATOR_MISSING");
    ensure(!actor.isDeactivated, "ACTOR_DEACTIVATED");
    if (principalId === s.owner.id) return actor;
    const m = (await tx.query(`SELECT * FROM "CalendarCollaborator" WHERE "calendarId"=$1 AND "creatorId"=$2`, [s.calendar.id, principalId])).rows[0];
    ensure(m && effectiveTeamPermissions(m.role, m.permissions, m.customPermissions).includes(permission), "WORKSPACE_PERMISSION_DENIED");
    return actor;
  }
  function approved(s) {
    ensure(!s.post.isAiDraft, "AI_DRAFT_INELIGIBLE");
    ensure(s.post.approvalStatus === "APPROVED", "POST_APPROVAL_REQUIRED");
  }
  async function account(tx, s, d, now) {
    id2(d.accountBindingId);
    ensure(Number.isSafeInteger(d.accountVersion) && d.accountVersion > 0, "INVALID_ACCOUNT_VERSION");
    const a = (await tx.query(`SELECT * FROM "PublishingAccountBinding" WHERE id=$1 FOR SHARE`, [d.accountBindingId])).rows[0];
    ensure(a && a.calendarId === s.calendar.id && a.platform === s.post.platform && a.state === "CONNECTED" && a.currentVersion === d.accountVersion, "ACCOUNT_BINDING_CHANGED");
    ensure(!(await tx.query(`SELECT 1 FROM "PublishingAccountInvalidation" WHERE "bindingId"=$1 AND version=$2`, [a.id, d.accountVersion])).rows.length, "ACCOUNT_VERSION_INVALIDATED");
    const version = (await tx.query(`SELECT * FROM "PublishingAccountVersion" WHERE "bindingId"=$1 AND version=$2`, [a.id, d.accountVersion])).rows[0];
    ensure(version, "ACCOUNT_VERSION_MISSING");
    const c = (await tx.query(`SELECT id,"calendarId",platform,"platformAccountId",status,"tokenScopes","accessTokenExpiresAt",("accessToken" IS NOT NULL AND length("accessToken")>0) AS "hasAccessToken" FROM "SocialConnection" WHERE id=$1`, [version.connectionId])).rows[0];
    ensure(c && c.calendarId === s.calendar.id && c.platform === s.post.platform && c.platformAccountId === version.providerAccountId && c.status === "CONNECTED", "SOCIAL_CONNECTION_CHANGED");
    ensure(c.hasAccessToken && (!c.accessTokenExpiresAt || c.accessTokenExpiresAt > now), "SOCIAL_TOKEN_EXPIRED");
    ensure(accountAuthorizationHash(c) === version.authorizationHash, "ACCOUNT_AUTHORIZATION_CHANGED");
    const scopes = new Set((c.tokenScopes ?? "").split(/[\s,]+/));
    const required = { INSTAGRAM: ["instagram_content_publish"], TIKTOK: ["video.publish"], FACEBOOK: ["pages_manage_posts", "pages_read_engagement"], X: ["tweet.write", ...s.assets.length ? ["media.write"] : []], LINKEDIN: [c.platformAccountId.startsWith("urn:li:organization:") ? "w_organization_social" : "w_member_social"] };
    ensure(required[s.post.platform]?.every((scope) => scopes.has(scope)), "SOCIAL_PERMISSION_MISSING");
    validatePublishContent(s.post.platform, s.assets, buildCaption(s.post), s.post.postType);
    if (s.post.platform === "TIKTOK") {
      await creator(tx, s, s.post.tikTokConsentBy, "publishing.manage");
      const settings = parseTikTokSettings(s.post.tikTokSettings);
      ensure(s.post.tikTokConsentAccountId === c.platformAccountId && s.post.tikTokConsentAt && s.post.tikTokConsentBy && s.post.tikTokConsentVersion === TIKTOK_CONSENT_VERSION && s.post.tikTokConsentHash === tikTokConsentHash({ ...s.post, assets: s.assets }, settings, c.platformAccountId), "TIKTOK_CONSENT_REQUIRED");
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
    ensure(s.post.platform === input.platform, "POST_PLATFORM_CHANGED");
    entitlement(s, now);
    await creator(tx, s, input.actor, action === "edit" ? "calendar.edit" : "publishing.manage");
    if (["schedule", "reschedule", "retry"].includes(action)) {
      approved(s);
      ensure(input.destination, "EXPLICIT_DESTINATION_REQUIRED");
      await account(tx, s, input.destination, now);
    }
    if (action === "edit") ensure(s.post.approvalStatus !== "APPROVED" && !["PUBLISHING", "PUBLISHED"].includes(publishingStatus(s.post)), "APPROVED_CONTENT_LOCKED");
  }
  async function captureRevision(tx, input) {
    await fence(tx);
    const s = await snapshot(tx, input.postId), now = await clock(tx);
    entitlement(s, now);
    approved(s);
    await creator(tx, s, input.actor, "publishing.manage");
    ensure(input.destination, "EXPLICIT_DESTINATION_REQUIRED");
    await account(tx, s, input.destination, now);
    const revision = (await tx.query(`SELECT "currentRevision" FROM "PublishingIntent" WHERE id=$1`, [input.intentId])).rows[0]?.currentRevision;
    ensure(revision, "INTENT_MISSING");
    await tx.query(`INSERT INTO "PublishingRevisionPolicy"("intentId",revision,"calendarId","ownerId","principalId","principalKind") VALUES($1,$2,$3,$4,$5,'CREATOR')`, [input.intentId, revision, s.calendar.id, s.owner.id, input.actor]);
    return { ...input.destination, calendarId: s.calendar.id, contentHash: publishingContentHash(s.post, s.assets) };
  }
  async function validateExecution(tx, job) {
    const fenceVersion = await fence(tx);
    const canonical = (await tx.query(`SELECT j."postId",j.platform,j."intentId",j."intentRevision" AS revision,b."accountBindingId",b."accountVersion",b."contentHash",a."calendarId",v."providerAccountId",v."connectionId",COALESCE(g.generation,1) AS generation
   FROM "PublishingJob" j JOIN "PublishingCanonicalRevision" b ON b."jobId"=j.id JOIN "PublishingAccountBinding" a ON a.id=b."accountBindingId"
   JOIN "PublishingAccountVersion" v ON v."bindingId"=a.id AND v.version=b."accountVersion" LEFT JOIN "PublishingRetryGeneration" g ON g."jobId"=j.id WHERE j.id=$1`, [job.id])).rows[0];
    ensure(canonical && ["postId", "platform", "intentId", "revision", "generation", "accountBindingId", "accountVersion", "contentHash", "calendarId", "providerAccountId", "connectionId"].every((k) => canonical[k] === job[k]), "CANONICAL_JOB_IDENTITY_CHANGED");
    if ((await tx.query(`SELECT to_regclass('"PublishingEligibilityHold"') IS NOT NULL AS present`)).rows[0].present && (await tx.query(`SELECT 1 FROM "PublishingEligibilityHold" WHERE "intentId"=$1 AND revision=$2`, [job.intentId, job.revision])).rows.length) throw new PublishingValidationError("EXPLICIT_REAUTHORIZATION_REQUIRED");
    const s = await snapshot(tx, job.postId), now = await clock(tx);
    const p = (await tx.query(`SELECT * FROM "PublishingRevisionPolicy" WHERE "intentId"=$1 AND revision=$2`, [job.intentId, job.revision])).rows[0];
    ensure(p && p.principalKind === "CREATOR" && p.calendarId === s.calendar.id && p.ownerId === s.owner.id, "REVISION_AUTHORITY_CHANGED");
    approved(s);
    ensure(!(await tx.query(`SELECT 1 FROM "PublishingPostEligibilityInvalidation" WHERE "intentId"=$1 AND revision=$2`, [job.intentId, job.revision])).rows.length, "POST_APPROVAL_REVISION_INVALIDATED");
    ensure(job.calendarId === s.calendar.id && job.platform === s.post.platform, "POST_IDENTITY_CHANGED");
    entitlement(s, now);
    approved(s);
    await creator(tx, s, p.principalId, "publishing.manage");
    ensure(job.contentHash === publishingContentHash(s.post, s.assets), "APPROVED_CONTENT_CHANGED");
    const { connection, version } = await account(tx, s, job, now);
    ensure(job.providerAccountId === version.providerAccountId && job.connectionId === connection.id, "CANONICAL_DESTINATION_CHANGED");
    return { principalId: p.principalId, fenceVersion, validUntil: expiry(s, connection, now), maySend: false };
  }
  async function validateBeforeExternal(tx, input) {
    const o = (await tx.query(`SELECT * FROM "PublishingOwnership" WHERE id=1 FOR SHARE`)).rows[0];
    ensure(o?.enabled && o.state === input.owner && BigInt(o.epoch) === input.epoch, "OWNERSHIP_FENCED");
    const v = await validateExecution(tx, input.job);
    const i = (await tx.query(`SELECT * FROM "PublishingIntent" WHERE id=$1 FOR UPDATE`, [input.job.intentId])).rows[0];
    ensure(i?.state === "ACTIVE" && i.currentRevision === input.job.revision, "INTENT_FENCED");
    const j = (await tx.query(`SELECT *,"workerUntil">clock_timestamp() AS live FROM "PublishingJob" WHERE id=$1 FOR UPDATE`, [input.job.id])).rows[0];
    ensure(j?.phase === "PREPARED" && j.live && j.workerToken === input.job.workerToken && BigInt(j.ownershipEpoch) === input.epoch, "PREPARED_JOB_FENCED");
    await tx.query(`INSERT INTO "PublishingEligibilityWitness"(id,"jobId","principalId","fenceVersion","validUntil") VALUES($1,$2,$3,$4,$5)`, [(0, import_node_crypto7.randomUUID)(), j.id, v.principalId, v.fenceVersion, v.validUntil]);
    return v;
  }
  async function validateViewerApproval(tx, input) {
    await fence(tx, true);
    const s = await snapshot(tx, input.postId), now = await clock(tx);
    ensure(s.calendar.id === input.calendarId, "VIEWER_CALENDAR_MISMATCH");
    entitlement(s, now);
    const viewer = await deps.verifyViewer(tx, { calendarId: input.calendarId, credential: input.credential });
    ensure(viewer.calendarId === s.calendar.id && viewer.expiresAt > await clock(tx) && viewer.principalId, "VIEWER_AUTHORITY_DENIED");
    ensure(!s.post.isAiDraft, "AI_DRAFT_INELIGIBLE");
    ensure(!["PUBLISHING", "PUBLISHED"].includes(publishingStatus(s.post)), "POST_ALREADY_PUBLISHING");
    const busy = (await tx.query(`SELECT 1 FROM "PublishingExternalAttempt" a JOIN "PublishingIntent" i ON i.id=a."intentId" WHERE i."postId"=$1 AND a.outcome IN ('AUTHORIZED','ACCEPTED','UNKNOWN','CONFIRMED') UNION ALL SELECT 1 FROM "PublishingRetryGeneration" a JOIN "PublishingIntent" i ON i.id=a."intentId" WHERE i."postId"=$1 AND a.outcome IN ('AUTHORIZED','ACCEPTED','UNKNOWN','CONFIRMED')`, [input.postId])).rows;
    ensure(!busy.length, "POST_EXTERNAL_CONFLICT");
    ensure(s.assets.length || s.post.caption?.trim() && !["INSTAGRAM", "TIKTOK"].includes(s.post.platform), "NOTHING_TO_APPROVE");
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
      ensure(viewer.calendarId === w.calendar.id && viewer.expiresAt > await clock(tx) && viewer.principalId, "VIEWER_AUTHORITY_DENIED");
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
      validateDueTime: async (_tx, i) => ensure(i.dueAt instanceof Date && Number.isFinite(i.dueAt.getTime()), "INVALID_DUE_TIME"),
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
        ensure(action === "edit", "CONTENT_INVALIDATION_ONLY");
        await fence(tx, true);
        const s = await snapshot(tx, input.postId);
        ensure(s.post.platform === input.platform, "POST_PLATFORM_CHANGED");
        entitlement(s, await clock(tx));
        await creator(tx, s, input.actor, permission);
        ensure(s.post.approvalStatus !== "APPROVED" && !["PUBLISHING", "PUBLISHED"].includes(publishingStatus(s.post)), "APPROVED_CONTENT_LOCKED");
      }
    }),
    canonicalStore: (options) => createCanonicalPublishingStore({ database: deps.database, preparedLeaseMs: options?.preparedLeaseMs, lockAndValidate: (tx, job) => validateExecution(tx, job).then(() => {
    }) }),
    // Policy mutators must take this before any application/canonical row lock.
    lockForPolicyChange: (tx) => fence(tx, true)
  };
}
var import_node_crypto7, PublishingValidationError;
var init_validationAdapters = __esm({
  "lib/publishing/validationAdapters.ts"() {
    "use strict";
    import_node_crypto7 = require("node:crypto");
    init_calendarTeamPolicy();
    init_tiktokSettings();
    init_tiktokConsent();
    init_state();
    init_eligibilityPolicy();
    init_canonicalStore();
    init_intentActions();
    PublishingValidationError = class extends IntentActionError {
      constructor(code) {
        super(code);
        this.name = "PublishingValidationError";
      }
    };
  }
});

// lib/publishing/executionCoordination.ts
function createPublishingCoordination(deps) {
  async function claim(input) {
    const job = await deps.validation.canonicalStore().findJob(input.target.jobId);
    return deps.database.transaction(async (tx) => {
      const o = (await tx.query(`SELECT * FROM "PublishingOwnership" WHERE id=1 FOR SHARE`)).rows[0];
      if (o.state !== input.owner || BigInt(o.epoch) !== input.epoch) throw Error("OWNERSHIP_FENCED");
      await deps.validation.validateExecution(tx, job);
      await tx.query(`SELECT id FROM "PublishingIntent" WHERE id=$1 FOR UPDATE`, [job.intentId]);
      const j = (await tx.query(`SELECT *,"workerUntil">clock_timestamp() AS live FROM "PublishingJob" WHERE id=$1 FOR UPDATE`, [job.id])).rows[0];
      if (j.phase !== "PREPARED" || !j.live || j.workerToken !== input.workerToken) throw Error("CLAIM_FENCED");
      const rows = (await tx.query(`INSERT INTO "PublishingAccountLease"(platform,"accountId","jobId",token,"leaseUntil") VALUES($1,$2,$3,$4,$5)
    ON CONFLICT(platform,"accountId") DO UPDATE SET "jobId"=EXCLUDED."jobId",token=EXCLUDED.token,"leaseUntil"=EXCLUDED."leaseUntil"
    WHERE ("PublishingAccountLease".token=EXCLUDED.token OR "PublishingAccountLease"."leaseUntil"<=clock_timestamp())
    AND NOT EXISTS(SELECT 1 FROM "PublishingJob" old WHERE old.id="PublishingAccountLease"."jobId" AND old.phase IN ('EXTERNAL_PENDING','PROVIDER_PENDING','OUTCOME_UNKNOWN')) RETURNING token`, [job.platform, job.providerAccountId, job.id, input.workerToken, j.workerUntil])).rows;
      if (!rows.length) throw Error("ACCOUNT_EXECUTION_BUSY");
      return { maySend: false };
    });
  }
  async function release(input) {
    return deps.database.transaction(async (tx) => {
      await tx.query(`DELETE FROM "PublishingAccountLease" a USING "PublishingJob" j WHERE a."jobId"=j.id AND j.id=$1 AND a.token=$2 AND j.phase IN ('PREPARED','CONFIRMED','REJECTED','CANCELLED')`, [input.target.jobId, input.workerToken]);
    });
  }
  async function reserveRate(key, max, windowMs) {
    if (!Number.isInteger(max) || max < 1 || !Number.isInteger(windowMs) || windowMs < 1e3 || key.length > 500) throw Error("INVALID_RATE_BUDGET");
    return deps.database.transaction(async (tx) => {
      const rows = (await tx.query(`INSERT INTO "PublishingRateBucket"(key,"bucketWindow",used) VALUES($1,floor(extract(epoch FROM clock_timestamp())*1000/$2)::bigint,1)
   ON CONFLICT(key,"bucketWindow") DO UPDATE SET used="PublishingRateBucket".used+1 WHERE "PublishingRateBucket".used<$3 RETURNING used`, [key, windowMs, max])).rows;
      if (!rows.length) throw Error("PUBLISHING_RATE_DEFERRED");
    });
  }
  async function reserveRefresh(key) {
    const token = (0, import_node_crypto8.randomUUID)();
    const rows = await deps.database.transaction(async (tx) => (await tx.query(`INSERT INTO "PublishingCoordinationLease"(key,token,"leaseUntil") VALUES($1,$2,clock_timestamp()+interval '30 seconds') ON CONFLICT(key) DO UPDATE SET token=EXCLUDED.token,"leaseUntil"=EXCLUDED."leaseUntil" WHERE "PublishingCoordinationLease"."leaseUntil"<=clock_timestamp() RETURNING token`, [key, token])).rows);
    if (!rows.length) throw Error("TOKEN_REFRESH_BUSY");
    return token;
  }
  async function reserveSpacing(key, intervalMs) {
    if (!Number.isInteger(intervalMs) || intervalMs < 1 || intervalMs > 6e4) throw Error("INVALID_REQUEST_SPACING");
    const wait = await deps.database.transaction(async (tx) => {
      const r = (await tx.query(`INSERT INTO "PublishingRequestSpacing"(key,"nextAt") VALUES($1,clock_timestamp()+$2*interval '1 millisecond') ON CONFLICT(key) DO UPDATE SET "nextAt"=GREATEST("PublishingRequestSpacing"."nextAt",clock_timestamp())+$2*interval '1 millisecond' RETURNING GREATEST(0,ceil(extract(epoch FROM ("nextAt"-clock_timestamp()))*1000)-$2)::integer AS wait`, [key, intervalMs])).rows[0];
      if (r.wait > 15e3) throw Error("PUBLISHING_RATE_DEFERRED");
      return r.wait;
    });
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  }
  return { acquire: claim, release, reserveRate, reserveRefresh, reserveSpacing };
}
var import_node_crypto8;
var init_executionCoordination = __esm({
  "lib/publishing/executionCoordination.ts"() {
    "use strict";
    import_node_crypto8 = require("node:crypto");
  }
});

// lib/publishing/tokenRefreshFence.ts
function createFencedTokenRefresh(deps) {
  async function bound(target2) {
    return deps.database.transaction(async (tx) => {
      const row = (await tx.query(`SELECT b."currentVersion",b.state,v."providerAccountId",v."connectionId",s.status,to_jsonb(s)->>'refreshToken' AS "refreshToken" FROM "PublishingAccountBinding" b JOIN "PublishingAccountVersion" v ON v."bindingId"=b.id AND v.version=$2 JOIN "SocialConnection" s ON s.id=v."connectionId" WHERE b.id=$1`, [target2.accountBindingId, target2.accountVersion])).rows[0];
      if (!row || row.currentVersion !== target2.accountVersion || row.state !== "CONNECTED" || row.status !== "CONNECTED" || row.providerAccountId !== target2.providerAccountId || row.connectionId !== target2.connectionId) throw Error("TOKEN_REFRESH_DESTINATION_FENCED");
      return row;
    });
  }
  async function refresh(target2) {
    const original = await bound(target2);
    const key = "refresh:" + target2.accountBindingId, token = await deps.coordination.reserveRefresh(key);
    const refreshed = await deps.refresh({ platform: target2.platform, connectionId: target2.connectionId, accountId: target2.providerAccountId, refreshToken: original.refreshToken });
    if (refreshed.accountId !== target2.providerAccountId || !refreshed.accessToken || !(refreshed.expiresAt instanceof Date) || refreshed.expiresAt <= /* @__PURE__ */ new Date()) throw Error("TOKEN_REFRESH_RESPONSE_INVALID");
    if (refreshed.refreshToken !== void 0 && (!refreshed.refreshToken || typeof refreshed.refreshToken !== "string") || refreshed.refreshTokenExpiresAt !== void 0 && (!(refreshed.refreshTokenExpiresAt instanceof Date) || refreshed.refreshTokenExpiresAt <= /* @__PURE__ */ new Date())) throw Error("TOKEN_REFRESH_ROTATION_INVALID");
    await deps.database.transaction(async (tx) => {
      await deps.validation.lockForPolicyChange(tx);
      const lease = (await tx.query(`SELECT *,"leaseUntil">clock_timestamp() AS live FROM "PublishingCoordinationLease" WHERE key=$1 FOR UPDATE`, [key])).rows[0];
      if (!lease?.live || lease.token !== token) throw Error("TOKEN_REFRESH_LEASE_FENCED");
      const b = (await tx.query(`SELECT * FROM "PublishingAccountBinding" WHERE id=$1 FOR SHARE`, [target2.accountBindingId])).rows[0];
      if (b.currentVersion !== target2.accountVersion || b.state !== "CONNECTED") throw Error("TOKEN_REFRESH_DESTINATION_FENCED");
      const updated = (await tx.query(`UPDATE "SocialConnection" s SET "accessToken"=$2,"accessTokenExpiresAt"=$3,"tokenScopes"=$4 WHERE id=$1 AND "platformAccountId"=$5 AND status='CONNECTED' AND (to_jsonb(s)->>'refreshToken') IS NOT DISTINCT FROM $6 RETURNING id`, [target2.connectionId, refreshed.accessToken, refreshed.expiresAt, refreshed.scopes, target2.providerAccountId, original.refreshToken])).rows;
      if (!updated.length) throw Error("TOKEN_REFRESH_DESTINATION_FENCED");
      if (refreshed.refreshToken !== void 0) await tx.query(`UPDATE "SocialConnection" SET "refreshToken"=$2 WHERE id=$1`, [target2.connectionId, refreshed.refreshToken]);
      if (refreshed.refreshTokenExpiresAt !== void 0) await tx.query(`UPDATE "SocialConnection" SET "refreshTokenExpiresAt"=$2 WHERE id=$1`, [target2.connectionId, refreshed.refreshTokenExpiresAt]);
      await tx.query(`DELETE FROM "PublishingCoordinationLease" WHERE key=$1 AND token=$2`, [key, token]);
    });
    return { operationId: (0, import_node_crypto9.randomUUID)(), maySend: false };
  }
  return { refresh };
}
var import_node_crypto9;
var init_tokenRefreshFence = __esm({
  "lib/publishing/tokenRefreshFence.ts"() {
    "use strict";
    import_node_crypto9 = require("node:crypto");
  }
});

// lib/publishing/applicationBoundary.ts
function installDisabledPublishingApplication(input) {
  if (!["NEXT", "NETLIFY", "VPS"].includes(input.host) || input.publishingEnabled !== false || typeof input.invoke !== "function" || boundary.composition) throw Error("DISABLED_APPLICATION_BOOTSTRAP_REJECTED");
  const identity = Object.freeze({});
  boundary.composition = { proof: identity, invoke: input.invoke, assertLegacyAllowed: async () => {
    throw Error("DISABLED_CANONICAL_HOST_PUBLICATION_FENCED");
  } };
  return () => {
    if (boundary.composition?.proof !== identity) throw Error("INTEGRATION_TEARDOWN_CONFLICT");
    boundary.composition = void 0;
  };
}
function publishingIntegrationInstalled() {
  const mode = typeof process !== "undefined" ? process.env.SHOWWORK_PUBLISHING_PROTOCOL : void 0;
  if (mode !== void 0 && mode !== "legacy" && mode !== "canonical") throw Error("INVALID_PUBLISHING_PROTOCOL");
  if (mode === "canonical" && !boundary.composition) throw Error("CANONICAL_BOOTSTRAP_REQUIRED");
  return boundary.composition !== void 0;
}
function publishingRetentionRequired() {
  const mode = process.env.SHOWWORK_PUBLISHING_PROTOCOL;
  if (mode !== void 0 && mode !== "legacy" && mode !== "canonical") throw Error("INVALID_PUBLISHING_PROTOCOL");
  return mode === "canonical" || boundary.composition !== void 0;
}
async function assertLegacyPublishingAllowed(entrypoint) {
  if (boundary.composition) await boundary.composition.assertLegacyAllowed(entrypoint);
}
var import_node_async_hooks2, hostState, boundary, policyExecution;
var init_applicationBoundary = __esm({
  "lib/publishing/applicationBoundary.ts"() {
    "use strict";
    import_node_async_hooks2 = require("node:async_hooks");
    hostState = globalThis;
    boundary = hostState.__showworkPublishingBoundary ?? (hostState.__showworkPublishingBoundary = { policy: new import_node_async_hooks2.AsyncLocalStorage() });
    policyExecution = boundary.policy;
  }
});

// lib/publishing/executionContext.ts
function withPublishingAccountIO(input, run3) {
  return auxiliary.run(input, run3);
}
async function publishingFetch(input, init) {
  const legacyUrl = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const legacyMethod = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const legacyHeaders = new Headers(init?.headers ?? (input instanceof Request ? input.headers : void 0));
  const legacyMutation = legacyMethod !== "GET" && legacyMethod !== "HEAD" || legacyHeaders.has("x-http-method-override") || [...legacyUrl.searchParams.keys()].some((k) => k.toLowerCase().includes("method"));
  let legacyPayload = {};
  if (typeof init?.body === "string") {
    try {
      const parsed = JSON.parse(init.body);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) legacyPayload = parsed;
    } catch {
    }
  }
  const retiredCreation = legacyUrl.hostname === "graph.facebook.com" && (legacyUrl.pathname.endsWith("/media_publish") || legacyUrl.pathname.endsWith("/feed") || legacyUrl.pathname.endsWith("/photos") && legacyPayload.published !== false || legacyUrl.pathname.endsWith("/video_reels") && legacyPayload.upload_phase !== "start") || legacyUrl.hostname === "graph-video.facebook.com" && legacyUrl.pathname.endsWith("/videos") || legacyUrl.hostname === "api.x.com" && legacyUrl.pathname === "/2/tweets" || legacyUrl.hostname === "api.linkedin.com" && legacyUrl.pathname === "/rest/posts" || legacyUrl.hostname === "open.tiktokapis.com" && /\/post\/publish\/(content|video)\/init\/?$/.test(legacyUrl.pathname);
  if (legacyMutation && retiredCreation) throw Error(auxiliary.getStore() ? "ACCOUNT_IO_ENDPOINT_DENIED" : "LEGACY_PUBLICATION_TRANSPORT_RETIRED");
  const accountIO = auxiliary.getStore();
  if (accountIO) {
    const url2 = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url), method2 = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const overrides = [...url2.searchParams.keys()].some((k) => k.toLowerCase().includes("method")) || new Headers(init?.headers ?? (input instanceof Request ? input.headers : void 0)).has("x-http-method-override");
    const allowed = !overrides && url2.protocol === "https:" && !url2.username && !url2.password && (url2.hostname === "graph.facebook.com" && method2 === "GET" && /^\/v\d+\.\d+\/(oauth\/access_token|me\/(accounts|permissions)|[0-9]+)$/.test(url2.pathname) || url2.hostname === "api.x.com" && (method2 === "POST" && url2.pathname === "/2/oauth2/token" || method2 === "GET" && url2.pathname === "/2/users/me") || url2.hostname === "www.linkedin.com" && method2 === "POST" && url2.pathname === "/oauth/v2/accessToken" || url2.hostname === "api.linkedin.com" && method2 === "GET" && (url2.pathname === "/v2/userinfo" || /^\/rest\/(organizationAcls|organizations\/\d+)$/.test(url2.pathname)) || url2.hostname === "open.tiktokapis.com" && (method2 === "POST" && url2.pathname === "/v2/oauth/token/" || method2 === "GET" && url2.pathname === "/v2/user/info/" || method2 === "POST" && url2.pathname === "/v2/post/publish/creator_info/query/"));
    if (!allowed) throw Error("ACCOUNT_IO_ENDPOINT_DENIED");
    accountIO.signal.throwIfAborted();
    return accountIO.fetch(input, { ...init, redirect: "error", signal: AbortSignal.any([accountIO.signal, AbortSignal.timeout(3e4), ...init?.signal ? [init.signal] : []]) });
  }
  const auxiliaryRead = legacyMethod === "GET" && (legacyUrl.hostname === "api.x.com" && /^\/2\/(users\/(me|by\/username\/[^/]+|[^/]+(?:\/tweets)?)|tweets|dm_events|dm_conversations\/with\/[^/]+\/dm_events)$/.test(legacyUrl.pathname) || legacyUrl.hostname === "api.linkedin.com" && legacyUrl.pathname === "/rest/memberCreatorPostAnalytics");
  const directMessage = legacyMethod === "POST" && legacyUrl.hostname === "api.x.com" && /^\/2\/dm_conversations\/with\/[^/]+\/messages$/.test(legacyUrl.pathname);
  if (publishingRetentionRequired() && legacyUrl.protocol === "https:" && !legacyUrl.username && !legacyUrl.password && !legacyHeaders.has("x-http-method-override") && ![...legacyUrl.searchParams.keys()].some((k) => k.toLowerCase().includes("method")) && (auxiliaryRead || directMessage)) {
    return globalThis.fetch(input, { ...init, redirect: "error", signal: AbortSignal.any([AbortSignal.timeout(3e4), ...init?.signal ? [init.signal] : []]) });
  }
  if (publishingIntegrationInstalled()) await assertLegacyPublishingAllowed("lib/publishing/executionContext.ts#egress");
  const context = execution.getStore();
  if (!context) return globalThis.fetch(input, { ...init, redirect: "error" });
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const body = typeof init?.body === "string" ? init.body : "";
  const publication = method === "POST" && (url.hostname === "graph.facebook.com" && (url.pathname.endsWith("/media_publish") || url.pathname.endsWith("/feed") || url.pathname.endsWith("/video_reels") && body.includes('"finish"')) || url.hostname === "graph-video.facebook.com" && url.pathname.endsWith("/videos") || url.hostname === "api.x.com" && url.pathname === "/2/tweets" || url.hostname === "api.linkedin.com" && url.pathname === "/rest/posts" || url.hostname === "open.tiktokapis.com" && /\/post\/publish\/(content|video)\/init\/$/.test(url.pathname));
  context.signal.throwIfAborted();
  if (publication) await context.beforePublication?.();
  const originalSignal = init?.signal ?? (input instanceof Request ? input.signal : void 0);
  const response = await globalThis.fetch(input, { ...init, redirect: "error", signal: originalSignal ? AbortSignal.any([context.signal, originalSignal]) : context.signal });
  if (publication) {
    const value = await response.clone().json().catch(() => null);
    const providerError = value?.error && (url.hostname !== "open.tiktokapis.com" || value.error.code !== "ok");
    const reference = response.headers.get("x-restli-id") ?? value?.data?.publish_id ?? value?.post_id ?? value?.data?.id ?? value?.id ?? null;
    context.publicationResponse?.({ rejected: response.status < 500 && (!response.ok || !!providerError), status: response.status, reference: typeof reference === "string" ? reference : null });
  }
  return response;
}
var import_node_async_hooks3, execution, auxiliary, publishingAccountIOActive;
var init_executionContext = __esm({
  "lib/publishing/executionContext.ts"() {
    "use strict";
    init_applicationBoundary();
    import_node_async_hooks3 = require("node:async_hooks");
    execution = new import_node_async_hooks3.AsyncLocalStorage();
    auxiliary = new import_node_async_hooks3.AsyncLocalStorage();
    publishingAccountIOActive = () => auxiliary.getStore() !== void 0;
  }
});

// lib/tiktok.ts
function requireAppCredentials() {
  if (!CLIENT_KEY || !CLIENT_SECRET) {
    throw new Error("TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET are not set \u2014 TikTok publishing isn't configured yet.");
  }
  return { CLIENT_KEY, CLIENT_SECRET };
}
async function tokenRequest(body) {
  const { CLIENT_KEY: CLIENT_KEY2, CLIENT_SECRET: CLIENT_SECRET2 } = requireAppCredentials();
  const res = await publishingFetch(`${API_BASE}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: CLIENT_KEY2, client_secret: CLIENT_SECRET2, ...body }).toString(),
    signal: AbortSignal.timeout(3e4),
    cache: "no-store"
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error_description ?? data.error ?? `TikTok token request failed (${res.status})`);
  }
  if (!data.access_token || !data.refresh_token || !data.open_id || !Number.isFinite(data.expires_in) || !Number.isFinite(data.refresh_expires_in)) throw new Error("TikTok returned an incomplete connection. Reconnect the account.");
  return data;
}
function refreshTikTokAccessToken(refreshToken) {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}
async function apiPost(path, accessToken, body) {
  if (publishingIntegrationInstalled()) {
    if (!publishingAccountIOActive()) {
      await assertLegacyPublishingAllowed("lib/tiktok.ts#apiPost@100");
    }
  }
  const res = await publishingFetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3e4),
    cache: "no-store"
  });
  const data = await res.json();
  if (!res.ok || data.error?.code !== "ok") {
    const code = data.error?.code;
    const message = data.error?.message ?? `TikTok API request failed (${res.status})`;
    throw new TikTokApiError(code || "request_failed", res.status, message);
  }
  return data.data;
}
async function queryTikTokCreatorInfo(accessToken) {
  const info = await apiPost("/post/publish/creator_info/query/", accessToken, {});
  if (!info || !info.creator_nickname || !info.creator_username || !Array.isArray(info.privacy_level_options) || !info.privacy_level_options.length || [info.comment_disabled, info.duet_disabled, info.stitch_disabled].some((value) => typeof value !== "boolean") || !Number.isFinite(info.max_video_post_duration_sec) || info.max_video_post_duration_sec <= 0) throw new Error("TikTok did not return complete creator permissions. Refresh account settings before publishing.");
  return info;
}
var API_BASE, CLIENT_KEY, CLIENT_SECRET, TikTokApiError;
var init_tiktok = __esm({
  "lib/tiktok.ts"() {
    "use strict";
    init_applicationBoundary();
    init_executionContext();
    init_executionContext();
    API_BASE = "https://open.tiktokapis.com/v2";
    CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
    CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
    TikTokApiError = class extends Error {
      constructor(code, status, detail) {
        const messages = {
          spam_risk_too_many_posts: "TikTok's daily posting limit has been reached. Try again later.",
          spam_risk_user_banned_from_posting: "TikTok currently prevents this account from posting. Check the account in TikTok.",
          reached_active_user_cap: "This app's TikTok creator limit has been reached. Try again later.",
          rate_limit_exceeded: "TikTok is receiving too many requests. Try again shortly.",
          scope_not_authorized: "TikTok publishing permission is missing. Reconnect and grant publishing access.",
          access_token_invalid: "TikTok's connection expired. Reconnect the account.",
          url_ownership_unverified: "The media domain has not been verified for this TikTok app. Contact support.",
          unaudited_client_can_only_post_to_private_accounts: "Until TikTok approves this app, use a private TikTok account and select Only me."
        };
        super(messages[code] || `TikTok could not complete the request (${code}). Try again or contact support.`);
        this.code = code;
        this.status = status;
      }
    };
  }
});

// lib/publishing/nativeTokenServices.ts
function requireScopes(connection, required) {
  const scopes = new Set((connection.tokenScopes || "").split(/[\s,]+/));
  const missing = required.filter((scope) => !scopes.has(scope));
  if (missing.length) throw new Error(`${connection.platform} permission is missing (${missing.join(", ")}). Reconnect after enabling access in the developer app.`);
}
async function requestSocialTokenRefresh(platform, refreshToken) {
  const isX = platform === "X", clientId = isX ? process.env.X_CLIENT_ID : process.env.LINKEDIN_CLIENT_ID, clientSecret = isX ? process.env.X_CLIENT_SECRET : process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret || !refreshToken) throw Error("Refresh credentials are missing. Reconnect the account.");
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId });
  if (!isX) body.set("client_secret", clientSecret);
  const response = await publishingFetch(isX ? "https://api.x.com/2/oauth2/token" : "https://www.linkedin.com/oauth/v2/accessToken", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...isX ? { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}` } : {} }, body, signal: AbortSignal.timeout(3e4) });
  const result = await response.json();
  if (!response.ok || !result.access_token || !Number.isFinite(result.expires_in) || result.expires_in <= 0) throw Error("The connection could not be renewed. Reconnect.");
  return result;
}
var init_nativeTokenServices = __esm({
  "lib/publishing/nativeTokenServices.ts"() {
    "use strict";
    init_executionContext();
  }
});

// lib/linkedin/messagingProvider.ts
var init_messagingProvider = __esm({
  "lib/linkedin/messagingProvider.ts"() {
    "use strict";
  }
});

// lib/linkedin/messagingAccess.ts
var init_messagingAccess = __esm({
  "lib/linkedin/messagingAccess.ts"() {
    "use strict";
    init_messagingProvider();
  }
});

// lib/channelOAuth.ts
async function readJson(response, provider) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const message = typeof data.error === "string" ? data.error_description || data.error : data.error?.message;
    throw new Error(message || `${provider} request failed (${response.status}).`);
  }
  return data;
}
async function getLinkedInMember(accessToken) {
  return readJson(
    await publishingFetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store"
    }),
    "LinkedIn profile"
  );
}
async function getXMember(accessToken) {
  const url = new URL("https://api.x.com/2/users/me");
  url.searchParams.set("user.fields", "name,username");
  const result = await readJson(
    await publishingFetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store"
    }),
    "X profile"
  );
  return result.data;
}
var init_channelOAuth = __esm({
  "lib/channelOAuth.ts"() {
    "use strict";
    init_messagingAccess();
    init_executionContext();
    init_messagingProvider();
  }
});

// lib/publishing/http.ts
async function providerJson(url, init = {}) {
  const response = await publishingFetch(url, { ...init, cache: "no-store", signal: init.signal ?? AbortSignal.timeout(6e4) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error || Array.isArray(data.errors) && data.errors.length && !data.data) {
    const message = data.error?.message || data.errors?.[0]?.detail || data.detail || data.message || `Platform request failed (${response.status}).`;
    throw Object.assign(new Error(message), { status: response.status, providerCode: data.error?.code });
  }
  return data;
}
function linkedInHeaders(token) {
  return { Authorization: `Bearer ${token}`, "LinkedIn-Version": process.env.LINKEDIN_API_VERSION || "202609", "X-Restli-Protocol-Version": "2.0.0", "Content-Type": "application/json" };
}
var init_http = __esm({
  "lib/publishing/http.ts"() {
    "use strict";
    init_executionContext();
  }
});

// lib/linkedin/pages.ts
async function linkedInPages(connection) {
  requireScopes(connection, ["rw_organization_admin", "w_organization_social"]);
  const headers = linkedInHeaders(connection.accessToken);
  const pages = /* @__PURE__ */ new Map();
  for (let start = 0; ; start += 100) {
    if (start >= 1e4) throw Error("LinkedIn organization lookup exceeded its bounded page limit.");
    const result = await providerJson(`https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&state=APPROVED&start=${start}&count=100`, { headers });
    const entries = result.elements || [];
    for (const entry of entries) {
      if (entry.state !== "APPROVED" || entry.role !== "ADMINISTRATOR" || !/^urn:li:organization:\d+$/.test(entry.organization) || pages.has(entry.organization)) continue;
      const id3 = entry.organization.split(":").at(-1);
      const page = await providerJson(`https://api.linkedin.com/rest/organizations/${id3}`, { headers });
      pages.set(entry.organization, { id: entry.organization, name: page.localizedName || `LinkedIn Page ${id3}` });
    }
    if (entries.length < 100) break;
  }
  return [...pages.values()];
}
var init_pages = __esm({
  "lib/linkedin/pages.ts"() {
    "use strict";
    init_http();
    init_nativeTokenServices();
  }
});

// lib/publishing/showworkPublishingAccounts.ts
function createShowworkPublishingAccounts(input, validation, coordination) {
  async function accountIO(run3) {
    if (!input.accountFetch) throw Error("EXPLICIT_ACCOUNT_HTTP_REQUIRED");
    return withPublishingAccountIO({ fetch: input.accountFetch, signal: AbortSignal.timeout(3e4) }, run3);
  }
  const refresh = createFencedTokenRefresh({ database: input.database, validation, coordination, refresh: async (target2) => {
    if (!target2.refreshToken) throw Error("RECONNECT_REQUIRED");
    if (target2.platform === "TIKTOK") {
      const tokens2 = await accountIO(() => refreshTikTokAccessToken(target2.refreshToken));
      return { accountId: tokens2.open_id, accessToken: tokens2.access_token, expiresAt: new Date(Date.now() + tokens2.expires_in * 1e3), scopes: tokens2.scope, refreshToken: tokens2.refresh_token, refreshTokenExpiresAt: new Date(Date.now() + tokens2.refresh_expires_in * 1e3) };
    }
    if (target2.platform !== "X" && target2.platform !== "LINKEDIN") throw Error("RECONNECT_EXACT_ACCOUNT_REQUIRED");
    const stored = await input.database.transaction(async (tx) => (await tx.query(`SELECT s.*,c."linkedinMemberId" FROM "SocialConnection" s JOIN "SocialCalendar" c ON c.id=s."calendarId" WHERE s.id=$1`, [target2.connectionId])).rows[0]);
    if (!stored) throw Error("ACCOUNT_DISCONNECTED");
    const tokens = await accountIO(() => requestSocialTokenRefresh(target2.platform, target2.refreshToken)), member = target2.platform === "X" ? await accountIO(() => getXMember(tokens.access_token)) : await accountIO(() => getLinkedInMember(tokens.access_token));
    const id3 = "id" in member ? member.id : member.sub, organization = target2.accountId.startsWith("urn:li:organization:");
    if (id3 !== (organization ? stored.linkedinMemberId : target2.accountId.replace(/^urn:li:person:/, ""))) throw Error("REFRESH_ACCOUNT_CHANGED");
    if (organization) {
      const pages = await accountIO(() => linkedInPages({ ...stored, accessToken: tokens.access_token, tokenScopes: tokens.scope ?? stored.tokenScopes }));
      if (!pages.some((page) => page.id === target2.accountId)) throw Error("LINKEDIN_ORGANIZATION_PERMISSION_REVOKED");
    }
    const connection = await input.database.transaction(async (tx) => (await tx.query(`SELECT "tokenScopes" FROM "SocialConnection" WHERE id=$1`, [target2.connectionId])).rows[0]);
    return { accountId: target2.accountId, accessToken: tokens.access_token, expiresAt: new Date(Date.now() + tokens.expires_in * 1e3), scopes: tokens.scope ?? connection.tokenScopes ?? "", refreshToken: tokens.refresh_token, refreshTokenExpiresAt: tokens.refresh_token_expires_in ? new Date(Date.now() + tokens.refresh_token_expires_in * 1e3) : void 0 };
  } });
  async function ensureFreshAccount(target2, options) {
    if (options?.reconciliation) {
      const history = await input.database.transaction(async (tx) => (await tx.query(`SELECT s.*,b."currentVersion",currentv."providerAccountId" AS "currentAccountId",currentv."connectionId" AS "currentConnectionId" FROM "PublishingAccountVersion" v JOIN "SocialConnection" s ON s.id=v."connectionId" JOIN "PublishingAccountBinding" b ON b.id=v."bindingId" JOIN "PublishingAccountVersion" currentv ON currentv."bindingId"=b.id AND currentv.version=b."currentVersion" JOIN "PublishingSendCapability" c ON c."jobId"=$1 AND c.state='CONSUMED' WHERE v."bindingId"=$2 AND v.version=$3 AND s.id=$4 AND s."platformAccountId"=$5 AND s.platform=$6 AND s.status='CONNECTED' AND c."intentId"=$7 AND c.revision=$8 AND c.generation=$9 AND c."contentHash"=$10`, [target2.jobId, target2.accountBindingId, target2.accountVersion, target2.connectionId, target2.providerAccountId, target2.platform, target2.intentId, target2.revision, target2.generation, target2.contentHash])).rows[0]);
      if (!history?.accessToken) throw Error("HISTORICAL_ACCOUNT_UNAVAILABLE");
      if (!history.accessTokenExpiresAt || history.accessTokenExpiresAt.getTime() > Date.now() + 6e4) return { maySend: false };
      if (history.currentAccountId !== target2.providerAccountId || history.currentConnectionId !== target2.connectionId) throw Error("RECONNECT_HISTORICAL_ACCOUNT_FOR_RECONCILIATION");
      return refresh.refresh({ ...target2, accountVersion: history.currentVersion });
    }
    const connection = await input.database.transaction(async (tx) => (await tx.query(`SELECT s.* FROM "PublishingAccountBinding" b JOIN "PublishingAccountVersion" v ON v."bindingId"=b.id AND v.version=b."currentVersion" JOIN "SocialConnection" s ON s.id=v."connectionId" WHERE b.id=$1 AND b."currentVersion"=$2 AND b.state='CONNECTED' AND s.id=$3 AND s.status='CONNECTED' AND s."platformAccountId"=$4`, [target2.accountBindingId, target2.accountVersion, target2.connectionId, target2.providerAccountId])).rows[0]);
    if (!connection?.accessToken) throw Error("ACCOUNT_DISCONNECTED");
    if (!connection.accessTokenExpiresAt || connection.accessTokenExpiresAt.getTime() > Date.now() + 6e4) return { maySend: false };
    if (connection.refreshTokenExpiresAt && connection.refreshTokenExpiresAt <= /* @__PURE__ */ new Date()) throw Error("RECONNECT_REQUIRED");
    return refresh.refresh(target2);
  }
  async function freshConnection(original) {
    if (original.status !== "CONNECTED" || !["X", "LINKEDIN", "TIKTOK"].includes(original.platform)) throw Error("ACCOUNT_DISCONNECTED");
    const read = () => input.database.transaction(async (tx) => (await tx.query(`SELECT s.*,b.id AS "bindingId",b."currentVersion" FROM "PublishingAccountBinding" b JOIN "PublishingAccountVersion" v ON v."bindingId"=b.id AND v.version=b."currentVersion" JOIN "SocialConnection" s ON s.id=v."connectionId" WHERE b."calendarId"=$1 AND b.platform=$2 AND b.state='CONNECTED' AND s.id=$3 AND s.status='CONNECTED' AND s."platformAccountId"=$4 AND s."connectedAt"=$5`, [original.calendarId, original.platform, original.id, original.platformAccountId, original.connectedAt])).rows[0]);
    const current = await read();
    if (!current?.accessToken) throw Error("ACCOUNT_DISCONNECTED");
    await ensureFreshAccount({ jobId: "account-read", intentId: "account-read", revision: 1, generation: 1, platform: original.platform, accountBindingId: current.bindingId, accountVersion: current.currentVersion, providerAccountId: original.platformAccountId, connectionId: original.id, contentHash: "account-read" });
    const updated = await read();
    if (!updated?.accessToken || updated.bindingId !== current.bindingId || updated.currentVersion !== current.currentVersion) throw Error("ACCOUNT_CHANGED_DURING_REFRESH");
    const { bindingId: _binding, currentVersion: _version, ...connection } = updated;
    return connection;
  }
  return { accountIO, ensureFreshAccount, freshConnection };
}
var init_showworkPublishingAccounts = __esm({
  "lib/publishing/showworkPublishingAccounts.ts"() {
    "use strict";
    init_tokenRefreshFence();
    init_executionContext();
    init_tiktok();
    init_nativeTokenServices();
    init_channelOAuth();
    init_pages();
  }
});

// lib/publishing/credentialResolver.ts
function createCanonicalCredentialResolver(database) {
  return async (target2) => database.transaction(async (tx) => {
    const c = (await tx.query(`SELECT s."accessToken" AS token,s.id AS "connectionId",s."platformAccountId" AS "providerAccountId",b.id AS "accountBindingId",b."currentVersion" AS "accountVersion"
  FROM "PublishingAccountBinding" b JOIN "PublishingAccountVersion" v ON v."bindingId"=b.id AND v.version=b."currentVersion" JOIN "SocialConnection" s ON s.id=v."connectionId"
  JOIN "PublishingCanonicalRevision" r ON r."accountBindingId"=b.id AND r."accountVersion"=v.version WHERE r."jobId"=$1 AND b.id=$2 AND v.version=$3 AND b.state='CONNECTED' AND s.status='CONNECTED' AND s.id=$4 AND s."platformAccountId"=$5 AND s.platform=$6 AND s."accessToken" IS NOT NULL AND (s."accessTokenExpiresAt" IS NULL OR s."accessTokenExpiresAt">clock_timestamp())`, [target2.jobId, target2.accountBindingId, target2.accountVersion, target2.connectionId, target2.providerAccountId, target2.platform])).rows[0];
    if (!c) throw Error("CANONICAL_CREDENTIAL_UNAVAILABLE");
    return { token: c.token, connectionId: c.connectionId, providerAccountId: c.providerAccountId, accountBindingId: c.accountBindingId, accountVersion: c.accountVersion };
  });
}
function createCanonicalReconciliationCredentialResolver(database) {
  return async (target2) => database.transaction(async (tx) => {
    const row = (await tx.query(`SELECT s."accessToken" AS token,s.id AS "connectionId",s."platformAccountId" AS "providerAccountId",r."accountBindingId",r."accountVersion" FROM "PublishingCanonicalRevision" r JOIN "PublishingAccountVersion" v ON v."bindingId"=r."accountBindingId" AND v.version=r."accountVersion" JOIN "SocialConnection" s ON s.id=v."connectionId" JOIN "PublishingJob" j ON j.id=r."jobId" JOIN "PublishingSendCapability" cap ON cap."jobId"=j.id AND cap.state='CONSUMED' WHERE j.id=$1 AND j."intentId"=$2 AND j."intentRevision"=$3 AND r."accountBindingId"=$4 AND r."accountVersion"=$5 AND s.id=$6 AND s."platformAccountId"=$7 AND s.platform=$8 AND j.platform=$8 AND cap.generation=$9 AND cap."contentHash"=$10 AND s.status='CONNECTED' AND s."accessToken" IS NOT NULL AND (s."accessTokenExpiresAt" IS NULL OR s."accessTokenExpiresAt">clock_timestamp())`, [target2.jobId, target2.intentId, target2.revision, target2.accountBindingId, target2.accountVersion, target2.connectionId, target2.providerAccountId, target2.platform, target2.generation, target2.contentHash])).rows[0];
    if (!row) throw Error("HISTORICAL_RECONCILIATION_CREDENTIAL_UNAVAILABLE");
    return { token: row.token, connectionId: row.connectionId, providerAccountId: row.providerAccountId, accountBindingId: row.accountBindingId, accountVersion: row.accountVersion };
  });
}
var init_credentialResolver = __esm({
  "lib/publishing/credentialResolver.ts"() {
    "use strict";
  }
});

// lib/publishing/ownership.ts
function transitionAllowed(from, to) {
  return from !== to && (from === "DRAINING" || to === "DRAINING") && ["NETLIFY", "DRAINING", "VPS"].includes(from) && ["NETLIFY", "DRAINING", "VPS"].includes(to);
}
function outcomeAllowed(from, to) {
  return ["AUTHORIZED", "ACCEPTED", "UNKNOWN"].includes(from) && ["ACCEPTED", "CONFIRMED", "REJECTED", "UNKNOWN"].includes(to);
}
function requireValue2(ok, code) {
  if (!ok) throw new OwnershipError(code);
}
function identifier2(value) {
  requireValue2(typeof value === "string" && /^[a-zA-Z0-9_-]{1,120}$/.test(value), "INVALID_IDENTIFIER");
}
function createPublishingOwnership(database) {
  async function atomic(run3) {
    try {
      return await database.transaction(run3);
    } catch (error) {
      if (error instanceof OwnershipError) throw error;
      throw new OwnershipError("OWNERSHIP_TRANSACTION_UNCONFIRMED");
    }
  }
  async function transition(input) {
    identifier2(input.operationId);
    identifier2(input.actor);
    return atomic(async (tx) => {
      const owner = (await tx.query('SELECT * FROM "PublishingOwnership" WHERE id=1 FOR UPDATE')).rows[0];
      const previous = (await tx.query('SELECT * FROM "PublishingOwnershipEvent" WHERE "operationId"=$1', [input.operationId])).rows[0];
      if (previous) {
        requireValue2(previous.actor === input.actor && previous.toState === input.to && BigInt(previous.epoch) === input.expectedEpoch + BigInt(1), "OPERATION_CONFLICT");
        return { epoch: BigInt(previous.epoch), replay: true };
      }
      requireValue2(owner && BigInt(owner.epoch) === input.expectedEpoch, "STALE_EPOCH");
      requireValue2(transitionAllowed(owner.state, input.to), "INVALID_TRANSITION");
      requireValue2(owner.enabled || input.activate === true && owner.state === "DRAINING" && input.to === "NETLIFY", "OWNERSHIP_INACTIVE");
      if (input.to !== "DRAINING") {
        const unresolved = await tx.query(`SELECT id FROM "PublishingExternalAttempt" WHERE outcome IN ('AUTHORIZED','ACCEPTED','UNKNOWN') LIMIT 1`);
        requireValue2(!unresolved.rows.length, "UNRESOLVED_ATTEMPTS");
        if (owner.enabled) {
          const legacy = await tx.query(`SELECT id FROM "PublishingJob" WHERE "intentId" IS NULL AND phase IN ('EXTERNAL_PENDING','PROVIDER_PENDING','OUTCOME_UNKNOWN') LIMIT 1`);
          requireValue2(!legacy.rows.length, "UNRESOLVED_LEGACY_JOBS");
        }
      }
      const epoch = input.expectedEpoch + BigInt(1);
      await tx.query('UPDATE "PublishingOwnership" SET state=$1,epoch=$2,enabled=true WHERE id=1', [input.to, epoch.toString()]);
      await tx.query('INSERT INTO "PublishingOwnershipEvent" ("operationId","fromState","toState",epoch,actor) VALUES($1,$2,$3,$4,$5)', [input.operationId, owner.state, input.to, epoch.toString(), input.actor]);
      return { epoch, replay: false };
    });
  }
  async function createIntent(input) {
    identifier2(input.id);
    identifier2(input.postId);
    requireValue2(["INSTAGRAM", "TIKTOK", "FACEBOOK", "LINKEDIN", "X"].includes(input.platform) && Number.isFinite(input.dueAt?.getTime()), "INVALID_INTENT");
    return atomic(async (tx) => {
      await tx.query('INSERT INTO "PublishingIntent" (id,"postId",platform,"currentRevision") VALUES($1,$2,$3,1)', [input.id, input.postId, input.platform]);
      await tx.query('INSERT INTO "PublishingIntentRevision" ("intentId",revision,"dueAt") VALUES($1,1,$2)', [input.id, input.dueAt]);
      return { id: input.id, revision: 1 };
    });
  }
  async function reviseIntent(id3, expectedRevision, dueAt) {
    identifier2(id3);
    requireValue2(Number.isSafeInteger(expectedRevision) && expectedRevision > 0 && expectedRevision < 2147483647 && Number.isFinite(dueAt?.getTime()), "INVALID_REVISION");
    return atomic(async (tx) => {
      const intent = (await tx.query('SELECT * FROM "PublishingIntent" WHERE id=$1 FOR UPDATE', [id3])).rows[0];
      requireValue2(intent?.state === "ACTIVE" && intent.currentRevision === expectedRevision, "STALE_REVISION");
      requireValue2(!(await tx.query('SELECT id FROM "PublishingExternalAttempt" WHERE "intentId"=$1', [id3])).rows.length, "ATTEMPT_EXISTS");
      await tx.query('INSERT INTO "PublishingIntentRevision" ("intentId",revision,"dueAt") VALUES($1,$2,$3)', [id3, expectedRevision + 1, dueAt]);
      await tx.query('UPDATE "PublishingIntent" SET "currentRevision"=$2 WHERE id=$1', [id3, expectedRevision + 1]);
      return expectedRevision + 1;
    });
  }
  async function authorize(input) {
    for (const value of [input.attemptId, input.intentId, input.jobId, input.actor]) identifier2(value);
    requireValue2(["NETLIFY", "VPS"].includes(input.owner), "INVALID_OWNER");
    return atomic(async (tx) => {
      const owner = (await tx.query('SELECT * FROM "PublishingOwnership" WHERE id=1 FOR SHARE')).rows[0];
      requireValue2(owner?.enabled && owner.state === input.owner && BigInt(owner.epoch) === input.epoch, "OWNERSHIP_FENCED");
      const intent = (await tx.query('SELECT * FROM "PublishingIntent" WHERE id=$1 FOR UPDATE', [input.intentId])).rows[0];
      requireValue2(intent?.state === "ACTIVE" && intent.currentRevision === input.revision, "STALE_REVISION");
      const existing = (await tx.query('SELECT * FROM "PublishingExternalAttempt" WHERE "intentId"=$1', [input.intentId])).rows[0];
      if (existing) {
        requireValue2(existing.id === input.attemptId && existing.jobId === input.jobId && existing.actor === input.actor && existing.owner === input.owner && BigInt(existing.epoch) === input.epoch, "ATTEMPT_EXISTS");
        return { attemptId: existing.id, maySend: false };
      }
      const job = (await tx.query(`SELECT j.id FROM "PublishingJob" j JOIN "PublishingIntentRevision" r ON r."intentId"=j."intentId" AND r.revision=j."intentRevision"
        WHERE j.id=$1 AND j."intentId"=$2 AND j."intentRevision"=$3 AND j."ownershipEpoch"=$4 AND j.phase='PREPARED'
        AND j."postId"=$5 AND j.platform=$6 AND r."dueAt"<=clock_timestamp() FOR UPDATE OF j`, [input.jobId, input.intentId, input.revision, input.epoch.toString(), intent.postId, intent.platform])).rows[0];
      requireValue2(job, "JOB_NOT_ELIGIBLE");
      await tx.query('INSERT INTO "PublishingExternalAttempt" (id,"intentId",revision,"jobId",owner,epoch,actor) VALUES($1,$2,$3,$4,$5,$6,$7)', [input.attemptId, input.intentId, input.revision, input.jobId, input.owner, input.epoch.toString(), input.actor]);
      await tx.query(`UPDATE "PublishingJob" SET phase='EXTERNAL_PENDING' WHERE id=$1`, [input.jobId]);
      return { attemptId: input.attemptId, maySend: true };
    });
  }
  async function recordOutcome(input) {
    for (const value of [input.operationId, input.attemptId, input.actor]) identifier2(value);
    requireValue2(input.remoteReference === void 0 || typeof input.remoteReference === "string" && input.remoteReference.length > 0 && input.remoteReference.length <= 500, "INVALID_REFERENCE");
    return atomic(async (tx) => {
      const attempt = (await tx.query('SELECT * FROM "PublishingExternalAttempt" WHERE id=$1 FOR UPDATE', [input.attemptId])).rows[0];
      requireValue2(attempt, "ATTEMPT_MISSING");
      const previous = (await tx.query('SELECT * FROM "PublishingAttemptEvent" WHERE "operationId"=$1', [input.operationId])).rows[0];
      if (previous) {
        requireValue2(previous.attemptId === input.attemptId && previous.actor === input.actor && previous.outcome === input.outcome && previous.remoteReference === (input.remoteReference ?? null), "OPERATION_CONFLICT");
        return;
      }
      requireValue2(outcomeAllowed(attempt.outcome, input.outcome), "OUTCOME_TERMINAL");
      requireValue2(!attempt.remoteReference || !input.remoteReference || attempt.remoteReference === input.remoteReference, "REFERENCE_CONFLICT");
      requireValue2(!["ACCEPTED", "CONFIRMED"].includes(input.outcome) || input.remoteReference || attempt.remoteReference, "REFERENCE_REQUIRED");
      await tx.query('INSERT INTO "PublishingAttemptEvent" ("operationId","attemptId",outcome,"remoteReference",actor) VALUES($1,$2,$3,$4,$5)', [input.operationId, input.attemptId, input.outcome, input.remoteReference ?? null, input.actor]);
      await tx.query('UPDATE "PublishingExternalAttempt" SET outcome=$2,"remoteReference"=COALESCE("remoteReference",$3) WHERE id=$1', [input.attemptId, input.outcome, input.remoteReference ?? null]);
    });
  }
  async function recoverAttempt(id3) {
    identifier2(id3);
    return atomic(async (tx) => ({ record: (await tx.query('SELECT * FROM "PublishingExternalAttempt" WHERE id=$1', [id3])).rows[0] ?? null, maySend: false }));
  }
  return { transition, createIntent, reviseIntent, authorize, recordOutcome, recoverAttempt };
}
var OwnershipError;
var init_ownership = __esm({
  "lib/publishing/ownership.ts"() {
    "use strict";
    OwnershipError = class extends Error {
      constructor(code) {
        super(code);
        this.code = code;
        this.name = "OwnershipError";
      }
    };
  }
});

// lib/publishing/externalAuthorization.ts
function isPublicationInvocationAuthorization(value) {
  return typeof value === "object" && value !== null && providerInvocations.has(value);
}
function registerProviderExecutionRequest(auth, target2, operation, payload) {
  const entry = providerInvocations.get(auth);
  if (!entry || entry.targetHash !== policyHash(target2) || entry.request) throw new PublicationAuthorizationError("PROVIDER_CONTEXT_NOT_FRESH");
  entry.request = { operation, payloadHash: policyHash(payload) };
}
function matchesProviderExecutionRequest(auth, target2, operation, payload) {
  const entry = providerInvocations.get(auth);
  return !!entry && entry.targetHash === policyHash(target2) && entry.request?.operation === operation && entry.request.payloadHash === policyHash(payload);
}
function ensure2(ok, code) {
  if (!ok) throw new PublicationAuthorizationError(code);
}
function identifier3(s) {
  ensure2(typeof s === "string" && /^[a-zA-Z0-9_-]{1,120}$/.test(s), "INVALID_IDENTIFIER");
}
function target(job) {
  return { jobId: job.id, intentId: job.intentId, revision: job.revision, generation: job.generation, platform: job.platform, accountBindingId: job.accountBindingId, accountVersion: job.accountVersion, providerAccountId: job.providerAccountId, connectionId: job.connectionId, contentHash: job.contentHash };
}
function validTarget(t) {
  ensure2(t && typeof t === "object", "PUBLICATION_TARGET_REQUIRED");
  for (const s of [t.jobId, t.intentId, t.accountBindingId, t.connectionId]) identifier3(s);
  ensure2([t.revision, t.generation, t.accountVersion].every((n) => Number.isSafeInteger(n) && n > 0 && n <= 2147483647) && ["INSTAGRAM", "TIKTOK", "FACEBOOK", "LINKEDIN", "X"].includes(t.platform) && typeof t.providerAccountId === "string" && t.providerAccountId.length > 0 && /^[a-f0-9]{64}$/.test(t.contentHash), "INVALID_TARGET");
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
  ensure2(j, "CANONICAL_JOB_MISSING");
  return j;
}
function createExternalPublicationAuthorization(deps) {
  const ttl = deps.capabilityTtlMs ?? 15e3;
  ensure2(Number.isSafeInteger(ttl) && ttl > 0 && ttl <= 3e4, "INVALID_CAPABILITY_TTL");
  const registry = /* @__PURE__ */ new WeakMap();
  async function atomic(fn) {
    return deps.database.transaction(async (tx) => {
      ensure2((await tx.query("SHOW transaction_isolation")).rows[0]?.transaction_isolation === "read committed", "AUTHORIZATION_ISOLATION_REQUIRED");
      return fn(tx);
    });
  }
  async function authorize(input) {
    input = Object.freeze({ ...input });
    validTarget(input);
    identifier3(input.operationId);
    identifier3(input.actor);
    identifier3(input.workerToken);
    ensure2(["NETLIFY", "VPS"].includes(input.owner) && typeof input.epoch === "bigint" && input.epoch > BigInt(0), "INVALID_OWNER");
    const requestHash = policyHash({ ...input, epoch: String(input.epoch) });
    const committed = await atomic(async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`external-auth:${input.operationId}`]);
      const old = (await tx.query(`SELECT * FROM "PublishingAuthorizationOperation" WHERE "operationId"=$1`, [input.operationId])).rows[0];
      if (old) {
        ensure2(old.actor === input.actor && old.requestHash === requestHash, "OPERATION_CONFLICT");
        return { receipt: { outcome: "REPLAY", authorizationId: old.authorizationId, maySend: false } };
      }
      const job = await readJob(tx, input.jobId);
      ensure2(policyHash(target(job)) === policyHash({ jobId: input.jobId, intentId: input.intentId, revision: input.revision, generation: input.generation, platform: input.platform, accountBindingId: input.accountBindingId, accountVersion: input.accountVersion, providerAccountId: input.providerAccountId, connectionId: input.connectionId, contentHash: input.contentHash }), "PUBLICATION_IDENTITY_CONFLICT");
      const existing = (await tx.query(`SELECT id FROM "PublishingSendCapability" WHERE "jobId"=$1`, [job.id])).rows[0];
      if (existing) return { receipt: { outcome: "PENDING_RECONCILIATION", authorizationId: existing.id, maySend: false } };
      ensure2(job.workerToken === input.workerToken, "WORKER_CLAIM_FENCED");
      const proof = await deps.validation.validateBeforeExternal(tx, { job, owner: input.owner, epoch: input.epoch });
      const authorizationId = (0, import_node_crypto10.randomUUID)(), attemptId = (0, import_node_crypto10.randomUUID)();
      let rootAttemptId = null, retryGenerationId = null;
      if (job.generation === 1) {
        const scoped = createPublishingOwnership({ transaction: (fn) => fn(tx) });
        const r = await scoped.authorize({ attemptId, intentId: job.intentId, revision: job.revision, jobId: job.id, owner: input.owner, epoch: input.epoch, actor: input.actor });
        ensure2(r.maySend, "INITIAL_ATTEMPT_ALREADY_EXISTS");
        rootAttemptId = attemptId;
      } else {
        const g = (await tx.query(`SELECT * FROM "PublishingRetryGeneration" WHERE "jobId"=$1 FOR UPDATE`, [job.id])).rows[0];
        ensure2(g && g.generation === job.generation && g.revision === job.revision && g.intentId === job.intentId && g.outcome === "READY", "RETRY_GENERATION_NOT_ELIGIBLE");
        const e = (await tx.query(`SELECT * FROM "PublishingRetryEvidence" WHERE id=$1`, [g.evidenceId])).rows[0];
        ensure2(e && e.actorStopped && e.verified && e.retryable && e.intentId === job.intentId && e.rootAttemptId === g.rootAttemptId && e.predecessorGenerationId === g.predecessorGenerationId, "TRUSTED_RETRY_EVIDENCE_REQUIRED");
        await tx.query(`UPDATE "PublishingRetryGeneration" SET outcome='AUTHORIZED',owner=$2,epoch=$3,"authorizationId"=$4 WHERE id=$1`, [g.id, input.owner, String(input.epoch), authorizationId]);
        await tx.query(`INSERT INTO "PublishingRetryEvent"("operationId","generationId",outcome,actor) VALUES($1,$2,'AUTHORIZED',$3)`, [(0, import_node_crypto10.randomUUID)(), g.id, input.actor]);
        await tx.query(`UPDATE "PublishingJob" SET phase='EXTERNAL_PENDING' WHERE id=$1`, [job.id]);
        retryGenerationId = g.id;
      }
      const secret = (0, import_node_crypto10.randomBytes)(32).toString("hex"), tokenHash = (0, import_node_crypto10.createHash)("sha256").update(secret).digest("hex");
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
    identifier3(operationId);
    return atomic(async (tx) => {
      const row = (await tx.query(`SELECT o."authorizationId",c."jobId",c."intentId",c.revision,c.generation,c.state,c."expiresAt"<=clock_timestamp() AS expired FROM "PublishingAuthorizationOperation" o JOIN "PublishingSendCapability" c ON c.id=o."authorizationId" WHERE o."operationId"=$1`, [operationId])).rows[0] ?? null;
      return { record: row, maySend: false };
    });
  }
  async function consume(capability, expected) {
    expected = Object.freeze({ ...expected });
    validTarget(expected);
    const handle = capability && registry.get(capability);
    ensure2(handle && !handle.used, "PUBLICATION_CAPABILITY_REQUIRED");
    ensure2(policyHash(handle.target) === policyHash(expected), "CAPABILITY_PUBLICATION_MISMATCH");
    handle.used = true;
    return atomic(async (tx) => {
      const metadata = (await tx.query(`SELECT * FROM "PublishingSendCapability" WHERE id=$1`, [handle.id])).rows[0];
      ensure2(metadata, "CAPABILITY_MISSING");
      const owner = (await tx.query(`SELECT * FROM "PublishingOwnership" WHERE id=1 FOR SHARE`)).rows[0];
      ensure2(owner?.enabled && owner.state === metadata.owner && String(owner.epoch) === String(metadata.epoch), "CAPABILITY_OWNERSHIP_FENCED");
      const job = await readJob(tx, expected.jobId);
      ensure2(policyHash(target(job)) === policyHash(expected), "CAPABILITY_PUBLICATION_MISMATCH");
      ensure2(job.workerToken === metadata.workerToken, "CAPABILITY_WORKER_FENCED");
      const validated = await deps.validation.validateExecution(tx, job);
      const i = (await tx.query(`SELECT * FROM "PublishingIntent" WHERE id=$1 FOR UPDATE`, [job.intentId])).rows[0];
      ensure2(i?.state === "ACTIVE" && i.currentRevision === job.revision, "INTENT_FENCED");
      const j = (await tx.query(`SELECT phase FROM "PublishingJob" WHERE id=$1 FOR UPDATE`, [job.id])).rows[0];
      ensure2(j?.phase === "EXTERNAL_PENDING", "PUBLICATION_ALREADY_RESOLVED");
      const c = (await tx.query(`SELECT *,"expiresAt">clock_timestamp() AS live FROM "PublishingSendCapability" WHERE id=$1 FOR UPDATE`, [handle.id])).rows[0];
      ensure2(c.state === "ISSUED" && c.live && c.tokenHash === (0, import_node_crypto10.createHash)("sha256").update(handle.secret).digest("hex"), "CAPABILITY_EXPIRED_REVOKED_OR_SPENT");
      const post = (await tx.query(`SELECT platform,"postType",caption,cta,hashtags,"taggedAccounts","linkUrl","tikTokSettings" FROM "CalendarPost" WHERE id=$1`, [job.postId])).rows[0];
      const assets = (await tx.query(`SELECT id,"fileKey","mediaType","displayOrder",to_jsonb(a)->>'objectVersion' AS "objectVersion",to_jsonb(a)->>'contentSha256' AS "contentSha256" FROM "CalendarPostAsset" a WHERE "postId"=$1 ORDER BY "displayOrder",id`, [job.postId])).rows;
      ensure2(post && publishingContentHash(post, assets) === job.contentHash, "SUBMISSION_CONTENT_CHANGED");
      await tx.query(`UPDATE "PublishingSendCapability" SET state='CONSUMED',"consumedAt"=clock_timestamp(),"consumedFenceVersion"=$2,"consumedValidUntil"=LEAST("expiresAt",$3::timestamptz) WHERE id=$1`, [c.id, validated.fenceVersion, validated.validUntil]);
      await tx.query(`INSERT INTO "PublishingCapabilityEvent"("operationId","authorizationId",transition,actor,"requestHash") VALUES($1,$2,'CONSUMED',$3,$4)`, [(0, import_node_crypto10.randomUUID)(), c.id, c.actor, policyHash(expected)]);
      return { authorizationId: c.id, actor: c.actor, deadline: new Date(Math.min(c.expiresAt.getTime(), validated.validUntil.getTime())), submission: seal({ target: { ...expected }, post, assets, authorization: { id: c.id, actor: c.actor, owner: c.owner, epoch: String(c.epoch), rootAttemptId: c.rootAttemptId, retryGenerationId: c.retryGenerationId, expiresAt: new Date(Math.min(c.expiresAt.getTime(), validated.validUntil.getTime())).toISOString() } }) };
    });
  }
  async function revoke(input) {
    input = Object.freeze({ ...input });
    for (const s of [input.operationId, input.authorizationId, input.actor]) identifier3(s);
    ensure2(typeof input.reason === "string" && input.reason.length > 0 && input.reason.length <= 200, "INVALID_REVOCATION_REASON");
    return atomic(async (tx) => {
      const c = (await tx.query(`SELECT * FROM "PublishingSendCapability" WHERE id=$1 FOR UPDATE`, [input.authorizationId])).rows[0];
      ensure2(c && c.actor === input.actor, "CAPABILITY_ACTOR_CONFLICT");
      const digest = policyHash(input), prior = (await tx.query(`SELECT * FROM "PublishingCapabilityEvent" WHERE "operationId"=$1`, [input.operationId])).rows[0];
      if (prior) {
        ensure2(prior.requestHash === digest, "OPERATION_CONFLICT");
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
    for (const s of [input.operationId, input.authorizationId, input.actor]) identifier3(s);
    ensure2(["ACCEPTED", "CONFIRMED", "REJECTED", "UNKNOWN"].includes(input.outcome), "INVALID_OUTCOME");
    ensure2(input.reference === void 0 || typeof input.reference === "string" && input.reference.length > 0 && input.reference.length <= 500, "INVALID_REFERENCE");
    return atomic(async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`auth-outcome:${input.operationId}`]);
      const old = (await tx.query(`SELECT * FROM "PublishingAuthorizationOutcome" WHERE "operationId"=$1`, [input.operationId])).rows[0], digest = policyHash(input);
      if (old) {
        ensure2(old.requestHash === digest, "OPERATION_CONFLICT");
        return { replay: true, maySend: false };
      }
      const c = (await tx.query(`SELECT * FROM "PublishingSendCapability" WHERE id=$1`, [input.authorizationId])).rows[0];
      ensure2(c && c.actor === input.actor && c.state === "CONSUMED", "OUTCOME_REQUIRES_SPENT_CAPABILITY");
      await tx.query(`SELECT id FROM "PublishingIntent" WHERE id=$1 FOR UPDATE`, [c.intentId]);
      await tx.query(`SELECT id FROM "PublishingJob" WHERE id=$1 FOR UPDATE`, [c.jobId]);
      if (c.rootAttemptId) await createPublishingOwnership({ transaction: (fn) => fn(tx) }).recordOutcome({ operationId: (0, import_node_crypto10.randomUUID)(), attemptId: c.rootAttemptId, actor: input.actor, outcome: input.outcome, remoteReference: input.reference });
      else {
        const g = (await tx.query(`SELECT * FROM "PublishingRetryGeneration" WHERE id=$1 FOR UPDATE`, [c.retryGenerationId])).rows[0];
        ensure2(outcomeAllowed(g.outcome, input.outcome), "OUTCOME_TERMINAL");
        ensure2(!g.remoteReference || !input.reference || g.remoteReference === input.reference, "REFERENCE_CONFLICT");
        ensure2(!["ACCEPTED", "CONFIRMED"].includes(input.outcome) || g.remoteReference || input.reference, "REFERENCE_REQUIRED");
        await tx.query(`INSERT INTO "PublishingRetryEvent"("operationId","generationId",outcome,"remoteReference",actor) VALUES($1,$2,$3,$4,$5)`, [(0, import_node_crypto10.randomUUID)(), g.id, input.outcome, input.reference ?? null, input.actor]);
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
      ensure2(typeof driver === "function", "SYNTHETIC_DRIVER_REQUIRED");
      return {
        async publish(input) {
          ensure2(input && typeof input === "object", "PUBLICATION_CONTEXT_REQUIRED");
          const spent = await consume(input.capability, input.target);
          ensure2(Date.now() < spent.deadline.getTime(), "CAPABILITY_EXPIRED_BEFORE_INVOCATION");
          providerInvocations.set(spent.submission.authorization, { targetHash: policyHash(spent.submission.target) });
          let observed;
          try {
            observed = await driver(spent.submission);
            ensure2(observed && ["ACCEPTED", "CONFIRMED", "REJECTED", "UNKNOWN"].includes(observed.outcome), "INVALID_PROVIDER_OBSERVATION");
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
            await recordOutcome({ operationId: (0, import_node_crypto10.randomUUID)(), authorizationId: spent.authorizationId, actor: spent.actor, outcome: observed.outcome, reference: "reference" in observed ? observed.reference : void 0 });
          } catch {
            return { outcome: "UNKNOWN", ..."reference" in observed && observed.reference ? { reference: observed.reference } : {} };
          }
          return observed;
        }
      };
    }
  };
}
var import_node_crypto10, providerInvocations, PublicationAuthorizationError;
var init_externalAuthorization = __esm({
  "lib/publishing/externalAuthorization.ts"() {
    "use strict";
    import_node_crypto10 = require("node:crypto");
    init_ownership();
    init_eligibilityPolicy();
    providerInvocations = /* @__PURE__ */ new WeakMap();
    PublicationAuthorizationError = class extends Error {
      constructor(code) {
        super(code);
        this.code = code;
        this.name = "PublicationAuthorizationError";
      }
    };
  }
});

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
var init_providerJournal = __esm({
  "lib/publishing/providerJournal.ts"() {
    "use strict";
    init_eligibilityPolicy();
  }
});

// lib/publishing/capabilityProviders.ts
function check2(ok, code) {
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
  check2(deps.environment === "isolated-mock" && deps.io.kind === "local-mock" || deps.environment === "production-canonical" && deps.io.kind === "native-reviewed", "REVIEWED_PROVIDER_COMPOSITION_REQUIRED");
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
      check2(r, "CANONICAL_JOB_MISSING");
      check2(["intentId", "revision", "generation", "platform", "accountBindingId", "accountVersion", "providerAccountId", "connectionId", "contentHash"].every((k) => r[k] === target2[k]), "PROVIDER_TARGET_CONFLICT");
      await deps.validation.validateExecution(tx, r);
      const post = (await tx.query(`SELECT platform,"postType",caption,cta,hashtags,"taggedAccounts","linkUrl","tikTokSettings" FROM "CalendarPost" WHERE id=$1`, [r.postId])).rows[0];
      const assets = (await tx.query(`SELECT id,"fileKey","mediaType","displayOrder",to_jsonb(a)->>'objectVersion' AS "objectVersion",to_jsonb(a)->>'contentSha256' AS "contentSha256" FROM "CalendarPostAsset" a WHERE "postId"=$1 ORDER BY "displayOrder",id`, [r.postId])).rows;
      check2(publishingContentHash(post, assets) === target2.contentHash, "PROVIDER_CONTENT_CHANGED");
      return { post, assets };
    });
  }
  async function prepare(target2) {
    target2 = Object.freeze({ ...target2 });
    const existing = await deps.database.transaction(async (tx) => (await tx.query(`SELECT * FROM "PublishingProviderPreparation" WHERE "jobId"=$1`, [target2.jobId])).rows[0]);
    await deps.database.transaction(async (tx) => {
      const bound = (await tx.query(`SELECT v."connectionId",v."providerAccountId" FROM "PublishingAccountVersion" v JOIN "PublishingAccountBinding" b ON b.id=v."bindingId" JOIN "SocialConnection" s ON s.id=v."connectionId" WHERE b.id=$1 AND b."currentVersion"=$2 AND v.version=$2 AND b.state='CONNECTED' AND s.status='CONNECTED' AND s.platform=$3 AND s."platformAccountId"=v."providerAccountId"`, [target2.accountBindingId, target2.accountVersion, target2.platform])).rows[0];
      check2(bound && bound.connectionId === target2.connectionId && bound.providerAccountId === target2.providerAccountId, "REFRESH_DESTINATION_CHANGED");
    });
    await io.refresh(target2);
    const { post, assets } = await snapshot(target2);
    if (existing) {
      check2(existing.targetHash === policyHash(target2), "PREPARATION_TARGET_CONFLICT");
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
        check2(okay(r) && ref(r.body.id), "IG_CONTAINER_NOT_READY");
        refs.push(ref(r.body.id));
        if (assets[i].mediaType === "VIDEO") {
          const status = await io.prepare(target2, "IG_CONTAINER_STATUS", { reference: refs.at(-1) });
          check2(okay(status) && status.body.status_code === "FINISHED", "IG_CONTAINER_NOT_READY");
        }
      }
      if (refs.length > 1) {
        const r = await io.prepare(target2, "IG_CAROUSEL", { children: refs, caption: buildCaption({ ...post, linkUrl: null }) });
        check2(okay(r) && ref(r.body.id), "IG_CAROUSEL_NOT_READY");
        refs = [ref(r.body.id)];
      }
    } else if (target2.platform === "FACEBOOK") {
      if (video && /reel/i.test(post.postType ?? "")) {
        const r = await io.prepare(target2, "FB_REEL_START", { upload_phase: "start" });
        check2(okay(r) && ref(r.body.video_id), "FB_REEL_NOT_READY");
        refs = [ref(r.body.video_id)];
        const upload = await io.prepare(target2, "FB_REEL_UPLOAD", { video_id: refs[0], media: media[0], ...r.body.upload_url ? { uploadUrl: r.body.upload_url } : {} });
        check2(okay(upload), "FB_REEL_NOT_READY");
      } else if (!video) for (const url of media) {
        const r = await io.prepare(target2, "FB_PHOTO", { url, published: false });
        check2(okay(r) && ref(r.body.id), "FB_PHOTO_NOT_READY");
        refs.push(ref(r.body.id));
      }
    } else if (target2.platform === "LINKEDIN" || target2.platform === "X") for (let i = 0; i < media.length; i++) {
      const r = await io.prepare(target2, target2.platform === "X" ? "X_MEDIA" : "LI_MEDIA", { media: media[i], mediaType: assets[i].mediaType });
      check2(okay(r) && ref(r.body.id), "MEDIA_NOT_READY");
      refs.push(ref(r.body.id));
    }
    const artifact = { media, refs, video, creator: creator ?? null };
    await snapshot(target2);
    await deps.database.transaction(async (tx) => {
      const old = (await tx.query(`SELECT * FROM "PublishingProviderPreparation" WHERE "jobId"=$1`, [target2.jobId])).rows[0];
      if (old) {
        check2(old.targetHash === policyHash(target2), "PREPARATION_TARGET_CONFLICT");
        return;
      }
      await tx.query(`INSERT INTO "PublishingProviderPreparation"("jobId","targetHash","contentHash",artifact) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [target2.jobId, policyHash(target2), target2.contentHash, artifact]);
    });
    return { prepared: true, maySend: false };
  }
  const transport = deps.authorization.transport(async (submission) => {
    const t = submission.target;
    const p = await deps.database.transaction(async (tx) => (await tx.query(`SELECT * FROM "PublishingProviderPreparation" WHERE "jobId"=$1`, [t.jobId])).rows[0]);
    check2(p && p.targetHash === policyHash(t) && p.contentHash === t.contentHash, "PROVIDER_PREPARATION_REQUIRED");
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
    check2(Date.now() < new Date(submission.authorization.expiresAt).getTime(), "CAPABILITY_EXPIRED_BEFORE_PROVIDER");
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
    check2(c && c.state === "CONSUMED", "RECONCILIATION_REQUIRES_CONSUMED_ATTEMPT");
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
var init_capabilityProviders = __esm({
  "lib/publishing/capabilityProviders.ts"() {
    "use strict";
    init_state();
    init_tiktokSettings();
    init_eligibilityPolicy();
    init_providerJournal();
  }
});

// lib/publishing/providerNormalization.ts
function normalizeProviderLookup(operation, reference, response) {
  const body = response.body;
  if (response.status < 200 || response.status >= 300) return response;
  if (operation === "TT_STATUS") return { ...response, body: { ...body, status: body.data?.status ?? body.status } };
  if (operation === "FB_VIDEO_STATUS") return { ...response, body: { ...body, video_status: body.status?.video_status ?? body.video_status, publishing_status: body.status?.publishing_phase?.status ?? body.publishing_status } };
  if (operation === "IG_PERMALINK") return { ...response, body: { ...body, verified: body.id === reference && typeof body.permalink === "string" && /^https:\/\//.test(body.permalink) } };
  if (operation === "LI_POST_GET") return { ...response, body: { ...body, verified: body.id === reference && body.lifecycleState === "PUBLISHED" } };
  if (operation === "X_TWEET_GET") return { ...response, body: { ...body, verified: body.data?.id === reference } };
  return response;
}
var init_providerNormalization = __esm({
  "lib/publishing/providerNormalization.ts"() {
    "use strict";
  }
});

// lib/publishing/providerHttpAdapter.ts
function createBoundedProviderHttpAdapter(deps) {
  const timeout = deps.timeoutMs ?? 1e4;
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 3e4 || !/^v\d+\.\d+$/.test(deps.versions.meta) || !/^\d{6}$/.test(deps.versions.linkedin)) throw Error("INVALID_PROVIDER_HTTP_CONFIGURATION");
  const responseBody = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const endpoint = (t, op, reference) => {
    const account = encodeURIComponent(t.providerAccountId), id3 = encodeURIComponent(reference ?? account), meta = `https://graph.facebook.com/${deps.versions.meta}`;
    const paths = { IG_MEDIA_PUBLISH: `${meta}/${account}/media_publish`, IG_CONTAINER: `${meta}/${account}/media`, IG_CAROUSEL: `${meta}/${account}/media`, IG_CONTAINER_STATUS: `${meta}/${id3}?fields=status_code`, IG_PERMALINK: `${meta}/${id3}?fields=permalink,id`, TT_VIDEO_INIT: "https://open.tiktokapis.com/v2/post/publish/video/init/", TT_PHOTO_INIT: "https://open.tiktokapis.com/v2/post/publish/content/init/", TT_STATUS: "https://open.tiktokapis.com/v2/post/publish/status/fetch/", FB_FEED: `${meta}/${account}/feed`, FB_VIDEO: `https://graph-video.facebook.com/${deps.versions.meta}/${account}/videos`, FB_REEL_FINISH: `${meta}/${account}/video_reels`, FB_REEL_START: `${meta}/${account}/video_reels`, FB_PHOTO: `${meta}/${account}/photos`, FB_VIDEO_STATUS: `${meta}/${id3}?fields=status`, LI_POST: "https://api.linkedin.com/rest/posts", LI_POST_GET: `https://api.linkedin.com/rest/posts/${id3}`, X_TWEET: "https://api.x.com/2/tweets", X_TWEET_GET: `https://api.x.com/2/tweets/${id3}` };
    const expected = op.startsWith("IG_") ? "INSTAGRAM" : op.startsWith("TT_") ? "TIKTOK" : op.startsWith("FB_") ? "FACEBOOK" : op.startsWith("LI_") ? "LINKEDIN" : "X";
    if (t.platform !== expected || !paths[op]) throw Error("PROVIDER_OPERATION_MISMATCH");
    return paths[op];
  };
  async function request(t, op, payload, reference, auth) {
    const url = endpoint(t, op, reference), read = op.endsWith("STATUS") && !op.startsWith("TT_") || op.endsWith("GET") || op === "IG_PERMALINK";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const aborted = new Promise((_r, reject) => controller.signal.addEventListener("abort", () => reject(Error("PROVIDER_REQUEST_UNCERTAIN")), { once: true }));
    void aborted.catch(() => {
    });
    try {
      const lookup = ["IG_PERMALINK", "TT_STATUS", "FB_VIDEO_STATUS", "LI_POST_GET", "X_TWEET_GET"].includes(op);
      const credential = await Promise.race([(lookup ? deps.reconciliationCredential ?? deps.credential : deps.credential)(t), aborted]);
      if (!credential.token || credential.connectionId !== t.connectionId || credential.providerAccountId !== t.providerAccountId || credential.accountBindingId !== t.accountBindingId || credential.accountVersion !== t.accountVersion) throw Error("PROVIDER_CREDENTIAL_BINDING_REQUIRED");
      if (controller.signal.aborted || auth && Date.now() >= new Date(auth.expiresAt).getTime()) throw Error("PROVIDER_AUTHORIZATION_EXPIRED");
      const headers = { Authorization: `Bearer ${credential.token}`, "Content-Type": "application/json" };
      if (t.platform === "LINKEDIN") Object.assign(headers, { "LinkedIn-Version": deps.versions.linkedin, "X-Restli-Protocol-Version": "2.0.0" });
      const pending = deps.fetch(url, { method: read ? "GET" : "POST", headers, body: read ? void 0 : JSON.stringify(op === "IG_CONTAINER" ? { ...payload.mediaType === "VIDEO" ? { video_url: payload.media, media_type: payload.carousel ? "VIDEO" : "REELS" } : { image_url: payload.media }, ...payload.carousel ? { is_carousel_item: true } : {}, caption: payload.caption } : op === "IG_CAROUSEL" ? { media_type: "CAROUSEL", children: payload.children, caption: payload.caption } : op === "LI_POST" ? { author: payload.author, commentary: payload.commentary, visibility: "PUBLIC", distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] }, ...payload.media?.length ? { content: payload.media.length > 1 ? { multiImage: { images: payload.media.map((id3) => ({ id: id3 })) } } : { media: { id: payload.media[0] } } } : {}, lifecycleState: "PUBLISHED", isReshareDisabledByAuthor: false } : payload), signal: controller.signal, redirect: "error" });
      async function observe(value2) {
        if (auth && deps.journal) {
          const outcome = classifyProviderSubmission(op, value2, { refs: [String(payload.video_id ?? "")] });
          const e = { authorizationId: auth.id, jobId: t.jobId, platform: t.platform, kind: "RESPONSE", outcome: outcome.outcome, ..."reference" in outcome && outcome.reference ? { reference: outcome.reference } : {}, responseHash: policyHash(value2), operation: "HTTP:" + op };
          await deps.journal.capture(deps.journal.event(e));
        }
      }
      void pending.then(async (response2) => {
        if (controller.signal.aborted) {
          const value2 = { status: response2.status, body: responseBody(await response2.json().catch(() => ({}))), headers: { "x-restli-id": response2.headers.get("x-restli-id") ?? "" } };
          await observe(value2);
        }
      }).catch(() => {
      });
      const response = await Promise.race([pending, new Promise((_r, reject) => controller.signal.addEventListener("abort", () => reject(Error("PROVIDER_REQUEST_UNCERTAIN")), { once: true }))]);
      if (auth && t.platform === "LINKEDIN" && response.ok && response.headers.get("x-restli-id")) await observe({ status: response.status, body: {}, headers: { "x-restli-id": response.headers.get("x-restli-id") } });
      const body = await Promise.race([response.json().catch(() => ({})), new Promise((_r, reject) => controller.signal.addEventListener("abort", () => reject(Error("PROVIDER_RESPONSE_UNCERTAIN")), { once: true }))]).catch(() => ({}));
      const value = { status: response.status, body: responseBody(body), headers: { "x-restli-id": response.headers.get("x-restli-id") ?? "" } };
      await observe(value);
      return value;
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
  return {
    async submit(t, op, payload, auth) {
      t = Object.freeze({ ...t });
      payload = JSON.parse(JSON.stringify(payload));
      if (!["IG_MEDIA_PUBLISH", "TT_VIDEO_INIT", "TT_PHOTO_INIT", "FB_FEED", "FB_VIDEO", "FB_REEL_FINISH", "LI_POST", "X_TWEET"].includes(op)) throw Error("PROTECTED_SUBMISSION_OPERATION_REQUIRED");
      if (!isPublicationInvocationAuthorization(auth) || !matchesProviderExecutionRequest(auth, t, op, payload)) throw Error("OPAQUE_PROVIDER_AUTHORIZATION_REQUIRED");
      if (!deps.journal) throw Error("DURABLE_PROVIDER_JOURNAL_REQUIRED");
      const row = await deps.database.transaction(async (tx) => (await tx.query(`SELECT * FROM "PublishingSendCapability" WHERE id=$1 AND state='CONSUMED' AND "expiresAt">clock_timestamp()`, [auth.id])).rows[0]);
      if (!row || row.jobId !== t.jobId || row.intentId !== t.intentId || row.revision !== t.revision || row.generation !== t.generation || row.platform !== t.platform || row.accountBindingId !== t.accountBindingId || row.connectionId !== t.connectionId || row.accountVersion !== t.accountVersion || row.providerAccountId !== t.providerAccountId || row.contentHash !== t.contentHash || String(row.epoch) !== auth.epoch) throw Error("PROVIDER_DURABLE_AUTHORIZATION_REQUIRED");
      const fresh = await deps.database.transaction(async (tx) => (await tx.query(`INSERT INTO "PublishingProviderInvocation"("authorizationId",operation,"requestHash") VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING "authorizationId"`, [auth.id, op, policyHash({ t, op, payload })])).rows.length === 1);
      if (!fresh) throw Error("PROVIDER_INVOCATION_ALREADY_SPENT");
      return request(t, op, payload, void 0, auth);
    },
    prepare: (t, op, payload) => {
      const allowed = { FB_PHOTO: ["url", "published"], FB_REEL_START: ["upload_phase"], FB_REEL_UPLOAD: ["video_id", "media", "uploadUrl"], LI_MEDIA: ["media", "mediaType"], X_MEDIA: ["media", "mediaType"], IG_CONTAINER: ["media", "mediaType", "carousel", "caption"], IG_CAROUSEL: ["children", "caption"], IG_CONTAINER_STATUS: ["reference"] };
      if (!allowed[op] || Object.keys(payload).some((key) => !allowed[op].includes(key))) throw Error("PROTECTED_PREPARATION_PAYLOAD_REQUIRED");
      if (["LI_MEDIA", "X_MEDIA", "FB_REEL_UPLOAD"].includes(op)) {
        if (!deps.mediaPreparation) throw Error("NATIVE_MEDIA_ADAPTER_REQUIRED");
        return deps.mediaPreparation(t, op, payload);
      }
      if (!["IG_CONTAINER", "IG_CAROUSEL", "IG_CONTAINER_STATUS", "FB_PHOTO", "FB_REEL_START"].includes(op) || op === "FB_PHOTO" && payload.published !== false || op === "FB_REEL_START" && payload.upload_phase !== "start") throw Error("PROTECTED_PREPARATION_OPERATION_REQUIRED");
      return request(t, op, payload, String(payload.reference ?? ""));
    },
    lookup: (t, op, reference) => {
      if (!["IG_PERMALINK", "TT_STATUS", "FB_VIDEO_STATUS", "LI_POST_GET", "X_TWEET_GET"].includes(op) || !reference || reference.length > 500) throw Error("READ_ONLY_PROVIDER_OPERATION_REQUIRED");
      return request(t, op, op === "TT_STATUS" ? { publish_id: reference } : {}, reference).then((response) => normalizeProviderLookup(op, reference, response));
    }
  };
}
var init_providerHttpAdapter = __esm({
  "lib/publishing/providerHttpAdapter.ts"() {
    "use strict";
    init_externalAuthorization();
    init_eligibilityPolicy();
    init_capabilityProviders();
    init_providerNormalization();
  }
});

// lib/publishing/nativeMediaPreparation.ts
function createNativeMediaPreparation(deps) {
  const timeout = deps.timeoutMs ?? 1e4;
  if (!/^v\d+\.\d+$/.test(deps.metaVersion) || !/^\d{6}$/.test(deps.linkedinVersion) || timeout < 1 || timeout > 3e4) throw Error("INVALID_MEDIA_CONFIGURATION");
  async function bounded(run3) {
    const controller = new AbortController();
    let timer;
    const expired = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(Error("MEDIA_OPERATION_TIMEOUT"));
      }, timeout);
    });
    try {
      return await Promise.race([run3(controller.signal), expired]);
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
  return async (target2, operation, payload) => {
    const expected = operation === "X_MEDIA" ? "X" : operation === "LI_MEDIA" ? "LINKEDIN" : operation === "FB_REEL_UPLOAD" ? "FACEBOOK" : null;
    if (!expected || target2.platform !== expected) throw Error("MEDIA_OPERATION_MISMATCH");
    const credential = await bounded(() => deps.credential(target2));
    if (!credential.token || credential.connectionId !== target2.connectionId || credential.providerAccountId !== target2.providerAccountId || credential.accountBindingId !== target2.accountBindingId || credential.accountVersion !== target2.accountVersion) throw Error("MEDIA_CREDENTIAL_BINDING_REQUIRED");
    const headers = { Authorization: `Bearer ${credential.token}` };
    if (expected === "LINKEDIN") Object.assign(headers, { "LinkedIn-Version": deps.linkedinVersion, "X-Restli-Protocol-Version": "2.0.0" });
    async function request(url, method, body, extra = {}) {
      return bounded(async (signal) => {
        const response = await deps.fetch(url, { method, headers: { ...headers, ...extra }, body, signal, redirect: "error" });
        const raw = await response.json().catch(() => ({}));
        const value2 = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
        if (!response.ok) throw Error(`MEDIA_PROVIDER_REJECTED_${response.status}`);
        return { value: value2, etag: response.headers.get("etag") };
      });
    }
    const json = (url, value2) => request(url, "POST", JSON.stringify(value2), { "Content-Type": "application/json" });
    if (operation === "FB_REEL_UPLOAD") {
      const id4 = String(payload.video_id ?? "");
      if (!/^\d+$/.test(id4) || typeof payload.media !== "string" || !/^https:\/\//.test(payload.media)) throw Error("INVALID_REEL_UPLOAD");
      const uploadUrl = new URL(typeof payload.uploadUrl === "string" ? payload.uploadUrl : `https://rupload.facebook.com/video-upload/${deps.metaVersion}/${id4}`);
      if (uploadUrl.protocol !== "https:" || uploadUrl.hostname !== "rupload.facebook.com" || uploadUrl.username || uploadUrl.password || !uploadUrl.pathname.startsWith("/video-upload/")) throw Error("REEL_UPLOAD_HOST_DENIED");
      await request(uploadUrl.toString(), "POST", void 0, { Authorization: `OAuth ${credential.token}`, file_url: payload.media });
      return { status: 200, body: { id: id4 } };
    }
    if (typeof payload.media !== "string") throw Error("PINNED_MEDIA_REQUIRED");
    const media = await bounded(() => deps.readMedia(target2, payload.media));
    if (!media.bytes.byteLength || media.bytes.byteLength > 512 * 1024 * 1024 || !/^(image|video)\/[a-zA-Z0-9.+-]+$/.test(media.type)) throw Error("INVALID_MEDIA_BYTES");
    const video = payload.mediaType === "VIDEO";
    if (operation === "X_MEDIA") {
      const base2 = "https://api.x.com/2/media/upload";
      const initialized2 = await json(`${base2}/initialize`, { media_type: media.type, total_bytes: media.bytes.byteLength, media_category: video ? "tweet_video" : media.type === "image/gif" ? "tweet_gif" : "tweet_image" });
      const id4 = initialized2.value.data?.id;
      if (typeof id4 !== "string" || !/^\d+$/.test(id4)) throw Error("X_MEDIA_ID_REQUIRED");
      for (let start = 0, segment = 0; start < media.bytes.byteLength; start += 4 * 1024 * 1024, segment++) {
        const form = new FormData();
        form.set("segment_index", String(segment));
        form.set("media", new Blob([Buffer.from(media.bytes.subarray(start, start + 4 * 1024 * 1024))], { type: media.type }), "chunk");
        await request(`${base2}/${id4}/append`, "POST", form);
      }
      let result = (await request(`${base2}/${id4}/finalize`, "POST")).value;
      for (let attempt = 0; attempt < 40; attempt++) {
        const info = result.data?.processing_info;
        if (!info || info.state === "succeeded") return { status: 200, body: { id: id4 } };
        if (info.state === "failed") throw Error("X_MEDIA_PROCESSING_FAILED");
        await deps.sleep(Math.min(10, Math.max(1, info.check_after_secs || 2)) * 1e3);
        result = (await request(`${base2}?command=STATUS&media_id=${id4}`, "GET")).value;
      }
      throw Error("X_MEDIA_PROCESSING_TIMEOUT");
    }
    const author = target2.providerAccountId.startsWith("urn:li:") ? target2.providerAccountId : `urn:li:person:${target2.providerAccountId}`;
    const resource = video ? "videos" : "images", base = `https://api.linkedin.com/rest/${resource}`;
    const initialized = await json(`${base}?action=initializeUpload`, { initializeUploadRequest: { owner: author, ...video ? { fileSizeBytes: media.bytes.byteLength, uploadCaptions: false, uploadThumbnail: false } : {} } });
    const value = initialized.value.value, id3 = video ? value?.video : value?.image;
    if (typeof id3 !== "string" || !id3.startsWith(`urn:li:${video ? "video" : "image"}:`)) throw Error("LINKEDIN_MEDIA_ID_REQUIRED");
    const parts = video ? value.uploadInstructions : value.uploadUrl ? [{ uploadUrl: value.uploadUrl }] : [];
    if (!Array.isArray(parts) || !parts.length || parts.length > 1e3) throw Error("LINKEDIN_UPLOAD_PARTS_REQUIRED");
    const partIds = [];
    for (const part of parts) {
      const url = new URL(part.uploadUrl);
      if (url.protocol !== "https:" || !(url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com")) || url.username || url.password) throw Error("LINKEDIN_UPLOAD_HOST_DENIED");
      const first = video ? part.firstByte : 0, last = video ? part.lastByte : media.bytes.byteLength - 1;
      if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first < 0 || last < first || last >= media.bytes.byteLength) throw Error("LINKEDIN_UPLOAD_RANGE_INVALID");
      const uploaded = await request(url.toString(), "PUT", Buffer.from(media.bytes.subarray(first, last + 1)), { "Content-Type": media.type });
      if (video && !uploaded.etag) throw Error("LINKEDIN_UPLOAD_ACK_REQUIRED");
      if (uploaded.etag) partIds.push(uploaded.etag.replace(/"/g, ""));
    }
    if (video) {
      await json(`${base}?action=finalizeUpload`, { finalizeUploadRequest: { video: id3, uploadToken: value.uploadToken ?? "", uploadedPartIds: partIds } });
      for (let attempt = 0; attempt < 40; attempt++) {
        const status = (await request(`${base}/${encodeURIComponent(id3)}`, "GET")).value.status;
        if (status === "AVAILABLE") return { status: 200, body: { id: id3 } };
        if (status === "PROCESSING_FAILED") throw Error("LINKEDIN_MEDIA_PROCESSING_FAILED");
        await deps.sleep(3e3);
      }
      throw Error("LINKEDIN_MEDIA_PROCESSING_TIMEOUT");
    }
    return { status: 200, body: { id: id3 } };
  };
}
var init_nativeMediaPreparation = __esm({
  "lib/publishing/nativeMediaPreparation.ts"() {
    "use strict";
  }
});

// lib/publishing/canonicalWorker.ts
function createInactiveCanonicalWorker(deps) {
  const disabled = deps.environment === "production-disabled" && deps.io.kind === "native-disabled";
  const native = deps.environment === "production-canonical" && deps.io.kind === "native-reviewed";
  if (!disabled && !native && (deps.environment !== "isolated-mock" || deps.io.kind !== "local-mock")) throw Error("INACTIVE_MOCK_WORKER_REQUIRED");
  if (native && (!deps.executionCoordination || !deps.snapshotMedia || !deps.projectStatus)) throw Error("NATIVE_DURABLE_COORDINATION_REQUIRED");
  const concurrency = deps.concurrency ?? 2, timeout = deps.jobTimeoutMs ?? 3e4, grace = deps.shutdownGraceMs ?? 5e3;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 3 || !Number.isInteger(timeout) || timeout < 1 || timeout > 6e4 || !Number.isInteger(grace) || grace < 0 || grace > 1e4) throw Error("INVALID_WORKER_BOUNDS");
  const store = createCanonicalWorkerStore(deps), actor = deps.actor, owner = deps.owner, epoch = deps.epoch;
  const authorization = createExternalPublicationAuthorization(deps);
  const controllers = /* @__PURE__ */ new Set(), active2 = /* @__PURE__ */ new Set(), unsettled = /* @__PURE__ */ new Set(), jobs = /* @__PURE__ */ new Set();
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
    return createCapabilityProviderIntegration({ environment: native ? "production-canonical" : "isolated-mock", database: deps.database, validation: deps.validation, authorization, spool: deps.spool, io: deps.io, signal });
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
      if (native) {
        const current = await deps.database.transaction(async (tx) => (await tx.query(`SELECT enabled,state,epoch FROM "PublishingOwnership" WHERE id=1 FOR SHARE`)).rows[0]);
        if (!current?.enabled || current.state !== owner || BigInt(current.epoch) !== epoch) throw Error("OWNERSHIP_FENCED");
        await deps.io.refresh(target2);
        checkpoint(signal);
      }
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
      const grant = await authorization.authorize({ ...claimed.target, operationId: (0, import_node_crypto11.randomUUID)(), actor, owner, epoch, workerToken: claimed.workerToken });
      checkpoint(signal);
      if (!grant.maySend) return result(job.id, "outcome-unknown", "NO_FRESH_SEND_CAPABILITY");
      return observation(job.id, await providers.publish({ target: claimed.target, capability: grant.capability }));
    } catch (error) {
      const code = error instanceof Error ? "code" in error && typeof error.code === "string" ? error.code : error.message : "WORKER_OPERATION_FAILED";
      if (stage.authorizationStarted) return result(target2.jobId, "outcome-unknown", code);
      if (stopping || signal.aborted) return result(target2.jobId, "deferred", "WORKER_STOPPING");
      if (/OWNERSHIP|EPOCH/.test(code)) return result(target2.jobId, "fenced", code);
      if (/JOB_NOT_ELIGIBLE|NOT_DUE|UNCONFIRMED|TRANSACTION/.test(code)) return result(target2.jobId, "deferred", code);
      await store.parkUnsent(target2, code).catch(() => {
      });
      return result(target2.jobId, "blocked", code);
    } finally {
      if (claim) await deps.executionCoordination?.release(claim).catch(() => {
      });
      await deps.projectStatus?.(target2).catch(() => {
      });
    }
  }
  function run3(target2, recoverOnly = false, budgetMs = timeout) {
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
      active2.delete(bounded);
    });
    active2.add(bounded);
    return bounded;
  }
  async function pollOnce(limit = concurrency, deadline) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 5) throw Error("INVALID_WORKER_POLL_LIMIT");
    if (disabled) return { state: "disabled", results: [] };
    if (stopping) return { state: "stopping", results: [] };
    if (jobs.size >= concurrency) return { state: "busy", results: [] };
    const hints = await store.poll(Math.min(limit, concurrency - jobs.size));
    const remaining = () => deadline === void 0 ? timeout : Math.max(0, deadline - import_node_perf_hooks.performance.now());
    const recovery = remaining() > 0 ? await Promise.all(hints.recovery.map((t) => run3(t, true, remaining()))) : [];
    const fresh = remaining() > 0 ? await Promise.all(hints.ready.map((t) => run3(t, false, remaining()))) : [];
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
        await Promise.allSettled([...active2]);
      } finally {
        clearTimeout(timer);
        for (const c of controllers) c.abort();
      }
      return { quiescent: unsettled.size === 0, pendingOperations: unsettled.size };
    })();
    return closing;
  }
  return {
    run: (t) => run3(t),
    recover: (t) => run3(t, true),
    pollOnce: (limit) => pollOnce(limit),
    drain,
    close,
    status: () => ({ stopping, available: Math.max(0, concurrency - jobs.size), pendingOperations: unsettled.size })
  };
}
var import_node_crypto11, import_node_perf_hooks;
var init_canonicalWorker = __esm({
  "lib/publishing/canonicalWorker.ts"() {
    "use strict";
    import_node_crypto11 = require("node:crypto");
    import_node_perf_hooks = require("node:perf_hooks");
    init_canonicalWorkerStore();
    init_externalAuthorization();
    init_capabilityProviders();
  }
});

// lib/publishing/immutableMedia.ts
function createImmutablePublishingMedia(deps) {
  async function snapshot(target2) {
    const job = await deps.validation.canonicalStore().findJob(target2.jobId);
    const assets = await deps.database.transaction(async (tx) => {
      await deps.validation.validateExecution(tx, job);
      return (await tx.query(`SELECT * FROM "CalendarPostAsset" WHERE "postId"=$1 ORDER BY "displayOrder",id`, [job.postId])).rows;
    });
    for (const asset of assets) {
      if (!asset.objectVersion || !/^[a-f0-9]{64}$/.test(asset.contentSha256 ?? "")) throw Error("VERIFIED_MEDIA_VERSION_REQUIRED");
      const old = await deps.database.transaction(async (tx) => (await tx.query(`SELECT * FROM "PublishingMediaSnapshot" WHERE "jobId"=$1 AND "assetId"=$2`, [job.id, asset.id])).rows[0]);
      if (old) continue;
      const copy = await deps.materialize({ jobId: job.id, assetId: asset.id, sourceKey: asset.fileKey, objectVersion: asset.objectVersion, contentSha256: asset.contentSha256 });
      if (copy.objectVersion !== asset.objectVersion || copy.contentSha256 !== asset.contentSha256 || !copy.blobKey.startsWith(`publishing/${job.id}/`)) throw Error("IMMUTABLE_MEDIA_COPY_CONFLICT");
      await deps.database.transaction(async (tx) => {
        await deps.validation.validateExecution(tx, job);
        await tx.query(`INSERT INTO "PublishingMediaSnapshot"("jobId","assetId","sourceKey","objectVersion","contentSha256","blobKey") VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`, [job.id, asset.id, asset.fileKey, copy.objectVersion, copy.contentSha256, copy.blobKey]);
      });
    }
  }
  async function pinnedAssets(target2, assets) {
    return deps.database.transaction(async (tx) => {
      const pins = (await tx.query(`SELECT * FROM "PublishingMediaSnapshot" WHERE "jobId"=$1`, [target2.jobId])).rows;
      return assets.map((a) => {
        const p = pins.find((p2) => p2.assetId === a.id);
        if (!p || p.sourceKey !== a.fileKey || p.objectVersion !== a.objectVersion || p.contentSha256 !== a.contentSha256) throw Error("IMMUTABLE_MEDIA_PIN_MISSING");
        return { ...a, fileKey: p.blobKey };
      });
    });
  }
  return { snapshot, pinnedAssets };
}
var init_immutableMedia = __esm({
  "lib/publishing/immutableMedia.ts"() {
    "use strict";
  }
});

// lib/publishing/acceleratedComposition.ts
function createAcceleratedPublishingWorker(deps) {
  const coordination = createPublishingCoordination(deps), media = createImmutablePublishingMedia(deps), original = deps.io;
  const io = {
    ...original,
    media: async (target2, assets, creator) => original.media(target2, await media.pinnedAssets(target2, assets), creator),
    reserveRate: async (target2, kind) => {
      await coordination.reserveRate(`${target2.platform}:${target2.providerAccountId}:${kind}`, deps.rates[kind], 6e4);
      if (target2.platform === "TIKTOK") await coordination.reserveSpacing(`${target2.platform}:${target2.providerAccountId}:${kind}`, { creator: 3100, init: 10100, status: 2100 }[kind]);
      await original.reserveRate(target2, kind);
    }
  };
  return createInactiveCanonicalWorker({ ...deps, io, executionCoordination: coordination, snapshotMedia: media.snapshot, projectStatus: createCanonicalStatusProjection(deps) });
}
var init_acceleratedComposition = __esm({
  "lib/publishing/acceleratedComposition.ts"() {
    "use strict";
    init_canonicalWorker();
    init_executionCoordination();
    init_statusProjection();
    init_immutableMedia();
  }
});

// lib/publishing/nativeWorkerComposition.ts
function createNativeCanonicalPublishingWorker(input) {
  if (typeof input.publishingEnabled !== "boolean" || !input.fetch || !input.refresh || !input.creatorInfo || !input.media || !input.materialize || !input.readMedia || !input.sleep) throw Error("NATIVE_WORKER_DEPENDENCIES_REQUIRED");
  const credential = createCanonicalCredentialResolver(input.database), reconciliationCredential = createCanonicalReconciliationCredentialResolver(input.database);
  const authorization = createExternalPublicationAuthorization(input), journal = createProviderJournal({ ...input, authorization });
  const mediaPreparation = createNativeMediaPreparation({ ...input, credential, metaVersion: input.versions.meta, linkedinVersion: input.versions.linkedin });
  const adapter = createBoundedProviderHttpAdapter({ ...input, credential, reconciliationCredential, mediaPreparation, journal });
  const prepare = async (target2, operation, payload) => {
    if (operation === "IG_CONTAINER_STATUS") {
      for (let attempt = 0; attempt < 5; attempt++) {
        const response2 = await adapter.prepare(target2, operation, payload), status = response2.body.status_code;
        if (status === "FINISHED" || status === "ERROR" || status === "EXPIRED" || status === "PUBLISHED" || response2.status >= 400) return response2;
        if (attempt < 4) await input.sleep(1e3);
      }
      return { status: 200, body: { status_code: "IN_PROGRESS" } };
    }
    const cachedOperations = ["IG_CONTAINER", "IG_CAROUSEL", "FB_PHOTO", "FB_REEL_START", "LI_MEDIA", "X_MEDIA"];
    if (!input.preparationCache || !cachedOperations.includes(operation)) return adapter.prepare(target2, operation, payload);
    const requestHash = policyHash({ target: target2, operation, payload }), old = await input.preparationCache.read(target2.jobId, requestHash);
    if (old) return old;
    const response = await adapter.prepare(target2, operation, payload);
    if (response.status >= 200 && response.status < 300 && (!response.body.error || response.body.error.code === "ok") && (response.body.id || response.body.video_id)) {
      const body = { id: response.body.id, video_id: response.body.video_id, upload_url: response.body.upload_url };
      const durable = { status: response.status, body };
      await input.preparationCache.write(target2.jobId, requestHash, durable);
      return durable;
    }
    return response;
  };
  const io = { kind: input.publishingEnabled ? "native-reviewed" : "native-disabled", refresh: input.refresh, creatorInfo: input.creatorInfo, media: input.media, reserveRate: async () => {
  }, ...adapter, prepare };
  return createAcceleratedPublishingWorker({ ...input, io, owner: "VPS", environment: input.publishingEnabled ? "production-canonical" : "production-disabled" });
}
var init_nativeWorkerComposition = __esm({
  "lib/publishing/nativeWorkerComposition.ts"() {
    "use strict";
    init_providerHttpAdapter();
    init_nativeMediaPreparation();
    init_credentialResolver();
    init_externalAuthorization();
    init_providerJournal();
    init_acceleratedComposition();
    init_eligibilityPolicy();
  }
});

// workers/publishing/nativeHost.ts
var nativeHost_exports = {};
__export(nativeHost_exports, {
  createNativePublishingHost: () => createNativePublishingHost
});
async function createNativePublishingHost(configuration, fetch, clients, mode = "publish") {
  if (!configuration.databaseUrl || !(mode === "publish" ? configuration.enabled : configuration.reconciliation)) throw Error("NATIVE_HOST_DISABLED");
  const config = configuration;
  const pool = new import_pg2.Pool({ connectionString: config.databaseUrl, max: config.poolMax, connectionTimeoutMillis: 5e3, application_name: "showwork-canonical-vps" });
  const storageClient = clients?.storageClient ?? new import_client_s32.S3Client({ endpoint: config.endpoint, region: "auto", credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }, forcePathStyle: true, requestChecksumCalculation: "WHEN_REQUIRED" });
  const database = createPublishingTransactionDatabase(pool, { schema: config.schema });
  try {
    await database.transaction(async (tx) => {
      const ownership = (await tx.query('SELECT state,enabled,epoch FROM "PublishingOwnership" WHERE id=1')).rows[0];
      if (!ownership?.enabled || ownership.state !== (mode === "publish" ? "VPS" : "DRAINING") || BigInt(ownership.epoch) !== config.epoch) throw Error("NATIVE_HOST_OWNERSHIP_REJECTED");
    });
    const providerFetch = (url, init) => {
      if (mode === "reconcile") {
        const endpoint = new URL(typeof url === "string" ? url : url instanceof Request ? url.url : String(url)), method = (init?.method ?? "GET").toUpperCase();
        const readonly = method === "GET" || method === "HEAD", auxiliary2 = method === "POST" && (endpoint.hostname === "open.tiktokapis.com" && ["/v2/post/publish/status/fetch/", "/v2/oauth/token/"].includes(endpoint.pathname) || endpoint.hostname === "api.x.com" && endpoint.pathname === "/2/oauth2/token" || endpoint.hostname === "www.linkedin.com" && endpoint.pathname === "/oauth/v2/accessToken");
        if (!readonly && !auxiliary2) throw Error("RECONCILIATION_PUBLICATION_FORBIDDEN");
      }
      return fetch(url, init);
    };
    const storage = createPublishingObjectStorage({ client: storageClient, bucket: config.bucket, prefix: config.prefix });
    const validation = createPublishingValidationAdapters({ database, verifyViewer: async () => {
      throw Error("WORKER_VIEWER_AUTHORITY_FORBIDDEN");
    }, verifyRetryEvidence: async () => {
      throw Error("TRUSTED_RETRY_RECONCILIATION_REQUIRED");
    } });
    const coordination = createPublishingCoordination({ database, validation }), accounts = createShowworkPublishingAccounts({ database, accountFetch: providerFetch }, validation, coordination), credential = createCanonicalCredentialResolver(database);
    const mediaUrl = (key) => config.origin.replace(/\/$/, "") + "/" + key.split("/").map(encodeURIComponent).join("/");
    const worker = createNativeCanonicalPublishingWorker({
      database,
      validation,
      spool: createSharedPublishingJournal(storage.journal),
      actor: "vps-worker",
      epoch: config.epoch,
      publishingEnabled: true,
      fetch: providerFetch,
      versions: config.versions,
      concurrency: config.concurrency,
      jobTimeoutMs: 6e4,
      preparedLeaseMs: clients?.preparedLeaseMs,
      rates: { creator: 10, init: 5, status: 20 },
      materialize: storage.materialize,
      preparationCache: { read: storage.readPreparation, write: storage.writePreparation },
      refresh: async (target2, options) => {
        await accounts.ensureFreshAccount(target2, options);
      },
      creatorInfo: async (target2) => accounts.accountIO(async () => queryTikTokCreatorInfo((await credential(target2)).token)),
      media: async (target2, assets, creator) => {
        const pins = await database.transaction(async (tx) => (await tx.query('SELECT * FROM "PublishingMediaSnapshot" WHERE "jobId"=$1', [target2.jobId])).rows), urls = [];
        for (const asset of assets) {
          const pin = pins.find((p) => p.assetId === asset.id && p.blobKey === asset.fileKey);
          if (!pin) throw Error("IMMUTABLE_MEDIA_PIN_MISSING");
          let key = pin.blobKey;
          if (target2.platform === "TIKTOK") {
            if (!creator) throw Error("CURRENT_TIKTOK_CREATOR_REQUIRED");
            const source = await storage.readPinned(pin.blobKey, pin.contentSha256), prepared = await prepareCanonicalTikTokMedia({ ...source, fileKey: pin.sourceKey, mediaType: String(asset.mediaType), creator });
            if (prepared) key = await storage.storePrepared(target2.jobId, String(asset.id), prepared.bytes, prepared.type);
          }
          urls.push(mediaUrl(key));
        }
        return urls;
      },
      readMedia: async (target2, source) => {
        const pins = await database.transaction(async (tx) => (await tx.query('SELECT * FROM "PublishingMediaSnapshot" WHERE "jobId"=$1', [target2.jobId])).rows);
        const pin = pins.find((p) => mediaUrl(p.blobKey) === source);
        if (!pin) throw Error("IMMUTABLE_MEDIA_URL_REQUIRED");
        return storage.readPinned(pin.blobKey, pin.contentSha256);
      },
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    });
    const uninstall = installDisabledPublishingApplication({ host: "VPS", publishingEnabled: false, invoke: async () => {
      throw Error("WORKER_CANNOT_INVOKE_APPLICATION_HANDLERS");
    } });
    const projection = createCanonicalStatusProjection({ database, validation });
    async function repairProjections() {
      const ids = await database.transaction(async (tx) => {
        const reports = (await tx.query(`SELECT to_regclass('"PublishedSocialPost"') IS NOT NULL AS present`)).rows[0].present;
        return (await tx.query(`SELECT j.id FROM "PublishingJob" j JOIN "PublishingIntent" i ON i.id=j."intentId" JOIN "CalendarPost" p ON p.id=j."postId" JOIN "PublishingCanonicalRevision" r ON r."jobId"=j.id JOIN "PublishingAccountVersion" v ON v."bindingId"=r."accountBindingId" AND v.version=r."accountVersion" WHERE j.phase='CONFIRMED' AND j."intentRevision"=i."currentRevision" AND NOT EXISTS(SELECT 1 FROM "PublishingResourceTombstone" t WHERE (t."resourceType"='POST' AND t."resourceId"=p.id) OR (t."resourceType"='WORKSPACE' AND t."resourceId"=p."calendarId")) AND ((CASE WHEN j.platform='INSTAGRAM' THEN p."instagramPublishStatus"::text WHEN j.platform='TIKTOK' THEN p."tikTokPublishStatus"::text ELSE p."publishStatus"::text END) IS DISTINCT FROM 'PUBLISHED' ${reports ? `OR NOT EXISTS(SELECT 1 FROM "PublishedSocialPost" report WHERE report."calendarPostId"=p.id AND report."socialConnectionId"=v."connectionId")` : ""}) ORDER BY j."updatedAt",j.id LIMIT 3`)).rows.map((r) => r.id);
      });
      for (const id3 of ids) await projection(canonicalPublicationTarget(await validation.canonicalStore().findJob(id3)));
      return ids.length;
    }
    let closing;
    return { worker, repairProjections, close: () => closing ??= (async () => {
      const result = await worker.close();
      if (!result.quiescent) throw Error("WORKER_SHUTDOWN_UNSETTLED");
      uninstall();
      await pool.end();
      storageClient.destroy();
    })() };
  } catch (error) {
    await pool.end();
    storageClient.destroy();
    throw error;
  }
}
var import_pg2, import_client_s32;
var init_nativeHost = __esm({
  "workers/publishing/nativeHost.ts"() {
    "use strict";
    init_statusProjection();
    init_canonicalWorkerStore();
    init_nativeTikTokMedia();
    import_pg2 = require("pg");
    import_client_s32 = require("@aws-sdk/client-s3");
    init_transactionDatabase();
    init_objectStorageAdapters();
    init_sharedJournal();
    init_validationAdapters();
    init_executionCoordination();
    init_showworkPublishingAccounts();
    init_credentialResolver();
    init_tiktok();
    init_nativeWorkerComposition();
    init_applicationBoundary();
  }
});

// lib/publishing/hostConfiguration.ts
function publishingHostConfiguration(env) {
  const flag = (name) => {
    const value = env[name];
    if (value !== void 0 && !["true", "false"].includes(value)) throw Error("INVALID_" + name);
    return value === "true";
  };
  const enabled = flag("SHOWWORK_PUBLISHING_ENABLED"), application = flag("SHOWWORK_CANONICAL_APPLICATION_ENABLED"), reconciliation = flag("PUBLISHING_RECONCILIATION_ENABLED");
  if (!enabled && !application && !reconciliation) return { enabled: false, application: false };
  if (env.SHOWWORK_PUBLISHING_PROTOCOL !== "canonical") throw Error("CANONICAL_HOST_PROTOCOL_REQUIRED");
  const required = (name) => {
    const value = env[name];
    if (!value) throw Error("MISSING_" + name);
    return value;
  };
  const integer = (name, min, max, fallback) => {
    const value = env[name] ?? fallback;
    if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) throw Error("INVALID_" + name);
    return Number(value);
  };
  const schema = env.PUBLISHING_DATABASE_SCHEMA ?? "public";
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schema)) throw Error("INVALID_DATABASE_SCHEMA");
  const databaseUrl = required("PUBLISHING_DATABASE_URL"), url = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw Error("INVALID_DATABASE_URL");
  const endpoint = required("PUBLISHING_STORAGE_ENDPOINT"), origin = required("PUBLISHING_MEDIA_PUBLIC_ORIGIN");
  for (const value of [endpoint, origin]) {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password || u.search || u.hash) throw Error("INVALID_STORAGE_URL");
  }
  const prefix = required("PUBLISHING_STORAGE_JOURNAL_PREFIX");
  if (!/^publishing\/[A-Za-z0-9_-]+\/$/.test(prefix)) throw Error("INVALID_JOURNAL_PREFIX");
  const meta = required("META_API_VERSION"), linkedin = required("LINKEDIN_API_VERSION");
  if (!/^v\d+\.\d+$/.test(meta) || !/^\d{6}$/.test(linkedin)) throw Error("INVALID_PROVIDER_VERSION");
  const epoch = enabled || reconciliation ? required("PUBLISHING_EXPECTED_EPOCH") : "1";
  if (!/^[1-9]\d*$/.test(epoch)) throw Error("INVALID_OWNERSHIP_EPOCH");
  return { enabled, application, reconciliation, databaseUrl, schema, endpoint, origin, prefix, epoch: BigInt(epoch), bucket: required("PUBLISHING_STORAGE_BUCKET"), accessKeyId: required("PUBLISHING_STORAGE_ACCESS_KEY_ID"), secretAccessKey: required("PUBLISHING_STORAGE_SECRET_ACCESS_KEY"), versions: { meta, linkedin }, concurrency: integer("PUBLISHING_WORKER_CONCURRENCY", 1, 3, "2"), poolMax: integer("PUBLISHING_DATABASE_POOL_MAX", 1, 5, "3"), pollMs: integer("PUBLISHING_WORKER_POLL_MS", 1e3, 6e4, "5000") };
}

// workers/publishing/run.ts
async function main() {
  if (Number(process.versions.node.split(".")[0]) !== 22) throw Error("NODE_22_REQUIRED");
  const command = process.argv.slice(2);
  if (command.length !== 1 || !["--run", "--check", "--reconcile"].includes(command[0])) throw Error("NATIVE_WORKER_EXPLICIT_COMMAND_REQUIRED");
  const config = publishingHostConfiguration(process.env);
  if (command[0] === "--check") {
    console.log(JSON.stringify({ state: config.enabled ? "configured" : "disabled", publishingEnabled: config.enabled, databaseConnected: false, maySend: false }));
    return;
  }
  const reconcile = command[0] === "--reconcile";
  if (!(reconcile ? "reconciliation" in config && config.reconciliation : config.enabled)) {
    console.log(JSON.stringify({ state: "disabled", publishingEnabled: false, databaseConnected: false, maySend: false }));
    return;
  }
  const { createNativePublishingHost: createNativePublishingHost2 } = await Promise.resolve().then(() => (init_nativeHost(), nativeHost_exports));
  const host = await createNativePublishingHost2(config, globalThis.fetch, void 0, reconcile ? "reconcile" : "publish"), controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  try {
    while (!controller.signal.aborted) {
      try {
        const cycle = await host.worker.pollOnce();
        const repaired = await host.repairProjections();
        console.log(JSON.stringify({ event: "publishing-cycle", state: cycle.state, count: cycle.results.length, repaired, states: cycle.results.map((r) => r.state) }));
      } catch {
        console.error("PUBLISHING_CYCLE_FAILED");
      }
      if (controller.signal.aborted) break;
      await new Promise((resolve) => {
        const finish = () => {
          clearTimeout(timer);
          controller.signal.removeEventListener("abort", finish);
          resolve();
        };
        const timer = setTimeout(finish, "pollMs" in config ? config.pollMs : 5e3);
        controller.signal.addEventListener("abort", finish, { once: true });
      });
    }
  } finally {
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
    await host.close();
  }
}
void main().catch(() => {
  console.error("NATIVE_WORKER_START_OR_SHUTDOWN_REJECTED");
  process.exitCode = 78;
});
