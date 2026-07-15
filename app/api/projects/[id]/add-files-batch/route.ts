import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

// 3 total "add more files" sessions per project, ever. Each call to this
// route represents one batch (could contain several files) — checked
// and incremented before any upload in that batch is allowed to start.
const MAX_ADDITIONAL_UPLOAD_BATCHES = 3;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.creatorId !== creator.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (project.additionalUploadCount >= MAX_ADDITIONAL_UPLOAD_BATCHES) {
    return NextResponse.json(
      { error: "You've used all 3 add-more-files sessions for this project." },
      { status: 403 }
    );
  }

  const updated = await db.project.update({
    where: { id },
    data: { additionalUploadCount: { increment: 1 } },
  });

  return NextResponse.json({
    remaining: MAX_ADDITIONAL_UPLOAD_BATCHES - updated.additionalUploadCount,
  });
}