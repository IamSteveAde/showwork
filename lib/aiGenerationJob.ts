/** Compatibility facade for older AI worker callers. The Prisma job schema is
 * authoritative: request/result/httpStatus and RUNNING, never a second table. */
import { db } from './db';
import type { AiGenerationJob } from '@prisma/client';
export type AiGenerationJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export interface AiGenerationJobRecord {
  id: string; calendarId: string; creatorId: string; status: AiGenerationJobStatus;
  payload: any; result: any; error: string | null; createdAt: Date;
  startedAt: Date | null; completedAt: Date | null;
}
function legacy(job: AiGenerationJob): AiGenerationJobRecord {
  const result = job.result;
  return { id: job.id, calendarId: job.calendarId, creatorId: job.creatorId,
    status: (job.status === 'RUNNING' ? 'PROCESSING' : job.status) as AiGenerationJobStatus,
    payload: job.request, result,
    error: result && typeof result === 'object' && !Array.isArray(result) && typeof result.error === 'string' ? result.error : null,
    createdAt: job.createdAt, startedAt: job.status === 'PENDING' ? null : job.updatedAt,
    completedAt: ['COMPLETED', 'FAILED'].includes(job.status) ? job.updatedAt : null };
}
/** Schema creation belongs to migrations, not a running worker. */
export async function ensureAiGenerationJobTable(): Promise<void> {}
export async function createAiGenerationJob(params: { id?: string; calendarId: string; creatorId: string; payload: Record<string, unknown> }): Promise<AiGenerationJobRecord> {
  return legacy(await db.aiGenerationJob.create({ data: {
    ...(params.id ? { id: params.id } : {}), calendarId: params.calendarId, creatorId: params.creatorId,
    request: JSON.parse(JSON.stringify(params.payload)),
  } }));
}
export async function getAiGenerationJob(id: string): Promise<AiGenerationJobRecord | null> {
  const job = await db.aiGenerationJob.findUnique({ where: { id } });
  return job ? legacy(job) : null;
}
export async function updateAiGenerationJob(id: string, update: {
  status?: AiGenerationJobStatus; result?: Record<string, unknown> | null; error?: string | null; startedAt?: Date; completedAt?: Date;
}): Promise<void> {
  const terminal = update.status === 'COMPLETED' || update.status === 'FAILED';
  const result = update.error ? { error: update.error } : update.result;
  const valid = result && typeof result === 'object' && !Array.isArray(result);
  const failed = update.status === 'FAILED' || (terminal && !valid);
  await db.aiGenerationJob.update({ where: { id }, data: {
    ...(update.status ? { status: failed ? 'FAILED' : update.status === 'PROCESSING' ? 'RUNNING' : update.status } : {}),
    ...(terminal ? { httpStatus: failed ? 500 : 200 } : {}),
    ...(valid ? { result: JSON.parse(JSON.stringify(result)) } : terminal ? { result: { error: 'AI generation did not return a result. Check your drafts before retrying.' } } : {}),
  } });
}
export async function claimNextPendingAiGenerationJob(): Promise<AiGenerationJobRecord | null> {
  // Atomic claim interoperates with the current worker and cannot claim twice.
  const jobs = await db.$queryRaw<AiGenerationJob[]>`
    UPDATE "AiGenerationJob" SET status='RUNNING', "updatedAt"=NOW()
    WHERE id=(SELECT id FROM "AiGenerationJob" WHERE status='PENDING'
      AND "createdAt">=NOW()-interval '15 minutes'
      ORDER BY "createdAt",id LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`;
  return jobs[0] ? legacy(jobs[0]) : null;
}
