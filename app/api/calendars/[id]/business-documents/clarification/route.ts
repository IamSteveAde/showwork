import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { db } from "@/lib/db";
import { parseKnowledgeAnswers } from "@/lib/knowledge/clarification";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const creator = await getCurrentCreator();
  const { id } = await params;
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await hasCalendarPermission(creator.id, id, "knowledge.manage")) return NextResponse.json({ error: "Only people with permission to manage business knowledge can save answers. You can still use them for this request." }, { status: 403 });
  let answers;
  try {
    answers = parseKnowledgeAnswers((await req.json()).answers);
    if (!answers.length) throw Error();
  } catch { return NextResponse.json({ error: "Provide at least one complete answer." }, { status: 400 }); }
  // Stable ID makes repeated saves idempotent. Existing documents are never overwritten.
  const documentId = createHash("sha256").update(JSON.stringify([id, creator.id, answers])).digest("hex");
  const when = new Date().toISOString();
  try {
    await db.calendarBusinessDocument.upsert({ where: { id: documentId }, update: {}, create: {
      id: documentId, calendarId: id, originalName: "Business clarification",
      extractedText: `# User-provided business clarification\nRecorded by workspace user ${creator.id}\nRecorded at ${when}\nThese answers do not automatically supersede conflicting documents.\n\n${answers.map(row => `Question: ${row.question}\nAnswer: ${row.answer}`).join("\n\n")}`,
    } });
    // Existing source fingerprints invalidate stale summaries/research; the indexing trigger queues this source.
    return NextResponse.json({ saved: true, documentId });
  } catch { return NextResponse.json({ error: "Could not save these answers. They can still be used for this request." }, { status: 503 }); }
}
