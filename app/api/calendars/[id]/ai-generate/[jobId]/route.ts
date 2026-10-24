import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; jobId: string }> }) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, jobId } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "ai.generate"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const job = await db.aiGenerationJob.findFirst({ where: { id: jobId, calendarId: id, creatorId: creator.id } });
  if (!job) return NextResponse.json({ error: "Generation not found" }, { status: 404 });
  if (job.status === "COMPLETED" || job.status === "FAILED") {
    const result = job.result;
    const valid = result !== null && typeof result === "object" && !Array.isArray(result);
    if (!valid) return NextResponse.json({
      error: "The AI worker did not return a valid result. Check your drafts before retrying. The server administrator should update and restart the AI generation worker.",
      code: "AI_WORKER_RESULT_MISSING",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
    const status = job.status === "FAILED"
      ? (job.httpStatus && job.httpStatus >= 400 && job.httpStatus <= 599 ? job.httpStatus : 500)
      : (job.httpStatus && job.httpStatus >= 200 && job.httpStatus < 300 ? job.httpStatus : 200);
    return NextResponse.json(result, { status, headers: { "Cache-Control": "no-store" } });
  }
  const progressAt = job.status === "RUNNING" ? job.updatedAt : job.createdAt;
  if (Date.now() - progressAt.getTime() > 16 * 60_000) {
    return NextResponse.json({ error: "Generation was interrupted. Check your drafts before trying again." }, { status: 504 });
  }
  return NextResponse.json({ jobId, status: job.status }, { status: 202, headers: { "Cache-Control": "no-store" } });
}
