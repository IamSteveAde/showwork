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
    return NextResponse.json(job.result, { status: job.httpStatus || 500, headers: { "Cache-Control": "no-store" } });
  }
  const progressAt = job.status === "RUNNING" ? job.updatedAt : job.createdAt;
  if (Date.now() - progressAt.getTime() > 16 * 60_000) {
    return NextResponse.json({ error: "Generation was interrupted. Check your drafts before trying again." }, { status: 504 });
  }
  return NextResponse.json({ jobId, status: job.status }, { status: 202, headers: { "Cache-Control": "no-store" } });
}
