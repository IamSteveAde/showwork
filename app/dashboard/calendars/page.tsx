import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import CreateCalendarForm from "@/components/calendars/CreateCalendarForm";
import CalendarPaymentCallbackHandler from "@/components/calendars/CalendarPaymentCallbackHandler";

const COLOR = { black: "#0A0A0A", blue: "#2478FF", charcoal: "#1A1A1A" };

const PLAN_STATUS_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  BUILDING: { text: "Building", color: "#888786", bg: "rgba(136,135,134,0.15)" },
  AWAITING_APPROVAL: { text: "Awaiting plan approval", color: "#FFCC00", bg: "rgba(255,204,0,0.12)" },
  PLAN_APPROVED: { text: "Plan approved", color: "#4ade80", bg: "rgba(74,222,128,0.15)" },
  PLAN_NEEDS_CHANGES: { text: "Plan needs changes", color: "#F97316", bg: "rgba(249,115,22,0.15)" },
};

export default async function CalendarsPage() {
  const creator = await getCurrentCreator();
  if (!creator) redirect("/login");

  const calendars = await db.socialCalendar.findMany({
    where: { managerId: creator.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { posts: true } } },
  });

  return (
    <main className="min-h-screen px-6 py-12 md:px-20" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white">
          ← Back to dashboard
        </Link>

        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.1em" }}>
          Social calendars
        </p>
        <h1 className="mb-8 text-3xl font-bold text-white">Your client calendars</h1>

        <Suspense fallback={null}>
          <CalendarPaymentCallbackHandler />
        </Suspense>

        <div className="mb-8">
          <CreateCalendarForm />
        </div>

        {calendars.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {calendars.map((cal) => {
              const status = PLAN_STATUS_LABEL[cal.planStatus];
              return (
                <Link
                  key={cal.id}
                  href={`/dashboard/calendars/${cal.id}`}
                  className="flex flex-col gap-3 rounded-xl p-6 transition-all hover:-translate-y-0.5"
                  style={{ background: COLOR.charcoal }}
                >
                  {cal.billingStatus === "PENDING_SETUP" ? (
                    <span
                      className="w-fit rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ color: "#F87171", background: "rgba(239,68,68,0.12)" }}
                    >
                      Payment not completed
                    </span>
                  ) : cal.billingStatus === "OFFLINE" ? (
                    <span
                      className="w-fit rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ color: "#F87171", background: "rgba(239,68,68,0.12)" }}
                    >
                      Offline — payment failed
                    </span>
                  ) : (
                    <span
                      className="w-fit rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ color: status.color, background: status.bg }}
                    >
                      {status.text}
                    </span>
                  )}
                  <p className="text-lg font-semibold text-white">{cal.clientName}</p>
                  <p className="text-xs text-white/40">
                    {cal._count.posts} post{cal._count.posts === 1 ? "" : "s"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}