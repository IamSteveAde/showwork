import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { publicUrlFor } from "@/lib/r2";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const managedProject = await db.managedProject.findUnique({ where: { id } });
  if (!managedProject) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (managedProject.creatorId !== creator.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { fileKey, filename } = await req.json();
  if (!fileKey) return NextResponse.json({ error: "fileKey is required" }, { status: 400 });

  const attachment = await db.briefAttachment.create({
    data: {
      managedProjectId: id,
      fileKey,
      filename: typeof filename === "string" ? filename : null,
      uploadedByCreatorId: creator.id,
    },
  });

  return NextResponse.json({ attachment: { ...attachment, url: publicUrlFor(attachment.fileKey) } });
}