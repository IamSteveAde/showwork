import { NextRequest, NextResponse } from "next/server";
import {
  publishingIntegrationInstalled,
  invokePublishingEntrypoint,
} from "@/lib/publishing/applicationBoundary";
import { getCurrentCreator } from "@/lib/auth";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import {
  verifyFacebookPageSelection,
  facebookPageSelectionCookieOptions,
} from "@/lib/facebookPageSelection";
import { listManagedPages } from "@/lib/instagram";
import { completeInstagramConnection } from "@/lib/instagramConnection";

const COOKIE = "showwork_instagram_legacy_selection";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function invoke(
  request: NextRequest,
  context: RouteContext
) {
  // Preserve canonical publishing integration when installed.
  if (publishingIntegrationInstalled()) {
    try {
      return await invokePublishingEntrypoint<NextResponse>(
        `app/api/calendars/[id]/instagram/select-account/route.ts#${request.method}`,
        [request, context]
      );
    } catch {
      return NextResponse.json(
        { error: "Account selection failed. Please reconnect." },
        { status: 409 }
      );
    }
  }

  const creator = await getCurrentCreator();

  if (!creator) {
    return NextResponse.json(
      { error: "Sign in to continue." },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  const allowed = await hasCalendarPermission(
    creator.id,
    id,
    "channels.manage"
  );

  if (!allowed) {
    return NextResponse.json(
      {
        error: "You cannot manage this workspace's channels.",
      },
      { status: 403 }
    );
  }

  if (
    request.method === "POST" &&
    request.headers.get("origin") !== request.nextUrl.origin
  ) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 }
    );
  }

  const session = verifyFacebookPageSelection(
    request.cookies.get(COOKIE)?.value
  );

  if (
    !session ||
    session.calendarId !== id ||
    session.pages.length !== 1 ||
    session.pages[0].id !== creator.id
  ) {
    return NextResponse.json(
      {
        error:
          "Your account selection session expired. Connect Instagram again.",
      },
      { status: 409 }
    );
  }

  try {
    // Step 1: Retrieve ALL authorized Facebook Pages.
    const allPages = await listManagedPages(
      session.pages[0].accessToken
    );

    // Step 2: Identify Pages with linked Instagram accounts.
    const eligiblePages = allPages.filter(
      (page) => Boolean(page.instagram_business_account?.id)
    );

    // Step 3: Diagnose account discovery.
    const discoveryStatus =
      allPages.length === 0
        ? "NO_FACEBOOK_PAGES"
        : eligiblePages.length === 0
        ? "NO_INSTAGRAM_RELATIONSHIP"
        : "ACCOUNTS_FOUND";

    const diagnostics = {
      facebookPagesFound: allPages.length,
      instagramAccountsFound: eligiblePages.length,
      discoveryStatus,
    };

    if (request.method === "GET") {
      return NextResponse.json(
        {
          accounts: eligiblePages.map((page) => ({
            accountId: page.instagram_business_account!.id,
            pageId: page.id,
            name: `${
              page.name
            } — ${
              page.instagram_business_account?.username
                ? "@" + page.instagram_business_account.username
                : "linked Instagram account"
            }`,
          })),

          expectedVersion: 0,

          insightsGranted:
            session.grantedPermissions.includes(
              "instagram_manage_insights"
            ),

          diagnostics,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // Preserve existing account-selection behavior.
    const body = await request.json();

    const page = eligiblePages.find(
      (candidate) =>
        candidate.instagram_business_account!.id ===
        body.accountId
    );

    if (!page?.instagram_business_account) {
      return NextResponse.json(
        {
          error:
            "Select an Instagram account linked to a Page you administer.",
        },
        { status: 400 }
      );
    }

    await completeInstagramConnection(
      id,
      {
        ...page,
        instagram_business_account:
          page.instagram_business_account,
      },
      session.grantedPermissions,
      new Date(
        session.userTokenExpiresAt ?? Date.now()
      )
    );

    const response = NextResponse.json({
      connected: true,
    });

    response.cookies.set(
      COOKIE,
      "",
      {
        ...facebookPageSelectionCookieOptions(0),
        path: `/api/calendars/${id}/instagram/select-account`,
      }
    );

    return response;
  } catch (error) {
    // Avoid exposing Meta tokens or raw API error messages.
    console.error(
      "[Instagram Account Selection]",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      {
        error:
          "Instagram account discovery failed. Please reconnect and try again.",
        code: "INSTAGRAM_DISCOVERY_FAILED",
      },
      { status: 502 }
    );
  }
}

export const GET = invoke;
export const POST = invoke;