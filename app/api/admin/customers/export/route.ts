import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { customerFilters } from "@/lib/adminCustomerFilters";
import { customerCte, customerRows } from "@/lib/adminCustomers";
import { csvCell, customerCsvHeader, customerCsvRow } from "@/lib/customerCsv";
export const maxDuration = 60;
export async function GET(req: NextRequest) {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filters = customerFilters(Object.fromEntries(req.nextUrl.searchParams));
  if (filters.error)
    return NextResponse.json({ error: filters.error }, { status: 400 });
  const cte = await customerCte(filters);
  const encoder = new TextEncoder();
  let offset = 0,
    header = false;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (!header) {
          controller.enqueue(
            encoder.encode(
              "\uFEFF" + customerCsvHeader.map(csvCell).join(",") + "\r\n",
            ),
          );
          header = true;
        }
        const rows = await customerRows(cte, filters.sort, 400, offset);
        if (rows.length)
          controller.enqueue(
            encoder.encode(rows.map(customerCsvRow).join("\r\n") + "\r\n"),
          );
        offset += rows.length;
        if (rows.length < 400) controller.close();
      } catch (error) {
        console.error("Customer CSV export failed", error);
        controller.error(error);
      }
    },
  });
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="showwork-customers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
