import { db } from "./db";
import { Prisma } from "@prisma/client";

export type AiGenerationJobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface AiGenerationJobRecord {
  id: string;
  calendarId: string;
  creatorId: string;
  status: AiGenerationJobStatus;
  payload: any;
  request?: any;
  result: any;
  error: string | null;
  httpStatus?: number | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export function normalizeAiJobRecord(raw: any): AiGenerationJobRecord {
  if (!raw) return raw;
  const payload = raw.payload ?? raw.request ?? {};
  const request = raw.request ?? raw.payload ?? {};
  return {
    ...raw,
    payload,
    request,
  };
}

export async function ensureAiGenerationJobTable(): Promise<void> {
  // Managed directly via Prisma model AiGenerationJob
}

export async function createAiGenerationJob(params: {
  id?: string;
  calendarId: string;
  creatorId: string;
  payload?: Record<string, unknown>;
  request?: Record<string, unknown>;
}): Promise<AiGenerationJobRecord> {
  const id = params.id || (await import("crypto")).randomUUID();
  const input = params.payload ?? params.request ?? {};

  const job = await db.aiGenerationJob.create({
    data: {
      id,
      calendarId: params.calendarId,
      creatorId: params.creatorId,
      status: "PENDING",
      payload: input as Prisma.InputJsonValue,
      request: input as Prisma.InputJsonValue,
    },
  });

  return normalizeAiJobRecord(job);
}

export async function getAiGenerationJob(id: string): Promise<AiGenerationJobRecord | null> {
  const job = await db.aiGenerationJob.findUnique({
    where: { id },
  });
  return job ? normalizeAiJobRecord(job) : null;
}

export async function updateAiGenerationJob(
  id: string,
  update: {
    status?: AiGenerationJobStatus;
    result?: Record<string, unknown> | null;
    error?: string | null;
    httpStatus?: number | null;
    startedAt?: Date;
    completedAt?: Date;
  }
): Promise<void> {
  const data: Prisma.AiGenerationJobUpdateInput = {};

  if (update.status) data.status = update.status;
  if (update.result !== undefined) {
    data.result = (update.result as Prisma.InputJsonValue) ?? Prisma.JsonNull;
  }
  if (update.error !== undefined) data.error = update.error;
  if (update.httpStatus !== undefined) data.httpStatus = update.httpStatus;
  if (update.startedAt !== undefined) data.startedAt = update.startedAt;
  if (update.completedAt !== undefined) data.completedAt = update.completedAt;

  if (Object.keys(data).length === 0) return;

  await db.aiGenerationJob.update({
    where: { id },
    data,
  });
}

export async function claimNextPendingAiGenerationJob(): Promise<AiGenerationJobRecord | null> {
  return await db.$transaction(async (tx) => {
    const nextJob = await tx.aiGenerationJob.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });
    if (!nextJob) return null;

    const claimed = await tx.aiGenerationJob.update({
      where: { id: nextJob.id },
      data: {
        status: "PROCESSING",
        startedAt: new Date(),
      },
    });

    return normalizeAiJobRecord(claimed);
  });
}
