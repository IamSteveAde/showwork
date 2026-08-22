import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";
import BlogPostEditor from "@/components/admin/blog/BlogPostEditor";

const COLOR = { black: "#0A0A0A" };

export default async function AdminBlogEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");
  if (!isAdminEmail(creator.email)) notFound();

  const { id } = await params;
  const post = await db.blogPost.findUnique({ where: { id } });
  if (!post) notFound();

  // Every distinct category used across any post (drafts included) —
  // so the editor can offer them as select-able options instead of
  // making the admin retype a category name every single time.
  const categoryRows = await db.blogPost.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });
  const existingCategories = categoryRows
    .map((r) => r.category)
    .filter((c): c is string => Boolean(c))
    .sort();

  return (
    <main className="min-h-screen px-6 py-12 md:px-20" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/blog" className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white">
          ← Back to all posts
        </Link>

        <BlogPostEditor
          post={{
            id: post.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            bodyHtml: post.bodyHtml,
            coverImageUrl: post.coverImageUrl,
            category: post.category,
            metaTitle: post.metaTitle,
            metaDescription: post.metaDescription,
            published: post.published,
          }}
          existingCategories={existingCategories}
        />
      </div>
    </main>
  );
}