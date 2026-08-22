"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const COLOR = { charcoal: "#1A1A1A", gold: "#F5C842" };

interface BlogPostSummary {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  publishedAt: string | null;
  category: string | null;
  coverImageUrl: string | null;
}

export default function BlogPostList({ initialPosts }: { initialPosts: BlogPostSummary[] }) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      setError("Title is required");
      return;
    }
    setCreating(true);
    setError(null);

    const res = await fetch("/api/admin/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    const data = await res.json();

    if (res.ok) {
      router.push(`/admin/blog/${data.post.id}`);
    } else {
      setError(data.error ?? "Couldn't create this post");
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post permanently? This can't be undone.")) return;
    setDeletingId(id);
    const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 rounded-2xl p-5" style={{ background: COLOR.charcoal }}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New post title"
          style={{ fontSize: "16px" }}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/25"
        />
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex-shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          style={{ background: COLOR.gold, color: "#0A0A0A" }}
        >
          {creating ? "Creating..." : "New post"}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex flex-col gap-3">
        {posts.map((post) => (
          <div key={post.id} className="flex items-center justify-between gap-4 rounded-xl p-5" style={{ background: COLOR.charcoal }}>
            <Link href={`/admin/blog/${post.id}`} className="flex-1 hover:opacity-90">
              <p className="text-base font-semibold text-white">{post.title || "Untitled"}</p>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span style={{ color: post.published ? "#4ADE80" : "#F5C842" }}>
                  {post.published ? "Published" : "Draft"}
                </span>
                {post.category && <span className="text-white/30">· {post.category}</span>}
              </div>
            </Link>
            <button
              onClick={() => handleDelete(post.id)}
              disabled={deletingId === post.id}
              className="flex-shrink-0 text-xs text-red-400/70 underline hover:text-red-400 disabled:opacity-50"
            >
              {deletingId === post.id ? "Removing..." : "Delete"}
            </button>
          </div>
        ))}
        {posts.length === 0 && (
          <p className="rounded-xl p-8 text-center text-sm text-white/30" style={{ background: COLOR.charcoal }}>
            No posts yet.
          </p>
        )}
      </div>
    </div>
  );
}