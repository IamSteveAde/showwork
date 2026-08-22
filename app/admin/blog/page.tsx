import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";
import BlogPostList from "@/components/admin/blog/BlogPostList";

const COLOR = { black: "#0A0A0A", gold: "#F5C842" };

export default async function AdminBlogPage() {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");
  if (!isAdminEmail(creator.email)) notFound();

  const posts = await db.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, slug: true, published: true, publishedAt: true, category: true, coverImageUrl: true, viewCount: true, deliverCtaClicks: true, portfolioCtaClicks: true },
  });

  return (
    <main className="min-h-screen px-6 py-12 md:px-20" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white">
          ← Back to admin
        </Link>

        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
          Admin
        </p>
        <h1 className="mb-8 text-3xl font-bold text-white">Blog</h1>

        <BlogPostList
          initialPosts={posts.map((p) => ({
            ...p,
            publishedAt: p.publishedAt?.toISOString() ?? null,
          }))}
        />
      </div>
    </main>
  );
}