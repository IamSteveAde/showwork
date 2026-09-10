"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CalendarPaymentCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"checking" | "done" | "failed" | null>(null);
  // Distinguishes which subscription this run is actually confirming,
  // purely so the message below reads correctly — the underlying
  // check/confirm logic for each is otherwise independent.
  const [kind, setKind] = useState<"calendar" | "ai" | null>(null);

  useEffect(() => {
    const isCalendarCallback = searchParams.get("subscriptionPayment") === "callback";
    const calendarId = searchParams.get("calendarId");
    const isAiCallback = searchParams.get("aiAssistantPayment") === "callback";

    if (isCalendarCallback && calendarId) {
      setKind("calendar");
      setStatus("checking");
      fetch(`/api/calendars/${calendarId}/verify-subscription`, { method: "POST" })
        .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
        .then(({ ok }) => {
          setStatus(ok ? "done" : "failed");
          if (ok) router.refresh();
        })
        .catch(() => setStatus("failed"));
      return;
    }

    if (isAiCallback) {
      // Account-level — no id needed, the route checks the logged-in
      // session's own pending reference directly.
      setKind("ai");
      setStatus("checking");
      fetch(`/api/ai-assistant/verify-subscription`, { method: "POST" })
        .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
          const confirmed = ok && data?.billingStatus === "ACTIVE";
          setStatus(confirmed ? "done" : "failed");
          if (confirmed) router.refresh();
        })
        .catch(() => setStatus("failed"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!status) return null;

  const subjectLabel = kind === "ai" ? "AI content assistant" : "calendar";

  return (
    <div
      className="mb-6 rounded-xl p-4 text-sm"
      style={{
        background: status === "failed" ? "rgba(239,68,68,0.1)" : "rgba(74,222,128,0.1)",
        color: status === "failed" ? "#F87171" : "#4ade80",
      }}
    >
      {status === "checking" && "Confirming your payment..."}
      {status === "done" && `Payment confirmed — your ${subjectLabel} is now active.`}
      {status === "failed" && "We couldn't confirm this payment yet. If it went through, refresh this page in a moment."}
    </div>
  );
}