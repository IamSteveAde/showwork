// ─────────────────────────────────────────────
// BUSINESS DOCUMENT TEXT EXTRACTION — turns an uploaded PDF, Word
// doc, or plain text file into plain text the AI can actually read.
// Done server-side with lightweight libraries rather than sending the
// raw file to OpenAI itself, since plain text extraction is a solved,
// cheap problem that doesn't need an AI call of its own.
//
// Requires two new packages:
//   npm install pdf-parse mammoth --save
// ─────────────────────────────────────────────

export const ALLOWED_BUSINESS_DOCUMENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "text/plain",
];

export function isAllowedBusinessDocumentType(contentType: string): boolean {
  return ALLOWED_BUSINESS_DOCUMENT_TYPES.includes(contentType);
}

/**
 * Downloads the file from its public R2 URL and extracts plain text
 * from it, based on content type. Thrown errors are meant to be
 * caught by the caller and surfaced as a clear, specific message
 * rather than silently failing — a business document that can't be
 * read is worth telling the manager about directly.
 */
export async function extractTextFromDocument(fileUrl: string, contentType: string): Promise<string> {
  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error("Failed to download the uploaded document for processing");
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (contentType === "application/pdf") {
    // Imported defensively as `any` rather than assuming a specific
    // export shape — pdf-parse's package typings don't reliably
    // declare a `default` export even when one exists at runtime,
    // and this works correctly whichever way the module actually
    // exports its function.
    const pdfParseModule: any = await import("pdf-parse");
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (contentType === "text/plain") {
    return buffer.toString("utf-8");
  }

  throw new Error("That file type isn't supported for business documents");
}