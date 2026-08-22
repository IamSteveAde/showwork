"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Node, mergeAttributes } from "@tiptap/core";
import { useCallback } from "react";

const COLOR = { gold: "#F5C842" };

// Tiptap has no official video node — this is a small custom one,
// following the same pattern as its built-in nodes, rendering a real
// <video> element with controls so an inserted video is actually
// playable both in the editor and on the published post.
const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  addAttributes() {
    return { src: { default: null } };
  },
  parseHTML() {
    return [{ tag: "video" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["video", mergeAttributes(HTMLAttributes, { controls: "true", class: "w-full rounded-lg" })];
  },
});

function ToolbarButton({
  onClick,
  active,
  children,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-sm font-semibold transition-colors"
      style={{
        background: active ? COLOR.gold : "rgba(255,255,255,0.06)",
        color: active ? "#0A0A0A" : "rgba(255,255,255,0.7)",
      }}
    >
      {children}
    </button>
  );
}

// Uploads a file to R2 via the same admin presign route used
// elsewhere, returning the public URL once the upload completes.
async function uploadFile(file: File): Promise<string> {
  const presignRes = await fetch("/api/admin/blog/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type }),
  });
  const presignData = await presignRes.json();
  if (!presignRes.ok) throw new Error(presignData.error || "Upload failed");

  const putRes = await fetch(presignData.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  if (!putRes.ok) throw new Error("Upload to storage failed");

  return presignData.publicUrl;
}

export default function RichTextEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ HTMLAttributes: { class: "rounded-lg max-w-full" } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "underline" } }),
      Video,
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "rt-content min-h-[400px] px-4 py-4 outline-none",
      },
    },
  });

  const addImage = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !editor) return;
      try {
        const url = await uploadFile(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Image upload failed");
      }
    };
    input.click();
  }, [editor]);

  const addVideo = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !editor) return;
      try {
        const url = await uploadFile(file);
        editor.chain().focus().insertContent({ type: "video", attrs: { src: url } }).run();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Video upload failed");
      }
    };
    input.click();
  }, [editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Link URL");
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 p-2">
        <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>B</ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><span className="italic">I</span></ToolbarButton>
        <ToolbarButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
        <ToolbarButton label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>
        <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>&bull; List</ToolbarButton>
        <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</ToolbarButton>
        <ToolbarButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>&ldquo;&rdquo;</ToolbarButton>
        <ToolbarButton label="Link" active={editor.isActive("link")} onClick={addLink}>Link</ToolbarButton>
        <ToolbarButton label="Insert image" onClick={addImage}>Image</ToolbarButton>
        <ToolbarButton label="Insert video" onClick={addVideo}>Video</ToolbarButton>
      </div>
      <EditorContent editor={editor} className="text-white" />

      {/* Explicit styling for every tag the editor can actually
          produce — deliberately not relying on Tailwind's "prose"
          typography plugin classes, since that plugin may not be
          installed/configured in this project. Tailwind's own base
          styles (Preflight) strip default heading/bold/list styling
          globally by design, so without one of these two approaches,
          every tag renders visually identical to plain text — which
          is exactly the "nothing is working" symptom this replaces. */}
      <style jsx global>{`
        .rt-content h2 { font-size: 1.5rem; font-weight: 700; color: #fff; margin: 1.25rem 0 0.5rem; }
        .rt-content h3 { font-size: 1.25rem; font-weight: 700; color: #fff; margin: 1rem 0 0.5rem; }
        .rt-content p { margin: 0.5rem 0; line-height: 1.7; color: rgba(255,255,255,0.85); }
        .rt-content strong { font-weight: 700; color: #fff; }
        .rt-content em { font-style: italic; }
        .rt-content ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        .rt-content ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        .rt-content li { margin: 0.25rem 0; color: rgba(255,255,255,0.85); }
        .rt-content blockquote { border-left: 3px solid ${COLOR.gold}; padding-left: 1rem; margin: 1rem 0; color: rgba(255,255,255,0.6); font-style: italic; }
        .rt-content a { color: ${COLOR.gold}; text-decoration: underline; }
        .rt-content img { border-radius: 0.5rem; max-width: 100%; margin: 1rem 0; }
        .rt-content video { border-radius: 0.5rem; max-width: 100%; margin: 1rem 0; }
      `}</style>
    </div>
  );
}