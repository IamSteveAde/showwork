import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { generateCalendarDrafts } from "@/lib/calendarAiGeneration";
import { enqueueAiGeneration } from "@/lib/aiGenerationJobs";
import { publishingIntegrationInstalled, invokePublishingEntrypoint } from "@/lib/publishing/applicationBoundary";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  /* canonical-integration-boundary */ if (publishingIntegrationInstalled()) { return await invokePublishingEntrypoint<never>("app/api/calendars/[id]/ai-generate/route.ts#POST@21",Array.from(arguments)); } /* end-canonical-integration-boundary */
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (process.env.NODE_ENV === "production") {
    const { id } = await context.params;
    return enqueueAiGeneration(req, id, creator.id);
  }
  return generateCalendarDrafts(req, context, creator);
}
