import { NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { db } from "@/lib/db";
import { brandPersonalityDocumentId, parseBrandPersonality, readBrandPersonality, serializeBrandPersonality } from "@/lib/knowledge/brandPersonality";
const headers = { "Cache-Control": "no-store, private" };
type Context = {
    params: Promise<{
        id: string;
    }>;
};
export async function GET(_req: Request, { params }: Context) {
    const creator = await getCurrentCreator();
    if (!creator)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
    const { id } = await params;
    if (!await hasCalendarPermission(creator.id, id, "knowledge.view"))
        return NextResponse.json({ error: "Not found" }, { status: 404, headers });
    try {
        const source = await db.calendarBusinessDocument.findFirst({ where: { id: brandPersonalityDocumentId(id), calendarId: id }, select: { extractedText: true } });
        return NextResponse.json({ profile: readBrandPersonality(source?.extractedText), canManage: await hasCalendarPermission(creator.id, id, "knowledge.manage") }, { headers });
    }
    catch {
        return NextResponse.json({ error: "Could not load brand personality. Please retry." }, { status: 503, headers });
    }
}
export async function PUT(req: Request, { params }: Context) {
    const creator = await getCurrentCreator();
    if (!creator)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
    const { id } = await params;
    if (!await hasCalendarPermission(creator.id, id, "knowledge.manage"))
        return NextResponse.json({ error: "You cannot manage this workspace's business knowledge." }, { status: 403, headers });
    let profile;
    try {
        profile = parseBrandPersonality(await req.json());
    }
    catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Check your answers." }, { status: 400, headers });
    }
    try {
        const documentId = brandPersonalityDocumentId(id);
        await db.calendarBusinessDocument.upsert({ where: { id_calendarId: { id: documentId, calendarId: id } }, update: { extractedText: serializeBrandPersonality(profile) }, create: { id: documentId, calendarId: id, originalName: "Brand personality", extractedText: serializeBrandPersonality(profile) } });
        return NextResponse.json({ profile, saved: true }, { headers });
    }
    catch {
        return NextResponse.json({ error: "Could not confirm the save. Reload the saved profile before retrying." }, { status: 503, headers });
    }
}
