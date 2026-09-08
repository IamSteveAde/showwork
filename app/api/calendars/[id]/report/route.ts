import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarPermission, canAccessCalendar } from "@/lib/calendarPermissions";

// pdfkit reads its own font data files from disk at runtime — must not
// be bundled by webpack (see next.config.js: serverExternalPackages).
export const runtime = "nodejs";

const COLOR = {
  black: "#0A0A0A",
  gold: "#C9A227", // slightly deeper than the on-screen brand gold —
  // reads better in print than the bright web version does
  text: "#1A1A1A",
  muted: "#666666",
  faint: "#999999",
  approvedBg: "#DCFCE7",
  approvedText: "#166534",
  revisionBg: "#FFEDD5",
  revisionText: "#9A3412",
  pendingBg: "#F1F1F1",
  pendingText: "#666666",
  line: "#E5E5E5",
  watermark: "#000000",
};

const PLATFORM_LABEL: Record<string, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  FACEBOOK: "Facebook",
  X: "X",
  LINKEDIN: "LinkedIn",
};

interface ReportPost {
  id: string;
  platform: string;
  postType: string | null;
  postDate: Date;
  caption: string | null;
  approvalStatus: string;
  approvalNote: string | null;
  reviewedAt: Date | null;
}

function captionSnippetFor(p: ReportPost): string {
  if (p.caption && p.caption.trim()) {
    return p.caption.trim().length > 90 ? p.caption.trim().slice(0, 90) + "…" : p.caption.trim();
  }
  return "No caption written yet";
}

function statusLabel(status: string): string {
  if (status === "APPROVED") return "APPROVED";
  if (status === "NEEDS_REVISION") return "NEEDS REVISION";
  return "PENDING";
}

function statusColors(status: string): { bg: string; text: string } {
  if (status === "APPROVED") return { bg: COLOR.approvedBg, text: COLOR.approvedText };
  if (status === "NEEDS_REVISION") return { bg: COLOR.revisionBg, text: COLOR.revisionText };
  return { bg: COLOR.pendingBg, text: COLOR.pendingText };
}

// Manual letter-spacing — pdfkit has no native tracking control, so a
// few extra spaces between characters gives that same "formal document"
// feel real letterheads use for small caps labels.
function tracked(s: string): string {
  return s.toUpperCase().split("").join(" ");
}

