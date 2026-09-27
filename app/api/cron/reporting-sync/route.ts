import { NextRequest, NextResponse } from "next/server";
import { syncConnectedSocialReporting } from "@/lib/reporting/sync";

export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await syncConnectedSocialReporting();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Social reporting sync job failed:", error);
    return NextResponse.json({ error: "Reporting sync could not be completed." }, { status: 500 });
  }
}
