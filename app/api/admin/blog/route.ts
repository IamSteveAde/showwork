import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlugFor(base: string): Promise<string> {
  let candidate = base || "post";
  let suffix = 0;
  while (true) {
    const existing = await db.blogPost.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

// GET — every post, drafts included, newest first. The admin list
// needs to see unpublished drafts; the public site never does.
export async function GET() {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(creator.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const posts = await db.blogPost.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ posts });
}

// POST — create a new draft. Always starts unpublished — publishing
// is a separate, explicit action (PATCH with published: true), never
// something that happens implicitly on create.
export async function POST(req: NextRequest) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(creator.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { title } = await req.json();
  if (!title || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const slug = await uniqueSlugFor(slugify(title));

  const post = await db.blogPost.create({
    data: {
      title: title.trim(),
      slug,
      bodyHtml: "",
    },
  });

  return NextResponse.json({ post });
}