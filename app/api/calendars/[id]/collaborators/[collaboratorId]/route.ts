import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCreator } from '@/lib/auth';
import { editTeammate, removeTeammate, teamErrorResponse } from '@/lib/calendarTeamService';
type Context = { params: Promise<{ id: string; collaboratorId: string }> };
async function action(req: NextRequest, { params }: Context, remove: boolean) {
  const actor = await getCurrentCreator();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id, collaboratorId } = await params;
    return NextResponse.json(remove ? await removeTeammate(id, collaboratorId, actor) : await editTeammate(id, collaboratorId, actor, await req.json().catch(() => null)));
  } catch (error) { const result = teamErrorResponse(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
export const DELETE = (req: NextRequest, context: Context) => action(req, context, true);
export const PATCH = (req: NextRequest, context: Context) => action(req, context, false);
