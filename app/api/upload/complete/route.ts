import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, fileKey, type, caption, displayOrder } = await req.json();

  if (!projectId || !fileKey || !type) {
    return NextResponse.json(
      { error: "projectId, fileKey, and type are required" },
      { status: 400 }
    );
  }
  if (type !== "PHOTO" && type !== "VIDEO") {
    return NextResponse.json({ error: "type must be PHOTO or VIDEO" }, { status: 400 });
  }

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.creatorId !== creator.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const media = await db.media.create({
    data: {
      projectId,
      fileKey,
      type,
      caption: caption ?? null,
      displayOrder: displayOrder ?? 0,
    },
  });

  return NextResponse.json({ media });
}
