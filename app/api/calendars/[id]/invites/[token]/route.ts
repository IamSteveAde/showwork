import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCreator } from '@/lib/auth';
import { cancelTeamInvite, inviteTeammate, teamErrorResponse } from '@/lib/calendarTeamService';
type Context = { params: Promise<{ id: string; token: string }> };
async function action(_req: NextRequest, { params }: Context, resend: boolean) {
  const actor = await getCurrentCreator();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { const { id, token: inviteId } = await params; return NextResponse.json(resend ? await inviteTeammate(id, actor, null, inviteId) : await cancelTeamInvite(id, inviteId, actor)); }
  catch (error) { const result = teamErrorResponse(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
export const DELETE = (req: NextRequest, context: Context) => action(req, context, false);
export const POST = (req: NextRequest, context: Context) => action(req, context, true);
