import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { linkedInMessagingAccess } from "@/lib/linkedin/messagingAccess";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessCalendarById } from "@/lib/calendarPermissions";
import { freshConnection } from "@/lib/socialTokens";
import { linkedInPages } from "@/lib/linkedin/pages";
import { getLinkedInMember } from "@/lib/channelOAuth";
import { upsertSocialConnection } from "@/lib/socialReporting";

type Context = { params: Promise<{ id: string }> };
async function account(context: Context) {
  const creator = await getCurrentCreator();
  const { id } = await context.params;
  if (!creator || !(await hasCalendarPermission(creator.id, id, "channels.manage")) || !(await canAccessCalendarById(id))) throw new Error("Only a workspace owner or authorized manager can manage LinkedIn Pages.");
  const stored = await db.socialConnection.findFirst({ where: { calendarId: id, platform: "LINKEDIN", status: "CONNECTED" } });
  if (!stored) throw new Error("Connect LinkedIn before choosing a Page.");
  return freshConnection(stored);
}
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(req: NextRequest, context: Context) {
  try {
    const connection = await account(context);
    if (req.nextUrl.searchParams.get("capabilities") === "true") {
      const scopes = new Set((connection.tokenScopes || "").split(/[\s,]+/));
      const page = connection.platformAccountId.startsWith("urn:li:organization:");
      return json({ accountType: page ? "Company Page" : "Personal profile",
        publishing: scopes.has(page ? "w_organization_social" : "w_member_social"),
        analytics: scopes.has(page ? "rw_organization_admin" : "r_member_postAnalytics"),
        messaging: linkedInMessagingAccess(connection).available, messagingNote: linkedInMessagingAccess(connection).reason });
    }
    return json({ pages: await linkedInPages(connection) });
  }
  catch (error) { return json({ error: error instanceof Error ? error.message : "Could not load LinkedIn Pages." }, 400); }
}
export async function POST(req: NextRequest, context: Context) {
  if (req.headers.get("origin") !== req.nextUrl.origin) return json({ error: "Invalid request origin." }, 403);
  try {
    const connection = await account(context);
    const { pageId } = await req.json();
    const member = pageId === "personal" ? await getLinkedInMember(connection.accessToken!) : null;
    const page = member ? { id: member.sub, name: member.name || "LinkedIn member" } : (await linkedInPages(connection)).find(item => item.id === pageId);
    if (!page) return json({ error: "Select a Page you currently administer." }, 403);
    await upsertSocialConnection({ calendarId: connection.calendarId, platform: "LINKEDIN", platformAccountId: page.id, accountName: page.name, username: null,
      accessToken: connection.accessToken, refreshToken: connection.refreshToken, accessTokenExpiresAt: connection.accessTokenExpiresAt, refreshTokenExpiresAt: connection.refreshTokenExpiresAt, tokenScopes: connection.tokenScopes });
    await db.socialCalendar.update({ where: { id: connection.calendarId }, data: { linkedinName: page.name, linkedinConnectedAt: new Date() } });
    return json({ accountName: page.name });
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Could not connect this Page." }, 400); }
}
