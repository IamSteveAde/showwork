import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";

// POST — the moment a managed project's work reaches the client.
// Every TaskAsset the owner has internally approved (and not already
// published) gets promoted into a real Media row on the linked
// delivery project — grouped into a section named after the task it
// came from, not dumped into one flat ungrouped list. This is what
// makes the client's delivery page actually organized: "Room
// Renders," "Logo Concepts," whatever each task was called, becomes
// a real section heading on their page. Attribution is preserved too
// — whoever actually uploaded the file stays the recorded uploader.
// Owner-only.
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

  if (!managedProject.deliveryProjectId) {
    return NextResponse.json(
      { error: "Link this project to a delivery first — there's nowhere for published files to go yet." },
      { status: 400 }
    );
  }
  const deliveryProjectId = managedProject.deliveryProjectId;

  const approvedUnpublishedAssets = await db.taskAsset.findMany({
    where: {
      internalReviewStatus: "APPROVED",
      promotedToMediaId: null,
      task: { managedProjectId: id },
    },
    include: { task: { select: { id: true, title: true } } },
  });

  if (approvedUnpublishedAssets.length === 0) {
    return NextResponse.json(
      { error: "Nothing approved and ready to publish yet." },
      { status: 400 }
    );
  }

  // One MediaSection per task, named after that task's title —
  // created once and reused for every asset from the same task, and
  // across repeat publish rounds too (a second batch of approved work
  // from a task published earlier lands in that same existing
  // section, rather than a duplicate one with the same name).
  const sectionIdByTaskId = new Map<string, string>();

  for (const taskId of new Set(approvedUnpublishedAssets.map((a) => a.task.id))) {
    const taskTitle = approvedUnpublishedAssets.find((a) => a.task.id === taskId)!.task.title;

    const existingSection = await db.mediaSection.findFirst({
      where: { projectId: deliveryProjectId, name: taskTitle },
    });

    if (existingSection) {
      sectionIdByTaskId.set(taskId, existingSection.id);
    } else {
      const firstAssetForTask = approvedUnpublishedAssets.find((a) => a.task.id === taskId)!;
      const existingCount = await db.mediaSection.count({ where: { projectId: deliveryProjectId } });
      const newSection = await db.mediaSection.create({
        data: {
          projectId: deliveryProjectId,
          name: taskTitle,
          mediaType: firstAssetForTask.type,
          displayOrder: existingCount,
        },
      });
      sectionIdByTaskId.set(taskId, newSection.id);
    }
  }

  // Sequential rather than Promise.all — each promotion is two
  // dependent writes (create the Media row, then point the TaskAsset
  // at it), and keeping them in order makes a partial-failure state
  // easier to reason about and safely re-run than a batch of
  // interleaved concurrent writes would be.
  let publishedCount = 0;
  for (const asset of approvedUnpublishedAssets) {
    const media = await db.media.create({
      data: {
        projectId: deliveryProjectId,
        fileKey: asset.fileKey,
        type: asset.type,
        uploadedByCreatorId: asset.uploadedByCreatorId,
        sectionId: sectionIdByTaskId.get(asset.task.id),
      },
    });
    await db.taskAsset.update({ where: { id: asset.id }, data: { promotedToMediaId: media.id } });
    publishedCount++;
  }

  await db.managedProject.update({ where: { id }, data: { publishedAt: new Date() } });

  return NextResponse.json({ publishedCount });
}