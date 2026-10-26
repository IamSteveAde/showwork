import { generationPreflight } from "@/lib/knowledge/generationPreflight";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { enqueueAiGeneration } from "@/lib/aiGenerationJobs";
import { publishingIntegrationInstalled, invokePublishingEntrypoint } from "@/lib/publishing/applicationBoundary";

export const maxDuration = 60;

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const prepared = await generationPreflight(req, (await context.params).id);
  if (prepared instanceof NextResponse) return prepared;
  req = prepared;
  /* canonical-integration-boundary */ if (publishingIntegrationInstalled()) { return await invokePublishingEntrypoint<never>("app/api/calendars/[id]/ai-generate/route.ts#POST@21",[req, context]); } /* end-canonical-integration-boundary */
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (process.env.NODE_ENV === "production") {
    const { id } = await context.params;
    return enqueueAiGeneration(req, id, creator.id);
  }
  // Local jobs start claimed atomically, so remote workers cannot execute old code for them.
  return enqueueAiGeneration(req, (await context.params).id, creator.id, true);
}
