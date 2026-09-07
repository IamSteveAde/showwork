import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import type { SocialPlatform } from "@prisma/client";

const VALID_PLATFORMS: SocialPlatform[] = ["INSTAGRAM", "TIKTOK", "YOUTUBE", "FACEBOOK", "X", "LINKEDIN"];

function isSocialPlatform(value: unknown): value is SocialPlatform {
  return typeof value === "string" && (VALID_PLATFORMS as string[]).includes(value);
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

  const { postDate, platform, platforms, postType, category, caption, contentIdea, cta, hashtags, taggedAccounts, linkUrl, customFields } = await req.json();
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
        },
        include: { assets: true, customFields: true },
      })
    )
  );

  // "post" (singular, the first one created) is kept for any old
  // caller still expecting it; "posts" is the real, complete result.
  return NextResponse.json({ post: posts[0], posts });
}