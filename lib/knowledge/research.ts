import { db } from "@/lib/db";
import { researchBusinessWithSources } from "@/lib/openai";
import { getBusinessKnowledgeContext } from "./context";
import { sourceFingerprint } from "./retrieval";

export async function queueBusinessResearch(calendarId: string, focus: string) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "SocialCalendar" WHERE "id" = ${calendarId} FOR UPDATE`;
    await tx.businessResearchRun.updateMany({ where: { calendarId, status: { in: ["QUEUED", "RUNNING"] }, createdAt: { lt: new Date(Date.now() - 15 * 60000) } }, data: { status: "FAILED", phase: "Research interrupted", error: "The research did not finish. Please retry.", completedAt: new Date() } });
    const recent = await tx.businessResearchRun.findFirst({ where: { calendarId }, orderBy: { createdAt: "desc" } });
    if (recent && ["QUEUED", "RUNNING"].includes(recent.status)) return recent;
    if (recent && Date.now() - recent.createdAt.getTime() < 10 * 60000) throw new Error("Please wait 10 minutes between research runs.");
    const sources = await tx.calendarBusinessDocument.findMany({ where: { calendarId } });
    if (!sources.some(s => s.extractedText?.trim())) throw new Error("Add business documents or a website in Knowledge before researching.");
    return tx.businessResearchRun.create({ data: { calendarId, focus, sourceHash: sourceFingerprint(sources) } });
  });
}

export async function executeBusinessResearch(id: string) {
  const claimed = await db.businessResearchRun.updateMany({ where: { id, status: "QUEUED" }, data: { status: "RUNNING", phase: "Understanding the research focus", startedAt: new Date() } });
  if (!claimed.count) return;
  const run = await db.businessResearchRun.findUniqueOrThrow({ where: { id }, include: { calendar: { select: { clientName: true } } } });
  try {
    const sources = await db.calendarBusinessDocument.findMany({ where: { calendarId: run.calendarId }, select: { websiteUrl: true } });
    const context = await getBusinessKnowledgeContext(run.calendarId, run.focus, "reply");
    const publicWebsites = sources.map(s => s.websiteUrl).filter(Boolean).join(", ");
    const result = await researchBusinessWithSources(run.calendar.clientName, run.focus + (publicWebsites ? `\nBusiness websites: ${publicWebsites}` : ""), async phase => {
      await db.businessResearchRun.updateMany({ where: { id, status: "RUNNING" }, data: { phase } });
    }, context);
    const completed = await db.businessResearchRun.updateMany({ where: { id, status: "RUNNING" }, data: { status: "SUCCEEDED", phase: "Research complete", result, completedAt: new Date() } });
    if (completed.count) await db.socialCalendar.update({ where: { id: run.calendarId }, data: { aiLastResearchedAt: new Date() } });
  } catch {
    // Provider errors may contain source text; keep the user-visible error safe.
    await db.businessResearchRun.updateMany({ where: { id, status: "RUNNING" }, data: { status: "FAILED", phase: "Research could not finish", error: "We could not complete cited research. Try a more specific focus, including your public website and industry.", completedAt: new Date() } });
  }
}
