import { NextRequest, NextResponse } from "next/server";
import { publishingIntegrationInstalled, invokePublishingEntrypoint } from "@/lib/publishing/applicationBoundary";
import { getCurrentCreator } from "@/lib/auth";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { verifyFacebookPageSelection, facebookPageSelectionCookieOptions } from "@/lib/facebookPageSelection";
import { listManagedPages } from "@/lib/instagram";
import { completeInstagramConnection } from "@/lib/instagramConnection";

const COOKIE = "showwork_instagram_legacy_selection";
async function invoke(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (publishingIntegrationInstalled()) {
    try { return await invokePublishingEntrypoint<NextResponse>(
      'app/api/calendars/[id]/instagram/select-account/route.ts#' + request.method, [request, context]); }
    catch { return NextResponse.json({ error: "Account selection failed. Please reconnect." }, { status: 409 }); }
  }
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!(await hasCalendarPermission(creator.id, id, "channels.manage"))) {
    return NextResponse.json({ error: "You cannot manage this workspace's channels." }, { status: 403 });
  }
  if (request.method === "POST" && request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const session = verifyFacebookPageSelection(request.cookies.get(COOKIE)?.value);
  if (!session || session.calendarId !== id || session.pages.length !== 1 || session.pages[0].id !== creator.id) {
    return NextResponse.json({ error: "Your account selection session expired. Connect Instagram again." }, { status: 409 });
  }
  try {
    const pages = (await listManagedPages(session.pages[0].accessToken)).filter(page => page.instagram_business_account);
    if (request.method === "GET") {
      return NextResponse.json({ accounts: pages.map(page => ({
        accountId: page.instagram_business_account!.id,
        pageId: page.id,
        name: `${page.name} — ${page.instagram_business_account?.username ? "@" + page.instagram_business_account.username : "linked Instagram account"}`,
      })), expectedVersion: 0, insightsGranted: session.grantedPermissions.includes("instagram_manage_insights") },
      { headers: { "Cache-Control": "no-store" } });
    }
    const body = await request.json();
    const page = pages.find(candidate => candidate.instagram_business_account!.id === body.accountId);
    if (!page?.instagram_business_account) {
      return NextResponse.json({ error: "Select an Instagram account linked to a Page you administer." }, { status: 400 });
    }
    await completeInstagramConnection(id, { ...page, instagram_business_account: page.instagram_business_account },
      session.grantedPermissions, new Date(session.userTokenExpiresAt ?? Date.now()));
    const response = NextResponse.json({ connected: true });
    response.cookies.set(COOKIE, "", { ...facebookPageSelectionCookieOptions(0), path: `/api/calendars/${id}/instagram/select-account` });
    return response;
  } catch {
    return NextResponse.json({ error: "Instagram account selection failed. Reconnect and try again." }, { status: 502 });
  }
}
export const GET = invoke;
export const POST = invoke;
