import UiSymbol from "@/components/ui/UiSymbol";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";
import BlogPostList from "@/components/admin/blog/BlogPostList";

const COLOR = { black: "#F6F8FB", gold: "#2563EB" };

export default async function AdminBlogPage() {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");
  if (!isAdminEmail(creator.email)) notFound();

  const posts = await db.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, slug: true, published: true, publishedAt: true, category: true, coverImageUrl: true, viewCount: true, deliverCtaClicks: true, portfolioCtaClicks: true },
  });

  return (
    <main className="min-h-screen p-5 sm:p-8" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><>{" "}<UiSymbol name="left" />{" Back to admin "}</></Link>

        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.gold, letterSpacing: "0.1em" }}>
          Admin
        </p>
        <h1 className="mb-8 text-3xl font-bold text-slate-900">Blog</h1>

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