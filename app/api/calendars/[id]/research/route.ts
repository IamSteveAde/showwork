import { after, NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { hasCalendarPermission, canAccessCalendarById } from "@/lib/calendarPermissions";
import { db } from "@/lib/db";
import { executeBusinessResearch, queueBusinessResearch } from "@/lib/knowledge/research";
import { sourceFingerprint } from "@/lib/knowledge/retrieval";

export const runtime = "nodejs";
export const maxDuration = 180;
type Context = { params: Promise<{ id: string }> };
async function authorized(id: string, manage = false) {
  const creator = await getCurrentCreator();
  return !!creator && await hasCalendarPermission(creator.id, id, manage ? "knowledge.manage" : "knowledge.view");
}
export async function GET(_req: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!await authorized(id)) return NextResponse.json({ error: "Access denied." }, { status: 403 });
  await db.businessResearchRun.updateMany({ where: { calendarId: id, status: { in: ["QUEUED", "RUNNING"] }, createdAt: { lt: new Date(Date.now() - 15 * 60000) } }, data: { status: "FAILED", phase: "Research interrupted", error: "Research did not finish. Please start a new run.", completedAt: new Date() } });
  const [runs, sources] = await Promise.all([
    db.businessResearchRun.findMany({ where: { calendarId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.calendarBusinessDocument.findMany({ where: { calendarId: id }, select: { id: true, originalName: true, extractedText: true, websiteUrl: true } }),
  ]);
  return NextResponse.json({ runs, sourceHash: sourceFingerprint(sources), sourceCount: sources.filter(s => s.extractedText?.trim()).length }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!await authorized(id, true) || !await canAccessCalendarById(id)) return NextResponse.json({ error: "An active workspace and knowledge management permission are required." }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (typeof body?.focus !== "string" || body.focus.trim().length < 10 || body.focus.length > 1200) return NextResponse.json({ error: "Describe a research focus between 10 and 1,200 characters." }, { status: 400 });
  try {
    const run = await queueBusinessResearch(id, body.focus.trim());
    after(() => executeBusinessResearch(run.id));
    return NextResponse.json({ run }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start research.";
    const expected = /Please wait|Add business/.test(message);
    return NextResponse.json({ error: expected ? message : "Unable to start research. Please retry." }, { status: expected ? 409 : 500 });
  }
}
export async function PATCH(req: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!await authorized(id, true)) return NextResponse.json({ error: "Access denied." }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (typeof body?.runId !== "string" || typeof body?.findingId !== "string" || typeof body?.excluded !== "boolean") return NextResponse.json({ error: "Invalid finding update." }, { status: 400 });
  const updated = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "BusinessResearchRun" WHERE "id" = ${body.runId} AND "calendarId" = ${id} FOR UPDATE`;
    const run = await tx.businessResearchRun.findFirst({ where: { id: body.runId, calendarId: id, status: "SUCCEEDED" } });
    const result = run?.result as { findings?: { id: string }[] } | null;
    if (!run || !result?.findings?.some(f => f.id === body.findingId)) return false;
    const excluded = new Set(run.excludedFindingIds);
    if (body.excluded) excluded.add(body.findingId); else excluded.delete(body.findingId);
    await tx.businessResearchRun.update({ where: { id: run.id }, data: { excludedFindingIds: [...excluded] } });
    return true;
  });
  return NextResponse.json(updated ? { ok: true } : { error: "Finding not found." }, { status: updated ? 200 : 404 });
}
