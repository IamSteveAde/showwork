"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const COLOR = { blue: "#2478FF", offWhiteCard: "#FFFDF8", ink: "#101010" };

interface PostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  category: string | null;
  publishedAt: string | null;
}

export default function BlogListClient({ posts, categories }: { posts: PostSummary[]; categories: string[] }) {
  const [activeCategory, setActiveCategory] = useState<string | "All">("All");

  const filtered = useMemo(
    () => (activeCategory === "All" ? posts : posts.filter((p) => p.category === activeCategory)),
    [posts, activeCategory]
  );

  return (
    <div>
      {categories.length > 0 && (
        <div className="mb-10 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("All")}
            className="rounded-full px-4 py-2 text-xs font-bold transition-colors"
            style={{
              background: activeCategory === "All" ? COLOR.ink : "rgba(16,16,16,0.06)",
              color: activeCategory === "All" ? "#fff" : "rgba(16,16,16,0.6)",
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="rounded-full px-4 py-2 text-xs font-bold transition-colors"
              style={{
                background: activeCategory === cat ? COLOR.ink : "rgba(16,16,16,0.06)",
                color: activeCategory === cat ? "#fff" : "rgba(16,16,16,0.6)",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-black/40">No posts in this category yet.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filtered.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group overflow-hidden rounded-2xl transition-transform hover:-translate-y-1"
              style={{ background: COLOR.offWhiteCard, border: "1px solid rgba(16,16,16,0.08)" }}
            >
              {post.coverImageUrl && (
                <div className="overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.coverImageUrl}
                    alt=""
                    className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="p-6">
                {post.category && (
                  <p className="mb-2 text-xs font-bold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.15em" }}>
                    {post.category}
                  </p>
                )}
                <h2 className="text-xl font-bold leading-tight" style={{ color: COLOR.ink }}>{post.title}</h2>
                {post.excerpt && <p className="mt-2 text-sm leading-relaxed text-black/55">{post.excerpt}</p>}
                {post.publishedAt && (
                  <p className="mt-4 text-xs text-black/35">
                    {new Date(post.publishedAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}