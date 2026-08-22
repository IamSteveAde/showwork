import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

// PATCH — updates any subset of fields. Publishing is just
// `published: true` in the same body as any other edit, or on its
// own — the admin UI can send either. publishedAt is set the first
// time a post goes live and never overwritten after that, so
// unpublishing and republishing later doesn't make it look newer than
// it actually is.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(creator.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const existing = await db.blogPost.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if ("title" in body) data.title = body.title?.trim();
  if ("slug" in body) data.slug = body.slug?.trim();
  if ("excerpt" in body) data.excerpt = body.excerpt?.trim() || null;
  if ("bodyHtml" in body) data.bodyHtml = body.bodyHtml ?? "";
  if ("coverImageUrl" in body) data.coverImageUrl = body.coverImageUrl?.trim() || null;
  if ("category" in body) data.category = body.category?.trim() || null;
  if ("metaTitle" in body) data.metaTitle = body.metaTitle?.trim() || null;
  if ("metaDescription" in body) data.metaDescription = body.metaDescription?.trim() || null;

  if ("published" in body) {
    data.published = !!body.published;
    if (body.published && !existing.publishedAt) {
      data.publishedAt = new Date();
    }
  }

  // Slug uniqueness — only checked if it's actually changing, and
  // only against other posts (a post keeping its own slug should
  // never collide with itself).
  if (typeof data.slug === "string" && data.slug !== existing.slug) {
    const collision = await db.blogPost.findUnique({ where: { slug: data.slug } });
    if (collision) {
      return NextResponse.json({ error: "That URL slug is already in use by another post" }, { status: 409 });
    }
  }

  const post = await db.blogPost.update({ where: { id }, data });
  return NextResponse.json({ post });
}

// DELETE — permanent. No soft-delete/undo here; the admin list should
// confirm before calling this.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(creator.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.blogPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}