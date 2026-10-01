import { NextRequest, NextResponse } from "next/server";
import { importAccess } from "@/lib/calendarImport/access";
import { confirmImport, ImportError } from "@/lib/calendarImport/confirmation";

export const runtime = "nodejs";
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await importAccess(id);
  if (access.error) return access.error;
  try {
    const text = await req.text();
    if (text.length > 1000000)
      return NextResponse.json(
        { error: "Import is too large. Split it into smaller files." },
        { status: 413 },
      );
    let input: unknown;
    try {
      input = JSON.parse(text);
    } catch {
      throw new ImportError("Invalid request body.");
    }
    const result = await confirmImport(id, access.creator!.id, input);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ImportError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error("Calendar import confirmation failed", error);
    return NextResponse.json(
      {
        error:
          "Import could not be completed. No partial import was saved. Retry confirmation.",
      },
      { status: 500 },
    );
  }
}
