import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { deliverySession, verifyDeliveryObject } from "@/lib/deliveryUploads";
import { listDeliveryUploadParts } from "@/lib/r2";
export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({error:"Unauthorized"},{status:401});
  const {projectId,fileKey,uploadId} = await req.json();
  const project = typeof projectId === "string" ? await db.project.findUnique({where:{id:projectId}}) : null;
  if (!project || project.deletedAt || project.creatorId !== creator.id && !await db.projectCollaborator.findFirst({where:{projectId,creatorId:creator.id}})) return NextResponse.json({error:"Not found"},{status:404});
  const session = await deliverySession(projectId,creator.id,fileKey,uploadId);
  if (!session) return NextResponse.json({error:"Upload session expired. Retry to restart.",code:"UPLOAD_SESSION_EXPIRED"},{status:409});
  try {
    const parts = await listDeliveryUploadParts(fileKey,uploadId);
    return NextResponse.json({parts},{headers:{"Cache-Control":"private, no-store"}});
  } catch {
    try { await verifyDeliveryObject(session); return NextResponse.json({completed:true}); }
    catch { return NextResponse.json({error:"Upload session expired. Retry to restart.",code:"UPLOAD_SESSION_EXPIRED"},{status:409}); }
  }
}
