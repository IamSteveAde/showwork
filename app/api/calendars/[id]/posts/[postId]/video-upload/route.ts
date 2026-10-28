import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCreator } from '@/lib/auth';
import { hasCalendarPermission } from '@/lib/calendarPermissions';
import { db } from '@/lib/db';
import { postContentEditErrorFromState } from '@/lib/publishing/editGuard';
import { startWorkspaceVideo, workspaceVideoAction, releaseAbortedWorkspaceVideo, VideoUploadError } from '@/lib/workspaceVideoUploads';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string;postId:string}>}) {
  const actor=await getCurrentCreator();
  if(!actor)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {id,postId}=await params;
  if(!await hasCalendarPermission(actor.id,id,'ADD_CONTENT'))return NextResponse.json({error:'You cannot upload to this workspace.'},{status:403});
  const post=await db.calendarPost.findFirst({where:{id:postId,calendarId:id},include:{calendar:{select:{managerId:true}}}});
  if(!post)return NextResponse.json({error:'Post not found'},{status:404});
  const body=await req.json().catch(()=>null);
  if(!body || !['start','status','sign','finish','abort'].includes(body.action))return NextResponse.json({error:'Invalid upload action'},{status:400});
  // Saved receipts can still be recovered after approval; mutations cannot start/resume then.
  if(['start','sign'].includes(body.action)) {const error=postContentEditErrorFromState(post);if(error)return NextResponse.json({error},{status:409});}
  try {
    const input={calendarId:id,postId,actorId:actor.id,ownerId:post.calendar.managerId,body};
    if(body.action==='start') {
      const session=await startWorkspaceVideo(input);
      return NextResponse.json({sessionId:session.id,fileKey:session.fileKey,reservationId:session.id,partSize:session.partSize,expiresAt:session.expiresAt});
    }
    const result=await workspaceVideoAction(input);
    if('aborted' in result && result.aborted)await releaseAbortedWorkspaceVideo(result,post.calendar.managerId,id);
    return NextResponse.json(result);
  }catch(error){return NextResponse.json({error:error instanceof VideoUploadError?error.message:'Video upload is temporarily unavailable. Retry to resume saved chunks.'},{status:error instanceof VideoUploadError?error.status:503});}
}
