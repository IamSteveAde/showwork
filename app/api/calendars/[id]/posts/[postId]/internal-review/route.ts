import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCreator } from '@/lib/auth';
import { hasCalendarPermission } from '@/lib/calendarPermissions';
import { db } from '@/lib/db';
import { internalReviewError, internalReviewInput } from '@/lib/calendarInternalReview';
import { publicUrlFor } from '@/lib/r2';
import { publishingIntegrationInstalled, invokePublishingEntrypoint } from '@/lib/publishing/applicationBoundary';

export async function POST(req: NextRequest, context: {params: Promise<{id: string; postId: string}>}) {
  if (publishingIntegrationInstalled()) return invokePublishingEntrypoint<NextResponse>('app/api/calendars/[id]/posts/[postId]/internal-review/route.ts#POST', [req, context]);
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({error:'Unauthorized'}, {status:401});
  const {id, postId} = await context.params;
  if (!await hasCalendarPermission(creator.id, id, 'delivery.manage')) return NextResponse.json({error:'You do not have permission to approve internal reviews.'}, {status:403});
  try {
    const decision = internalReviewInput(await req.json());
    const post = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "CalendarPost" WHERE id=${postId} AND "calendarId"=${id} FOR UPDATE`;
      const current = await tx.calendarPost.findFirst({where:{id:postId,calendarId:id}});
      if (!current) throw new Error('Post not found');
      const error = internalReviewError(current, decision.status);
      if (error) throw new Error(error);
      if (current.internalReviewVersion !== decision.version) throw new Error('This post changed. Refresh and review the latest version.');
      return tx.calendarPost.update({where:{id:postId},data:{internalReviewStatus:decision.status,internalReviewNote:decision.note,
        internalReviewedAt:new Date(),internalReviewedBy:creator.id,internalReviewVersion:{increment:1}},
        include:{assets:{orderBy:{displayOrder:'asc'}},videoComments:true,customFields:true}});
    });
    return NextResponse.json({post:{...post,assets:post.assets.map(a=>({...a,sizeBytes:Number(a.sizeBytes),contentUrl:publicUrlFor(a.fileKey)}))}});
  } catch(error) {
    const message = error instanceof Error ? error.message : 'Unable to save internal review.';
    return NextResponse.json({error:message},{status:message==='Post not found'?404:message.startsWith('INVALID_')||message.includes('note is required')?400:409});
  }
}
