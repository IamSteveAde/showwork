import { publishingIntegrationInstalled, invokePublishingEntrypoint, assertLegacyPublishingAllowed } from "@/lib/publishing/applicationBoundary";
import { NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

// POST — soft-pauses the account (reversible, nothing deleted) and logs
// them out immediately. Note: this doesn't yet block a future login
// attempt on a deactivated account — that check needs to be added to
// the login route itself (a separate file this route doesn't touch).
export async function POST(/* canonical-host-args */ _request:Request /* end-canonical-host-args */) {
  /* canonical-integration-boundary */ if (publishingIntegrationInstalled()) { return await invokePublishingEntrypoint<never>("app/api/account/deactivate/route.ts#POST@9",Array.from(arguments)); } /* end-canonical-integration-boundary */

  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.creator.update({ where: { id: creator.id }, data: { isDeactivated: true } });

  const res = NextResponse.json({ ok: true });
  res.cookies.delete("spotlite_session");
  return res;
}