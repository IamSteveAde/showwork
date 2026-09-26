import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessCalendarById, hasCalendarPermission } from "@/lib/calendarPermissions";
import { isAdminEmail } from "@/lib/admin";
import { publicUrlFor } from "@/lib/r2";
import type { SocialPlatform, TikTokPrivacyLevel } from "@prisma/client";

const VALID_PLATFORMS: SocialPlatform[] = ["INSTAGRAM", "TIKTOK", "YOUTUBE", "FACEBOOK", "X", "LINKEDIN"];
const VALID_TIKTOK_PRIVACY_LEVELS: TikTokPrivacyLevel[] = [
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "FOLLOWER_OF_CREATOR",
  "SELF_ONLY",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await hasCalendarPermission(creator.id, id, "VIEW_ONLY"))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isAdminEmail(creator.email) && !(await canAccessCalendarById(id))) {
    return NextResponse.json({ error: "This calendar isn't active" }, { status: 403 });
  }

  const posts = await db.calendarPost.findMany({
    where: { calendarId: id },
    orderBy: { postDate: "asc" },
    include: {
      assets: { orderBy: { displayOrder: "asc" } },
      videoComments: { orderBy: { videoTimestampSeconds: "asc" } },
      customFields: true,
    },
  });

  return NextResponse.json(
    {
      posts: posts.map((post) => ({
        id: post.id,
        postDate: post.postDate.toISOString(),
        platform: post.platform,
        postType: post.postType,
        category: post.category,
        hook: post.hook,
        script: post.script,
        caption: post.caption,
        contentIdea: post.contentIdea,
        cta: post.cta,
        hashtags: post.hashtags,
        taggedAccounts: post.taggedAccounts,
        linkUrl: post.linkUrl,
        approvalStatus: post.approvalStatus,
        approvalNote: post.approvalNote,
        instagramPublishStatus: post.instagramPublishStatus,
        instagramPermalink: post.instagramPermalink,
        instagramPublishError: post.instagramPublishError,
        tikTokPublishStatus: post.tikTokPublishStatus,
        tikTokPrivacyLevel: post.tikTokPrivacyLevel,
        tikTokPublishError: post.tikTokPublishError,
        assets: post.assets.map((asset) => ({
          id: asset.id,
          fileKey: asset.fileKey,
          mediaType: asset.mediaType,
          contentUrl: publicUrlFor(asset.fileKey),
        })),
        videoComments: post.videoComments.map((comment) => ({
          id: comment.id,
          authorName: comment.authorName,
          authorEmail: comment.authorEmail,
          note: comment.note,
          videoTimestampSeconds: comment.videoTimestampSeconds,
        })),
        customFields: post.customFields.map((field) => ({
          id: field.id,
          label: field.label,
          value: field.value,
        })),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function isSocialPlatform(value: unknown): value is SocialPlatform {
  return typeof value === "string" && (VALID_PLATFORMS as string[]).includes(value);
}

function isTikTokPrivacyLevel(value: unknown): value is TikTokPrivacyLevel {
  return typeof value === "string" && (VALID_TIKTOK_PRIVACY_LEVELS as string[]).includes(value);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const calendar = await db.socialCalendar.findUnique({ where: { id } });
  if (!calendar) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }
  if (!(await hasCalendarPermission(creator.id, id, "EDIT_CALENDAR"))) {
    return NextResponse.json({ error: "You don't have permission to add posts to this calendar" }, { status: 403 });
  }

  const {
    postDate,
    platform,
    platforms,
    postType,
    category,
    caption,
    contentIdea,
    cta,
    hashtags,
    taggedAccounts,
    linkUrl,
    customFields,
    tikTokPrivacyLevel,
  } = await req.json();
  if (!postDate) {
    return NextResponse.json({ error: "A date is required" }, { status: 400 });
  }

  // Accept either the old singular "platform" or a new "platforms"
  // array — a manager picking several platforms for the same piece
  // of content gets one real CalendarPost per platform, all created
  // together, rather than having to repeat the whole form manually
  // for each one.
  const platformList: unknown[] = Array.isArray(platforms) && platforms.length > 0 ? platforms : platform ? [platform] : [];
  const validPlatforms = platformList.filter(isSocialPlatform);
  if (validPlatforms.length === 0) {
    return NextResponse.json({ error: "At least one valid platform is required" }, { status: 400 });
  }

  // Only meaningful (and only ever stored) for a TikTok post — the
  // publish step itself refuses to run without this, since TikTok
  // requires it to be a real, active human choice rather than
  // something the system silently decides.
  const validTikTokPrivacyLevel = isTikTokPrivacyLevel(tikTokPrivacyLevel) ? tikTokPrivacyLevel : null;

  const validCustomFields: { label: string; value: string }[] = Array.isArray(customFields)
    ? customFields.filter((f) => f?.label?.trim() && f?.value?.trim()).map((f) => ({ label: f.label.trim(), value: f.value.trim() }))
    : [];

  const posts = await Promise.all(
    validPlatforms.map((p) =>
      db.calendarPost.create({
        data: {
          calendarId: calendar.id,
          postDate: new Date(postDate),
          platform: p,
          postType: postType?.trim() || null,
          category: category?.trim() || null,
          caption: caption?.trim() || null,
          contentIdea: contentIdea?.trim() || null,
          cta: cta?.trim() || null,
          hashtags: hashtags?.trim() || null,
          taggedAccounts: taggedAccounts?.trim() || null,
          linkUrl: linkUrl?.trim() || null,
          customFields: { create: validCustomFields },
          tikTokPrivacyLevel: p === "TIKTOK" ? validTikTokPrivacyLevel : null,
        },
        include: { assets: true, customFields: true },
      })
    )
  );

  // "post" (singular, the first one created) is kept for any old
  // caller still expecting it; "posts" is the real, complete result.
  return NextResponse.json({ post: posts[0], posts });
}
