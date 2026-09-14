import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { publicUrlFor } from "@/lib/r2";
import { hasCalendarPermission } from "@/lib/calendarPermissions";

export async function POST(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; postId: string }>;
  }
) {
  const creator = await getCurrentCreator();

  if (!creator) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id: calendarId, postId } = await params;

  /*
   * Attaching an existing asset is still an "add content" action.
   * The same permission used for normal uploads therefore applies.
   */
  if (
    !(await hasCalendarPermission(
      creator.id,
      calendarId,
      "ADD_CONTENT"
    ))
  ) {
    return NextResponse.json(
      {
        error:
          "You don't have permission to add content to this calendar",
      },
      { status: 403 }
    );
  }

  let body: {
    sourcePostId?: unknown;
    fileKey?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { sourcePostId, fileKey } = body;

  if (
    typeof sourcePostId !== "string" ||
    !sourcePostId ||
    typeof fileKey !== "string" ||
    !fileKey
  ) {
    return NextResponse.json(
      {
        error: "sourcePostId and fileKey are required",
      },
      { status: 400 }
    );
  }

  /*
   * Confirm that the destination post belongs to this calendar.
   */
  const destinationPost = await db.calendarPost.findUnique({
    where: {
      id: postId,
    },
    select: {
      id: true,
      calendarId: true,
    },
  });

  if (
    !destinationPost ||
    destinationPost.calendarId !== calendarId
  ) {
    return NextResponse.json(
      { error: "Destination post not found" },
      { status: 404 }
    );
  }

  /*
   * Find the already-uploaded source asset.
   *
   * We deliberately require the source post to belong to the same
   * calendar. This prevents somebody from using this endpoint to
   * attach an asset from another client's workspace.
   */
  const sourcePost = await db.calendarPost.findUnique({
    where: {
      id: sourcePostId,
    },
    select: {
      id: true,
      calendarId: true,
    },
  });

  if (
    !sourcePost ||
    sourcePost.calendarId !== calendarId
  ) {
    return NextResponse.json(
      { error: "Source post not found" },
      { status: 404 }
    );
  }

  /*
   * Find the actual completed asset.
   *
   * The asset must already exist in the database. That means the
   * original R2 upload has already completed and its storage has
   * already been accounted for.
   */
  const sourceAsset = await db.calendarPostAsset.findFirst({
    where: {
      postId: sourcePostId,
      fileKey,
    },
    select: {
      id: true,
      fileKey: true,
      mediaType: true,
      sizeBytes: true,
    },
  });

  if (!sourceAsset) {
    return NextResponse.json(
      {
        error:
          "The source file could not be found. Please upload the file first.",
      },
      { status: 404 }
    );
  }

  /*
   * Do not create the same asset twice on the destination post.
   */
  const existingAsset = await db.calendarPostAsset.findFirst({
    where: {
      postId,
      fileKey,
    },
    select: {
      id: true,
    },
  });

  if (existingAsset) {
    const existingPost =
      await db.calendarPost.findUniqueOrThrow({
        where: {
          id: postId,
        },
        include: {
          assets: {
            orderBy: {
              displayOrder: "asc",
            },
          },
          videoComments: {
            orderBy: {
              videoTimestampSeconds: "asc",
            },
          },
          customFields: true,
        },
      });

    return NextResponse.json({
      post: {
        ...existingPost,
        assets: existingPost.assets.map((asset) => ({
          ...asset,
          sizeBytes:
            typeof asset.sizeBytes === "bigint"
              ? asset.sizeBytes.toString()
              : asset.sizeBytes,
          contentUrl: publicUrlFor(asset.fileKey),
        })),
      },
    });
  }

  /*
   * Put the asset at the end of the destination post's existing
   * asset list.
   */
  const existingCount =
    await db.calendarPostAsset.count({
      where: {
        postId,
      },
    });

  /*
   * Create another database reference to the SAME R2 object.
   *
   * This does NOT upload the file again.
   *
   * It also does NOT increase storage usage because the physical
   * file already exists and has already been counted.
   */
  await db.calendarPostAsset.create({
    data: {
      postId,
      fileKey: sourceAsset.fileKey,
      mediaType: sourceAsset.mediaType,
      sizeBytes: sourceAsset.sizeBytes,
      displayOrder: existingCount,
    },
  });

  /*
   * Attaching new content means the destination post needs fresh
   * client review, just like a normal upload.
   */
  const updatedPost = await db.calendarPost.update({
    where: {
      id: postId,
    },
    data: {
      approvalStatus: "PENDING",
      approvalNote: null,
      reviewedAt: null,
    },
    include: {
      assets: {
        orderBy: {
          displayOrder: "asc",
        },
      },
      videoComments: {
        orderBy: {
          videoTimestampSeconds: "asc",
        },
      },
      customFields: true,
    },
  });

  return NextResponse.json({
    post: {
      ...updatedPost,
      assets: updatedPost.assets.map((asset) => ({
        ...asset,
        sizeBytes:
          typeof asset.sizeBytes === "bigint"
            ? asset.sizeBytes.toString()
            : asset.sizeBytes,
        contentUrl: publicUrlFor(asset.fileKey),
      })),
    },
  });
}