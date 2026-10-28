import { removeWorkspaceContent, WorkspaceDeletionConflict } from "@/lib/workspaceDeletion";
import { publishingIntegrationInstalled, invokePublishingEntrypoint, assertLegacyPublishingAllowed } from "@/lib/publishing/applicationBoundary";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { hasCalendarPermission } from "@/lib/calendarPermissions";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string; assetId: string }> }
) {
  /* canonical-integration-boundary */ if (publishingIntegrationInstalled()) { return await invokePublishingEntrypoint<never>("app/api/calendars/[id]/posts/[postId]/assets/[assetId]/route.ts#DELETE@7",Array.from(arguments)); } /* end-canonical-integration-boundary */

  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, postId, assetId } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "calendar.edit"))) {
    return NextResponse.json({ error: "You don't have permission to modify content on this calendar" }, { status: 403 });
  }

  try {
    return NextResponse.json(await removeWorkspaceContent({ actorId: creator.id, mode: "asset", calendarId: id, postId, assetId }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof WorkspaceDeletionConflict ? error.message : "Unable to remove this file. Nothing was changed; please retry." }, { status: error instanceof WorkspaceDeletionConflict ? 409 : 500 });
  }
}
