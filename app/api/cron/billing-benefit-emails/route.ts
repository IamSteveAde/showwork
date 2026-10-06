import { NextRequest, NextResponse } from "next/server";
import { deliverBenefitEmails } from "@/lib/billingBenefitNotifications";
export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const summary = await deliverBenefitEmails();
    return NextResponse.json(summary, { status: summary.failed ? 503 : 200 });
  } catch {
    return NextResponse.json({ error: "Email queue processing failed; saved messages will retry." }, { status: 503 });
  }
}
