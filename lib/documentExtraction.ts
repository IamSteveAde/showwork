// ─────────────────────────────────────────────
// BUSINESS DOCUMENT TEXT EXTRACTION — turns an uploaded PDF, Word
// doc, or plain text file into plain text the AI can actually read.
// Done server-side with lightweight libraries rather than sending the
// raw file to OpenAI itself, since plain text extraction is a solved,
// cheap problem that doesn't need an AI call of its own.
//
// PDFs use pdf2json, not pdf-parse — pdf-parse pulls in pdfjs-dist's
// browser-oriented rendering code, which references DOMMatrix (a
// browser-only graphics API that doesn't exist in Node.js at all),
// causing a hard crash in this server environment even though only
// plain text extraction was ever needed. pdf2json avoids that
// rendering path entirely.
//
// Requires two packages:
//   npm install pdf2json mammoth --save
// (pdf-parse can be removed if it was installed for this earlier.)
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
 * pdf2json has no reliable official TypeScript types, so it's
 * imported defensively as `any` rather than assuming a specific
 * export shape. Its API is event-based (not Promise-based), so this
 * wraps it in a Promise the rest of this file can simply await.
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  const PDFParserModule: any = await import("pdf2json");
  const PDFParser = PDFParserModule.default ?? PDFParserModule;

  return new Promise((resolve, reject) => {
    // The `1` here enables getRawTextContent()'s plain-text mode —
    // without it, the parser is set up for structured field/form
    // extraction instead of simple readable text.
    const parser = new PDFParser(null, 1);

    parser.on("pdfParser_dataError", (errData: any) => {
      reject(new Error(errData?.parserError ?? "Failed to parse PDF"));
    });

    parser.on("pdfParser_dataReady", () => {
      resolve(parser.getRawTextContent());
    });

    parser.parseBuffer(buffer);
  });
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
    return extractPdfText(buffer);
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