import { NextRequest, NextResponse } from 'next/server';
import {publishingIntegrationInstalled,invokePublishingEntrypoint} from '@/lib/publishing/applicationBoundary';
import { getCurrentCreator } from '@/lib/auth';
import { acceptTeamInvite, teamErrorResponse } from '@/lib/calendarTeamService';
export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  /* canonical-integration-boundary */ if (publishingIntegrationInstalled()) { return invokePublishingEntrypoint<Response>('app/api/calendars/invites/[token]/accept/route.ts#POSTcanonical',Array.from(arguments)); } /* end-canonical-integration-boundary */
  const actor = await getCurrentCreator();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { const { token } = await params; return NextResponse.json(await acceptTeamInvite(token, actor)); }
  catch (error) { const result = teamErrorResponse(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
