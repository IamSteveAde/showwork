"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, CloudOff } from "lucide-react";
import styles from "@/components/calendars/CalendarDashboard.module.css";

export default function CalendarsError({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm text-[#315e99]"><ArrowLeft size={16} aria-hidden="true" />Back to dashboard</Link>
        <section className={`${styles.empty} mt-8`} role="alert">
          <span className={styles.emptyIcon}><CloudOff size={28} aria-hidden="true" /></span>
          <h1 className="text-2xl font-medium tracking-tight">We couldn’t load your workspaces.</h1>
          <p>Please try again in a moment.</p>
          <button type="button" disabled={pending} onClick={() => startTransition(() => { router.refresh(); reset(); })} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1768E8] px-5 text-sm font-semibold text-white hover:bg-[#125CCF] disabled:opacity-60">
            <RefreshCw size={16} aria-hidden="true" className={pending ? "motion-safe:animate-spin" : ""} />{pending ? "Trying again…" : "Try again"}
          </button>
        </section>
      </div>
    </main>
  );
}
