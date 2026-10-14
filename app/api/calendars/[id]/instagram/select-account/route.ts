import {NextRequest,NextResponse} from 'next/server';
import {publishingIntegrationInstalled,invokePublishingEntrypoint} from '@/lib/publishing/applicationBoundary';
async function invoke(request:NextRequest,context:{params:Promise<{id:string}>}){
 if(!publishingIntegrationInstalled())return NextResponse.json({error:'Canonical account selection is inactive.'},{status:503});
 try{return await invokePublishingEntrypoint<NextResponse>('app/api/calendars/[id]/instagram/select-account/route.ts#'+request.method,[request,context]);}
 catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Account selection failed.'},{status:409});}
}
export const GET=invoke;
export const POST=invoke;
