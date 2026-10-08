"use client";

import { IMAGE_FILE_ACCEPT, getFileContentType } from "@/lib/mediaFileTypes";

import { useState } from "react";
import Link from "next/link";
import { putFileWithProgress } from "@/lib/uploadClient";
import RichTextEditor from "@/components/admin/blog/RichTextEditor";

const COLOR = { charcoal: "#FFFFFF", gold: "#2563EB" };

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
  const [coverUploadPercent, setCoverUploadPercent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadCoverImage = async (file: File) => {
    setUploadingCover(true);
    setCoverUploadPercent(0);
    setError(null);
    try {
      const presignRes = await fetch("/api/admin/blog/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: getFileContentType(file) }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error || "Upload failed");

      await putFileWithProgress(presignData.uploadUrl, file, { contentType: getFileContentType(file), onProgress: ({ percent }) => setCoverUploadPercent(percent) });

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

  const inputClass = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-200";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase text-slate-500";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: published ? "rgba(74,222,128,0.15)" : "#EFF6FF", color: published ? "#15803D" : COLOR.gold }}
          >
            {published ? "Published" : "Draft"}
          </span>
          {published && (
            <Link href={`/blog/${slug}`} target="_blank" className="ml-3 text-xs text-slate-500 underline hover:text-slate-900">
              View live
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saveStatus && <span className="text-xs text-slate-500">{saveStatus}</span>}
          <button
            onClick={() => save()}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save draft"}
          </button>
          <button
            onClick={() => save({ published: !published })}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"
            style={{ background: COLOR.gold, color: "#FFFFFF" }}
          >
            {published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="rounded-2xl p-6" style={{ background: COLOR.charcoal, border: "1px solid #E2E8F0" }}>
        <h2 className="mb-5 text-sm font-semibold uppercase text-slate-500" style={{ letterSpacing: "0.08em" }}>Post</h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={{ fontSize: "16px" }} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>URL slug <span className="normal-case text-slate-500">(changing this after publishing breaks the old link)</span></label>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} style={{ fontSize: "16px" }} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Category <span className="normal-case text-slate-500">(optional)</span></label>
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
                    className="flex-shrink-0 text-xs text-slate-500 underline hover:text-slate-900"
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
            <label className={labelClass}>Excerpt <span className="normal-case text-slate-500">(shown on the blog listing page)</span></label>
            <textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} style={{ fontSize: "16px" }} className={`${inputClass} resize-none`} />
          </div>

          <div>
            <label className={labelClass}>Cover image</label>
            {coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImageUrl} alt="" className="mb-3 h-40 w-full rounded-lg object-cover" />
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              {uploadingCover ? `Uploading ${coverUploadPercent}%` : coverImageUrl ? "Change cover image" : "Upload cover image"}
              <input
                type="file"
                accept={IMAGE_FILE_ACCEPT}
                className="hidden"
                disabled={uploadingCover}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.currentTarget.value = "";
                  if (file) uploadCoverImage(file);
                }}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-6" style={{ background: COLOR.charcoal, border: "1px solid #E2E8F0" }}>
        <h2 className="mb-5 text-sm font-semibold uppercase text-slate-500" style={{ letterSpacing: "0.08em" }}>Body</h2>
        <RichTextEditor content={bodyHtml} onChange={setBodyHtml} />
      </div>

      <div className="rounded-2xl p-6" style={{ background: COLOR.charcoal, border: "1px solid #E2E8F0" }}>
        <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500" style={{ letterSpacing: "0.08em" }}>SEO</h2>
        <p className="mb-5 text-xs text-slate-500">
          What shows up in Google and when this post is shared. Leave blank to fall back to the title and excerpt above.
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Meta title <span className="normal-case text-slate-500">(optional)</span></label>
            <input type="text" placeholder={title || "Falls back to the post title"} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} style={{ fontSize: "16px" }} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Meta description <span className="normal-case text-slate-500">(optional)</span></label>
            <textarea rows={2} placeholder={excerpt || "Falls back to the excerpt"} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} style={{ fontSize: "16px" }} className={`${inputClass} resize-none`} />
          </div>
        </div>
      </div>
    </div>
  );
}