function buildCalendarReportPdf(params: {
  managerName: string;
  clientName: string;
  planStatus: string;
  generatedAt: string;
  dateRangeLabel: string | null;
  stats: { total: number; approved: number; needsRevision: number; pending: number; approvalRate: number };
  platformCounts: { platform: string; count: number }[];
  postsByPlatform: { platform: string; posts: ReportPost[] }[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { managerName, clientName, planStatus, generatedAt, dateRangeLabel, stats, platformCounts, postsByPlatform } = params;
    const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    // ── LETTERHEAD ──
    doc.font("Helvetica-Bold").fontSize(15).fillColor(COLOR.black).text("Show", left, doc.y, { continued: true });
    doc.fillColor(COLOR.gold).text("work");

    doc.font("Helvetica").fontSize(8).fillColor(COLOR.faint)
      .text(generatedAt, left, doc.page.margins.top, { width: pageWidth, align: "right" });

    doc.moveDown(1.2);
    const rule1Y = doc.y;
    doc.moveTo(left, rule1Y).lineTo(left + pageWidth, rule1Y).lineWidth(1.5).strokeColor(COLOR.gold).stroke();
    doc.moveDown(1);

    // ── TITLE ──
    doc.font("Helvetica-Bold").fontSize(20).fillColor(COLOR.text).text("Content Calendar Report");
    doc.moveDown(0.6);

    // ── PREPARED BY / PREPARED FOR ──
    const infoY = doc.y;
    const colWidth = pageWidth / 2;
    doc.font("Helvetica").fontSize(8).fillColor(COLOR.faint).text(tracked("Prepared by"), left, infoY);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(COLOR.text).text(managerName, left, infoY + 12);

    doc.font("Helvetica").fontSize(8).fillColor(COLOR.faint).text(tracked("Prepared for"), left + colWidth, infoY);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(COLOR.text).text(clientName, left + colWidth, infoY + 12);

    doc.y = infoY + 34;
    doc.font("Helvetica").fontSize(9).fillColor(COLOR.muted).text(
      `Plan status: ${planStatus.replace(/_/g, " ")}${dateRangeLabel ? `   ·   Covering: ${dateRangeLabel}` : ""}`,
      left
    );
    doc.moveDown(0.8);
    const rule2Y = doc.y;
    doc.moveTo(left, rule2Y).lineTo(left + pageWidth, rule2Y).lineWidth(0.5).strokeColor(COLOR.line).stroke();
    doc.moveDown(1);

    // ── STATS ──
    const boxWidth = (pageWidth - 24) / 4;
    const boxY = doc.y;
    const statBoxes: { label: string; value: number; color: string }[] = [
      { label: "TOTAL POSTS", value: stats.total, color: COLOR.text },
      { label: "APPROVED", value: stats.approved, color: COLOR.approvedText },
      { label: "NEEDS REVISION", value: stats.needsRevision, color: COLOR.revisionText },
      { label: "AWAITING REVIEW", value: stats.pending, color: COLOR.text },
    ];
    statBoxes.forEach((box, i) => {
      const x = left + i * (boxWidth + 8);
      doc.roundedRect(x, boxY, boxWidth, 52, 4).fillColor("#FAFAF8").fill();
      doc.roundedRect(x, boxY, boxWidth, 52, 4).lineWidth(0.5).strokeColor(COLOR.line).stroke();
      doc.font("Helvetica-Bold").fontSize(19).fillColor(box.color).text(String(box.value), x + 12, boxY + 9);
      doc.font("Helvetica").fontSize(7.5).fillColor(COLOR.muted).text(box.label, x + 12, boxY + 34, { width: boxWidth - 22 });
    });
    doc.y = boxY + 66;

    doc.font("Helvetica").fontSize(10).fillColor("#444444")
      .text(`Approval rate: ${stats.approvalRate}% of posts reviewed have been approved`);
    doc.moveDown(1.2);

    // ── BY PLATFORM BREAKDOWN ──
    if (platformCounts.length > 0) {
      doc.font("Helvetica-Bold").fontSize(11).fillColor(COLOR.text).text("Posts by platform");
      doc.moveDown(0.4);
      const platformRowY = doc.y;
      const platformColWidth = pageWidth / platformCounts.length;
      platformCounts.forEach((p, i) => {
        const x = left + i * platformColWidth;
        doc.font("Helvetica-Bold").fontSize(14).fillColor(COLOR.text).text(String(p.count), x, platformRowY, { width: platformColWidth });
        doc.font("Helvetica").fontSize(8).fillColor(COLOR.muted).text(PLATFORM_LABEL[p.platform] ?? p.platform, x, platformRowY + 18, { width: platformColWidth });
      });
      doc.y = platformRowY + 36;
      doc.moveDown(0.8);
      const rule3Y = doc.y;
      doc.moveTo(left, rule3Y).lineTo(left + pageWidth, rule3Y).lineWidth(0.5).strokeColor(COLOR.line).stroke();
      doc.moveDown(1);
    }

    // ── POST ROWS, GROUPED BY PLATFORM ──
    const renderPostRow = (p: ReportPost) => {
      const rowStartY = doc.y;
      const { bg, text } = statusColors(p.approvalStatus);
      const label = statusLabel(p.approvalStatus);
      const labelWidth = doc.font("Helvetica-Bold").fontSize(8).widthOfString(label) + 12;

      const dateLabel = p.postDate.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
      const titleLine = p.postType ? `${dateLabel} · ${p.postType}` : dateLabel;

      doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR.text)
        .text(titleLine, left, rowStartY, { width: pageWidth - labelWidth - 10 });

      const badgeY = rowStartY - 1;
      const badgeX = left + pageWidth - labelWidth;
      doc.roundedRect(badgeX, badgeY, labelWidth, 14, 3).fillColor(bg).fill();
      doc.font("Helvetica-Bold").fontSize(8).fillColor(text).text(label, badgeX + 6, badgeY + 3);

      doc.y = Math.max(doc.y, rowStartY + 14);

      doc.font("Helvetica").fontSize(8.5).fillColor(COLOR.muted)
        .text(captionSnippetFor(p), left, doc.y + 2, { width: pageWidth });

      if (p.approvalStatus === "NEEDS_REVISION" && p.approvalNote) {
        doc.font("Helvetica-Oblique").fontSize(8).fillColor(COLOR.muted)
          .text(`"${p.approvalNote}"`, left, doc.y + 2, { width: pageWidth });
      }
      if (p.reviewedAt) {
        doc.font("Helvetica").fontSize(7.5).fillColor(COLOR.faint)
          .text(`Reviewed ${p.reviewedAt.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}`, left, doc.y + 1, { width: pageWidth });
      }

      doc.moveDown(0.35);
      const lineY = doc.y;
      doc.moveTo(left, lineY).lineTo(left + pageWidth, lineY).lineWidth(0.5).strokeColor(COLOR.line).stroke();
      doc.moveDown(0.4);
    };

    for (const group of postsByPlatform) {
      doc.font("Helvetica-Bold").fontSize(12).fillColor(COLOR.text)
        .text(`${PLATFORM_LABEL[group.platform] ?? group.platform} (${group.posts.length})`);
      doc.moveDown(0.5);
      for (const p of group.posts) renderPostRow(p);
      doc.moveDown(0.5);
    }

    // ── WATERMARK + FOOTER on every page ──
    const pageRange = doc.bufferedPageRange();
    for (let i = 0; i < pageRange.count; i++) {
      doc.switchToPage(i);

      // Minimal diagonal watermark — very low opacity, purely a subtle
      // authenticity mark, never competing with the actual content.
      doc.save();
      doc.opacity(0.035);
      doc.font("Helvetica-Bold").fontSize(72).fillColor(COLOR.watermark);
      doc.rotate(-38, { origin: [doc.page.width / 2, doc.page.height / 2] });
      doc.text("SHOWWORK", 0, doc.page.height / 2 - 40, { width: doc.page.width, align: "center" });
      doc.restore();
      doc.opacity(1);

      doc.font("Helvetica").fontSize(8).fillColor(COLOR.faint).text(
        `Generated by Showwork — useshowwork.com   ·   Page ${i + 1} of ${pageRange.count}`,
        left,
        doc.page.height - doc.page.margins.bottom + 6,
        { width: pageWidth, align: "center" }
      );
    }

    doc.end();
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const creator = await getCurrentCreator();
  if (!creator) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Read-only report — safe for any registered role on the calendar,
  // not just the manager. Downloading a status summary can't damage
  // anyone else's work, same reasoning as the project delivery report.
  if (!(await hasCalendarPermission(creator.id, id, "VIEW_ONLY"))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const calendar = await db.socialCalendar.findUnique({
    where: { id },
    include: {
      manager: { select: { name: true, email: true } },
      posts: { orderBy: { postDate: "asc" } },
    },
  });

  if (!calendar) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // A calendar that isn't actually active shouldn't have a report
  // generated from it either — same billing gate the pages themselves
  // already enforce, checked again here since this URL could
  // otherwise be hit directly.
  if (!canAccessCalendar(calendar)) {
    return NextResponse.json({ error: "This calendar isn't active" }, { status: 403 });
  }

  const allPosts = calendar.posts;
  const approved = allPosts.filter((p) => p.approvalStatus === "APPROVED").length;
  const needsRevision = allPosts.filter((p) => p.approvalStatus === "NEEDS_REVISION").length;
  const pending = allPosts.length - approved - needsRevision;
  const reviewedCount = approved + needsRevision;
  const approvalRate = reviewedCount > 0 ? Math.round((approved / reviewedCount) * 100) : 0;

  const platformCounts = Object.entries(
    allPosts.reduce<Record<string, number>>((acc, p) => {
      acc[p.platform] = (acc[p.platform] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);

  const postsByPlatform = platformCounts.map(({ platform }) => ({
    platform,
    posts: allPosts
      .filter((p) => p.platform === platform)
      .map((p) => ({
        id: p.id,
        platform: p.platform,
        postType: p.postType,
        postDate: p.postDate,
        caption: p.caption,
        approvalStatus: p.approvalStatus,
        approvalNote: p.approvalNote,
        reviewedAt: p.reviewedAt,
      })),
  }));

  const dateRangeLabel =
    allPosts.length > 0
      ? `${allPosts[0].postDate.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })} – ${allPosts[allPosts.length - 1].postDate.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}`
      : null;

  const pdfBuffer = await buildCalendarReportPdf({
    managerName: calendar.manager.name || calendar.manager.email,
    clientName: calendar.clientName,
    planStatus: calendar.planStatus,
    generatedAt: new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }),
    dateRangeLabel,
    stats: { total: allPosts.length, approved, needsRevision, pending, approvalRate },
    platformCounts,
    postsByPlatform,
  });

  const safeClientName = calendar.clientName.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "calendar";

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeClientName} - Content Calendar Report.pdf"`,
    },
  });
}