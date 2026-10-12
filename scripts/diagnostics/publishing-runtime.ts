/** Standalone, authenticated, expiring diagnostic. The production path requires
 * a dedicated read-only role and executes only fixed SELECT plans, never DML. */
import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Handler } from "@netlify/functions";
import { runPublishingBatchScheduler, type PublishingBatchDatabase } from "../../lib/publishing/batchScheduler";
import { PUBLISHING_PLATFORMS } from "../../lib/publishing/state";

const initializedAt = Date.now();
const instanceId = randomUUID();
let invocations = 0;
let database: PrismaClient | undefined;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const handler: Handler = async event => {
  const startedAt = Date.now();
  if (event.httpMethod && event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  const expected = Buffer.from(`Bearer ${process.env.DIAGNOSTIC_TOKEN || ""}`);
  const supplied = Buffer.from(event.headers.authorization || "");
  if (!process.env.DIAGNOSTIC_TOKEN || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return { statusCode: 401, body: "Unauthorized" };
  const expiresAt = Date.parse(process.env.DIAGNOSTIC_EXPIRES_AT || "");
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) return { statusCode: 403, body: "Diagnostic expired or disabled" };
  let input: { workload?: number; acknowledgementMs?: number; failDispatch?: boolean; actualAcknowledgement?: boolean; transactionLatencyMs?: number; coldConnectionMs?: number };
  try { input = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, body: "Invalid JSON" }; }
  if (!input || Array.isArray(input) || typeof input !== "object" || Object.keys(input).some(key => !["workload","acknowledgementMs","failDispatch","actualAcknowledgement","transactionLatencyMs","coldConnectionMs"].includes(key))) return { statusCode: 400, body: "Invalid profile" };
  const workload = input.workload ?? 100;
  const acknowledgementMs = input.acknowledgementMs ?? 500;
  const transactionLatencyMs = input.transactionLatencyMs ?? 1923;
  const coldConnectionMs = input.coldConnectionMs ?? 2400;
  if (!Number.isInteger(workload) || workload < 1 || workload > 250 || !Number.isInteger(acknowledgementMs) || acknowledgementMs < 0 || acknowledgementMs > 5000 || !Number.isInteger(transactionLatencyMs) || transactionLatencyMs < 0 || transactionLatencyMs > 2000 || !Number.isInteger(coldConnectionMs) || coldConnectionMs < 0 || coldConnectionMs > 5000) return { statusCode: 400, body: "Invalid profile" };
  const productionReadOnly = !!process.env.DIAGNOSTIC_DATABASE_URL;
  if (productionReadOnly) {
    const role = process.env.DIAGNOSTIC_ROLE_NAME || "";
    let connection: URL, configuredUser: string;
    try { connection = new URL(process.env.DIAGNOSTIC_DATABASE_URL!); configuredUser = decodeURIComponent(connection.username).split(".")[0]; } catch { return { statusCode: 403, body: "Invalid read-only configuration" }; }
    if (!/^sw_diag_ro_\d{8}_[a-f0-9]{8}$/.test(role) || configuredUser !== role || input.actualAcknowledgement) return { statusCode: 403, body: "Restricted read-only configuration required" };
    if (!["postgres:","postgresql:"].includes(connection.protocol) || !process.env.DIAGNOSTIC_DB_HOST || connection.hostname !== process.env.DIAGNOSTIC_DB_HOST || connection.searchParams.get("connection_limit") !== "3") return { statusCode: 403, body: "Restricted database destination required" };
    if (connection.searchParams.get("sslmode") !== "require" || connection.searchParams.get("sslaccept") !== "strict" || !connection.searchParams.get("sslcert")) return { statusCode: 403, body: "Verified TLS required" };
  }
  const cold = invocations++ === 0;
  const connectionStarted = Date.now();
  try {
    if (productionReadOnly) {
      database ??= new PrismaClient({ datasources: { db: { url: process.env.DIAGNOSTIC_DATABASE_URL! } }, log: [] });
      await database.$connect();
      const identity = await database.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        return tx.$queryRaw<{ role: string; readOnly: string; privileged: boolean; canWrite: boolean; canReadContent: boolean }[]>`SELECT current_user AS role,current_setting('default_transaction_read_only') AS "readOnly",(r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls) AS privileged,has_table_privilege(current_user,'public."CalendarPost"','INSERT,UPDATE,DELETE,TRUNCATE') AS "canWrite",has_column_privilege(current_user,'public."CalendarPost"','caption','SELECT') AS "canReadContent" FROM pg_roles r WHERE r.rolname=current_user`;
      }, { maxWait: 1500, timeout: 2500 });
      if (identity.length !== 1 || identity[0].role !== process.env.DIAGNOSTIC_ROLE_NAME || identity[0].readOnly !== "on" || identity[0].privileged || identity[0].canWrite || identity[0].canReadContent) throw new Error("Diagnostic role permission mismatch");
    }
    else if (cold) await wait(coldConnectionMs);
    const connectMs = Date.now() - connectionStarted;
    const rows = Array.from({ length: workload }, (_, index) => ({ id: `diagnostic-${instanceId}-${index}`, platform: PUBLISHING_PLATFORMS[index % 5], state: "SCHEDULED", lease: new Date(0) }));
    const transactionTimes: number[] = [];
    const acknowledgementTimes: number[] = [];
    let active = 0, peak = 0;
    const readOnlyAdapter = {
      $transaction: async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options: { maxWait: number; timeout: number }) => {
        const start = Date.now(); active++; peak = Math.max(peak, active);
        try {
          const body = async (tx: Prisma.TransactionClient) => {
            // Database-enforced protection in addition to the SELECT-only path.
            await tx.$executeRaw`SET TRANSACTION READ ONLY`;
            const proxy = {
              $executeRaw: async (query: TemplateStringsArray | Prisma.Sql) => {
                if (Array.isArray(query)) {
                  if (query.join("") !== "SET LOCAL statement_timeout = '2000ms'") throw new Error("Unexpected diagnostic setup");
                  return tx.$executeRaw`SET LOCAL statement_timeout = '2000ms'`;
                }
                const sql = query as Prisma.Sql;
                if (!sql.text.trimStart().startsWith('UPDATE "CalendarPost"')) throw new Error("Unexpected diagnostic cleanup");
                await tx.$queryRaw`SELECT 1 AS ok`;
                return 0;
              },
              $queryRaw: async (sql: Prisma.Sql) => {
                if (!sql.text.trimStart().startsWith("WITH stale_candidates")) throw new Error("Unexpected diagnostic claim");
                const platform = sql.values.find(value => typeof value === "string" && PUBLISHING_PLATFORMS.includes(value as typeof PUBLISHING_PLATFORMS[number]));
                if (typeof platform !== "string") throw new Error("Unknown diagnostic platform");
                const status = Prisma.raw(platform === "INSTAGRAM" ? '"instagramPublishStatus"' : platform === "TIKTOK" ? '"tikTokPublishStatus"' : '"publishStatus"');
                const accepted = platform === "TIKTOK" ? Prisma.sql`OR (p.${status}='PUBLISHING' AND p."tikTokPublishId" IS NOT NULL AND (p."publishWorkerStartedAt" IS NULL OR p."updatedAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - interval '16 minutes'))` : Prisma.empty;
                // No claim DML is forwarded. The query and table identifiers are
                // fixed in code; request input cannot provide SQL or destinations.
                await tx.$queryRaw(Prisma.sql`EXPLAIN (ANALYZE, FORMAT JSON) SELECT p."id",p."platform",p."updatedAt" FROM public."CalendarPost" p WHERE p."platform"=${platform}::public."SocialPlatform" AND (p.${status}='SCHEDULED' ${accepted}) AND p."approvalStatus"='APPROVED' AND NOT p."isAiDraft" AND p."postDate"<=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC') ORDER BY p."postDate",p."id" LIMIT 20`);
                const candidates = rows.filter(row => row.platform === platform && row.state === "SCHEDULED").slice(0, 20);
                for (const row of candidates) { row.state = "PUBLISHING"; row.lease = new Date(); }
                return candidates.length ? candidates.map(row => ({ id: row.id, platform: row.platform, dispatchedAt: row.lease, previousStatus: "SCHEDULED", stale: BigInt(0) })) : [{ id: null, platform: null, dispatchedAt: null, previousStatus: null, stale: BigInt(0) }];
              },
            };
            return callback(proxy as unknown as Prisma.TransactionClient);
          };
          if (productionReadOnly) return await database!.$transaction(body, options);
          // Credential-free alternative: actual Netlify execution with synthetic
          // transaction delays. No database connection or database SQL is issued.
          await wait(transactionLatencyMs * .30);
          const syntheticTransaction = {
            $executeRaw: async (query: TemplateStringsArray) => {
              if (query.join("") !== "SET TRANSACTION READ ONLY") await wait(transactionLatencyMs * .28);
              return 0;
            },
            $queryRaw: async () => { await wait(transactionLatencyMs * .28); return [{}]; },
          };
          const value = await body(syntheticTransaction as unknown as Prisma.TransactionClient);
          await wait(transactionLatencyMs * .14);
          return value;
        } finally { active--; transactionTimes.push(Date.now() - start); }
      },
    };
    const result = await runPublishingBatchScheduler({
      startedAt,
      database: readOnlyAdapter as unknown as PublishingBatchDatabase,
      dispatch: async claim => {
        const acknowledgedAt = Date.now();
        if (input.actualAcknowledgement) {
          if (!process.env.URL) throw new Error("Diagnostic site URL is missing");
          // The dedicated diagnostic site's no-op worker has no database or
          // publishing code. Never call Showwork's real publishing worker.
          const response = await fetch(`${process.env.URL}/.netlify/functions/publishing-ack-background`, {
            method: "POST", headers: { Authorization: `Bearer ${process.env.DIAGNOSTIC_TOKEN}` },
            body: "diagnostic-only", signal: AbortSignal.timeout(5000),
          });
          if (!response.ok) throw new Error("Diagnostic acknowledgement failed");
        } else await wait(acknowledgementMs);
        acknowledgementTimes.push(Date.now() - acknowledgedAt);
        if (input.failDispatch) throw new Error("Synthetic dispatch failure");
        const row = rows.find(item => item.id === claim.id);
        if (!row || row.state !== "PUBLISHING" || row.lease.getTime() !== claim.dispatchedAt.getTime()) throw new Error("Invalid synthetic lease");
        row.state = "PUBLISHED";
      },
    });
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({
      mode: productionReadOnly ? "dedicated-read-only-role-fixed-select-plans-and-synthetic-dispatch" : "credential-free-synthetic-transactions-and-no-op-acknowledgements", instanceId, cold, invocation: invocations,
      region: process.env.AWS_REGION, moduleAgeMs: startedAt - initializedAt, connectMs,
      workload, acknowledgementMs, transactionLatencyMs: productionReadOnly ? undefined : transactionLatencyMs, coldConnectionMs: productionReadOnly ? undefined : coldConnectionMs, failDispatch: !!input.failDispatch, actualAcknowledgement: !!input.actualAcknowledgement,
      peakDatabaseOperations: peak, transactionTimes, acknowledgementTimes, result,
      syntheticPublished: rows.filter(row => row.state === "PUBLISHED").length,
      durationMs: Date.now() - startedAt, noProductionWrites: true, noPublishingRequests: true,
    }) };
  } catch (error) {
    return { statusCode: 503, body: JSON.stringify({ cold, instanceId, region: process.env.AWS_REGION, durationMs: Date.now() - startedAt, code: (error as { code?: string }).code || "DIAGNOSTIC_FAILURE", noProductionWrites: true, noPublishingRequests: true }) };
  }
};
