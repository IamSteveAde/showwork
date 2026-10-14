/** Retired in the intended VPS release. External schedules must also be removed
 * after approval. This route performs no admission, database or provider I/O. */
import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "Publishing cron retired; canonical VPS ownership required", code: "PUBLISHING_HOST_RETIRED" }, { status: 410 });
}
