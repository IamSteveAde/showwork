"use client";

import { useState } from "react";
import Link from "next/link";
import RichTextEditor from "@/components/admin/blog/RichTextEditor";

const COLOR = { charcoal: "#1A1A1A", gold: "#F5C842" };

interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  bodyHtml: string;
  coverImageUrl: string | null;
  category: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  published: boolean;
}

export default function BlogPostEditor({ post, existingCategories }: { post: BlogPostData; existingCategories: string[] }) {
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [excerpt, setExcerpt] = useState(post.excerpt ?? "");
  const [bodyHtml, setBodyHtml] = useState(post.bodyHtml);
  const [coverImageUrl, setCoverImageUrl] = useState(post.coverImageUrl ?? "");
  const [category, setCategory] = useState(post.category ?? "");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [metaTitle, setMetaTitle] = useState(post.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(post.metaDescription ?? "");
  const [published, setPublished] = useState(post.published);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadCoverImage = async (file: File) => {
    setUploadingCover(true);
    setError(null);
    try {
      const presignRes = await fetch("/api/admin/blog/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error || "Upload failed");

      const putRes = await fetch(presignData.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putRes.ok) throw new Error("Upload to storage failed");

      setCoverImageUrl(presignData.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cover image upload failed");
    } finally {
      setUploadingCover(false);
    }
  };

  const save = async (overrides?: { published?: boolean }) => {
    setSaving(true);
    setError(null);
    setSaveStatus(null);

    const res = await fetch(`/api/admin/blog/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        excerpt,
        bodyHtml,
        coverImageUrl,
        category,
        metaTitle,
        metaDescription,
        published: overrides?.published ?? published,
      }),
    });
    const data = await res.json();

    if (res.ok) {
      if (overrides?.published !== undefined) setPublished(overrides.published);
      setSaveStatus(overrides?.published !== undefined ? (overrides.published ? "Published" : "Unpublished") : "Saved");
      setTimeout(() => setSaveStatus(null), 2500);
    } else {
      setError(data.error ?? "Couldn't save this post");
    }
    setSaving(false);
  };

  const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/25";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase text-white/40";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: published ? "rgba(74,222,128,0.15)" : "rgba(245,200,66,0.15)", color: published ? "#4ADE80" : COLOR.gold }}
          >
            {published ? "Published" : "Draft"}
          </span>
          {published && (
            <Link href={`/blog/${slug}`} target="_blank" className="ml-3 text-xs text-white/40 underline hover:text-white">
              View live
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saveStatus && <span className="text-xs text-white/40">{saveStatus}</span>}
          <button
            onClick={() => save()}
            disabled={saving}
            className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save draft"}
          </button>
          <button
            onClick={() => save({ published: !published })}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"
            style={{ background: COLOR.gold, color: "#0A0A0A" }}
          >
            {published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
        <h2 className="mb-5 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>Post</h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={{ fontSize: "16px" }} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>URL slug <span className="normal-case text-white/25">(changing this after publishing breaks the old link)</span></label>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} style={{ fontSize: "16px" }} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Category <span className="normal-case text-white/25">(optional)</span></label>
            {isCreatingCategory || (existingCategories.length === 0 && !category) ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Pricing, Client Tips, Product"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ fontSize: "16px" }}
                  className={inputClass}
                  autoFocus={isCreatingCategory}
                />
                {existingCategories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingCategory(false);
                      setCategory("");
                    }}
                    className="flex-shrink-0 text-xs text-white/40 underline hover:text-white"
                  >
                    Choose existing
                  </button>
                )}
              </div>
            ) : (
              <select
                value={category}
                onChange={(e) => {
                  if (e.target.value === "__new__") {
                    setIsCreatingCategory(true);
                    setCategory("");
                  } else {
                    setCategory(e.target.value);
                  }
                }}
                style={{ fontSize: "16px" }}
                className={inputClass}
              >
                <option value="">No category</option>
                {existingCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__new__">+ New category...</option>
              </select>
            )}
          </div>

          <div>
            <label className={labelClass}>Excerpt <span className="normal-case text-white/25">(shown on the blog listing page)</span></label>
            <textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} style={{ fontSize: "16px" }} className={`${inputClass} resize-none`} />
          </div>

          <div>
            <label className={labelClass}>Cover image</label>
            {coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImageUrl} alt="" className="mb-3 h-40 w-full rounded-lg object-cover" />
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5">
              {uploadingCover ? "Uploading..." : coverImageUrl ? "Change cover image" : "Upload cover image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingCover}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadCoverImage(file);
                }}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
        <h2 className="mb-5 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>Body</h2>
        <RichTextEditor content={bodyHtml} onChange={setBodyHtml} />
      </div>

      <div className="rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
        <h2 className="mb-2 text-sm font-semibold uppercase text-white/40" style={{ letterSpacing: "0.08em" }}>SEO</h2>
        <p className="mb-5 text-xs text-white/40">
          What shows up in Google and when this post is shared. Leave blank to fall back to the title and excerpt above.
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Meta title <span className="normal-case text-white/25">(optional)</span></label>
            <input type="text" placeholder={title || "Falls back to the post title"} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} style={{ fontSize: "16px" }} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Meta description <span className="normal-case text-white/25">(optional)</span></label>
            <textarea rows={2} placeholder={excerpt || "Falls back to the excerpt"} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} style={{ fontSize: "16px" }} className={`${inputClass} resize-none`} />
          </div>
        </div>
      </div>
    </div>
  );
}