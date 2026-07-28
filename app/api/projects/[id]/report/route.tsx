import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";

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

interface ReportMedia {
  id: string;
  fileKey: string;
  caption: string | null;
  approvalStatus: string;
  approvalNote: string | null;
  reviews: { reviewerName: string | null; reviewerEmail: string }[];
}

interface ReportSection {
  id: string;
  name: string;
  media: ReportMedia[];
}

function filenameFor(m: ReportMedia): string {
  return m.caption || m.fileKey.split("/").pop() || "Untitled file";
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

function buildReportPdf(params: {
  creatorName: string;
  clientName: string;
  deliveryStatus: string;
  generatedAt: string;
  stats: { total: number; approved: number; needsRevision: number; pending: number; approvalRate: number };
  sections: ReportSection[];
  ungroupedMedia: ReportMedia[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { creatorName, clientName, deliveryStatus, generatedAt, stats, sections, ungroupedMedia } = params;
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
    doc.font("Helvetica-Bold").fontSize(20).fillColor(COLOR.text).text("Delivery Report");
    doc.moveDown(0.6);

    // ── PREPARED BY / PREPARED FOR ──
    const infoY = doc.y;
    const colWidth = pageWidth / 2;
    doc.font("Helvetica").fontSize(8).fillColor(COLOR.faint).text(tracked("Prepared by"), left, infoY);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(COLOR.text).text(creatorName, left, infoY + 12);

    doc.font("Helvetica").fontSize(8).fillColor(COLOR.faint).text(tracked("Prepared for"), left + colWidth, infoY);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(COLOR.text).text(clientName, left + colWidth, infoY + 12);

    doc.y = infoY + 34;
    doc.font("Helvetica").fontSize(9).fillColor(COLOR.muted).text(`Delivery status: ${deliveryStatus}`, left);
    doc.moveDown(0.8);
    const rule2Y = doc.y;
    doc.moveTo(left, rule2Y).lineTo(left + pageWidth, rule2Y).lineWidth(0.5).strokeColor(COLOR.line).stroke();
    doc.moveDown(1);

    // ── STATS ──
    const boxWidth = (pageWidth - 24) / 4;
    const boxY = doc.y;
    const statBoxes: { label: string; value: number; color: string }[] = [
      { label: "TOTAL FILES", value: stats.total, color: COLOR.text },
      { label: "APPROVED", value: stats.approved, color: COLOR.approvedText },
      { label: "NEEDS REVISION", value: stats.needsRevision, color: COLOR.revisionText },
      { label: "PENDING", value: stats.pending, color: COLOR.text },
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
      .text(`Approval rate: ${stats.approvalRate}% of files reviewed have been approved`);
    doc.moveDown(1.2);

    // ── FILE ROWS, GROUPED BY SECTION ──
    const renderFileRow = (m: ReportMedia) => {
      const rowStartY = doc.y;
      const { bg, text } = statusColors(m.approvalStatus);
      const label = statusLabel(m.approvalStatus);
      const labelWidth = doc.font("Helvetica-Bold").fontSize(8).widthOfString(label) + 12;

      doc.font("Helvetica").fontSize(9).fillColor(COLOR.text)
        .text(filenameFor(m), left, rowStartY, { width: pageWidth - labelWidth - 10 });

      const badgeY = rowStartY - 1;
      const badgeX = left + pageWidth - labelWidth;
      doc.roundedRect(badgeX, badgeY, labelWidth, 14, 3).fillColor(bg).fill();
      doc.font("Helvetica-Bold").fontSize(8).fillColor(text).text(label, badgeX + 6, badgeY + 3);

      doc.y = Math.max(doc.y, rowStartY + 14);

      if (m.approvalStatus === "NEEDS_REVISION" && m.approvalNote) {
        doc.font("Helvetica-Oblique").fontSize(8).fillColor(COLOR.muted)
          .text(`"${m.approvalNote}"`, left, doc.y + 2, { width: pageWidth });
      }
      if (m.reviews.length > 0) {
        const names = m.reviews.map((r) => r.reviewerName || r.reviewerEmail).join(", ");
        doc.font("Helvetica").fontSize(8).fillColor(COLOR.faint)
          .text(`Reviewed by: ${names}`, left, doc.y + 1, { width: pageWidth });
      }

      doc.moveDown(0.35);
      const lineY = doc.y;
      doc.moveTo(left, lineY).lineTo(left + pageWidth, lineY).lineWidth(0.5).strokeColor(COLOR.line).stroke();
      doc.moveDown(0.4);
    };

    const renderSectionHeading = (name: string, count: number) => {
      doc.font("Helvetica-Bold").fontSize(12).fillColor(COLOR.text).text(`${name} (${count})`);
      doc.moveDown(0.5);
    };

    for (const section of sections) {
      renderSectionHeading(section.name, section.media.length);
      for (const m of section.media) renderFileRow(m);
      doc.moveDown(0.5);
    }

    if (ungroupedMedia.length > 0) {
      renderSectionHeading("Other files", ungroupedMedia.length);
      for (const m of ungroupedMedia) renderFileRow(m);
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

  const project = await db.project.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { displayOrder: "asc" },
        include: {
          media: {
            orderBy: { displayOrder: "asc" },
            include: { reviews: { orderBy: { createdAt: "asc" } } },
          },
        },
      },
      media: {
        include: { reviews: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  if (!project || project.creatorId !== creator.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allMedia = project.media;
  const approved = allMedia.filter((m) => m.approvalStatus === "APPROVED").length;
  const needsRevision = allMedia.filter((m) => m.approvalStatus === "NEEDS_REVISION").length;
  const pending = allMedia.length - approved - needsRevision;
  const reviewedCount = approved + needsRevision;
  const approvalRate = reviewedCount > 0 ? Math.round((approved / reviewedCount) * 100) : 0;

  const ungroupedMedia = allMedia.filter((m) => !m.sectionId);

  const sectionsForReport: ReportSection[] = project.sections.map((s) => ({
    id: s.id,
    name: s.name,
    media: s.media.map((m) => ({
      id: m.id,
      fileKey: m.fileKey,
      caption: m.caption,
      approvalStatus: m.approvalStatus,
      approvalNote: m.approvalNote,
      reviews: m.reviews.map((r) => ({ reviewerName: r.reviewerName, reviewerEmail: r.reviewerEmail })),
    })),
  }));

  const ungroupedForReport: ReportMedia[] = ungroupedMedia.map((m) => ({
    id: m.id,
    fileKey: m.fileKey,
    caption: m.caption,
    approvalStatus: m.approvalStatus,
    approvalNote: m.approvalNote,
    reviews: m.reviews.map((r) => ({ reviewerName: r.reviewerName, reviewerEmail: r.reviewerEmail })),
  }));

  const pdfBuffer = await buildReportPdf({
    creatorName: creator.name || creator.email,
    clientName: project.clientName,
    deliveryStatus: project.deliveryStatus,
    generatedAt: new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }),
    stats: { total: allMedia.length, approved, needsRevision, pending, approvalRate },
    sections: sectionsForReport,
    ungroupedMedia: ungroupedForReport,
  });

  const safeClientName = project.clientName.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "project";

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeClientName} - Delivery Report.pdf"`,
    },
  });
}