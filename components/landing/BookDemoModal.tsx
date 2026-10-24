
"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  LockKeyhole,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";

type BookDemoModalProps = {
  open: boolean;
  onClose: () => void;
};

type FormData = {
  fullName: string;
  email: string;
  company: string;
  teamSize: string;
  interest: string;
  preferredDate: string;
  preferredTime: string;
  timezone: string;
  website: string;
};

const TEAM_SIZES = [
  "Just me",
  "2–5 people",
  "6–20 people",
  "21+ people",
];

const INTERESTS = [
  "Marketing & Content Management",
  "AI Inbox & Automatic Replies",
  "Team Collaboration & Approvals",
  "Analytics & AI Recommendations",
  "Everything Showwork Offers",
];

const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function localDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;

  return `${hour}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatDate(value: string) {
  if (!value) return "";

  return parseDateKey(value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function createInitialForm(): FormData {
  return {
    fullName: "",
    email: "",
    company: "",
    teamSize: "",
    interest: "",
    preferredDate: "",
    preferredTime: "",
    timezone: getTimezone(),
    website: "",
  };
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-[12px] font-semibold text-[#203B36]"
    >
      {children}
      <span className="ml-1 text-[#155FC7]">*</span>
    </label>
  );
}

export default function BookDemoModal({
  open,
  onClose,
}: BookDemoModalProps) {
  const reducedMotion = useReducedMotion();
  const titleId = useId();
  const descriptionId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormData>(createInitialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const today = new Date();
  const todayKey = localDateKey(today);

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [visibleMonth]);

  const isCurrentMonth =
    visibleMonth.getFullYear() === today.getFullYear() &&
    visibleMonth.getMonth() === today.getMonth();

  function updateField<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function resetModal() {
    setStep(1);
    setForm(createInitialForm());
    setSubmitting(false);
    setError("");

    const current = new Date();
    setVisibleMonth(
      new Date(current.getFullYear(), current.getMonth(), 1)
    );
  }

  function closeModal() {
    if (submitting) return;
    onClose();
  }

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => closeButtonRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) return;

      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      );

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose, submitting]);

  function continueToCalendar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (
      !form.fullName.trim() ||
      !form.email.trim() ||
      !form.company.trim() ||
      !form.teamSize ||
      !form.interest
    ) {
      setError("Please complete all required fields.");
      return;
    }

    setStep(2);
  }

  async function submitBooking() {
    if (!form.preferredDate || !form.preferredTime) {
      setError("Please choose your preferred date and time.");
      return;
    }

    if (form.preferredDate < localDateKey(new Date())) {
      setError("Please choose a future date.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/book-demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "We couldn't submit your request."
        );
      }

      setStep(3);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence onExitComplete={resetModal}>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
        >
          {/* Backdrop */}
          <motion.button
            type="button"
            tabIndex={-1}
            aria-label="Close demo booking"
            className="absolute inset-0 cursor-default bg-[#081D1C]/75 backdrop-blur-[10px]"
            onClick={closeModal}
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            initial={
              reducedMotion
                ? false
                : { opacity: 0, y: 28, scale: 0.97 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 16, scale: 0.98 }
            }
            transition={{
              duration: reducedMotion ? 0 : 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative z-10 flex max-h-[min(92dvh,850px)] w-full max-w-[880px] flex-col overflow-hidden rounded-[26px] bg-[#FCFDFB] shadow-[0_35px_120px_rgba(0,0,0,0.28)] sm:rounded-[32px]"
          >
            {/* Top accent */}
            <div className="h-[5px] shrink-0 bg-gradient-to-r from-[#155FC7] via-[#6FA7F2] to-[#D8F3A5]" />

            {/* Close button */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeModal}
              disabled={submitting}
              aria-label="Close modal"
              className="absolute right-5 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-[#102A29]/10 bg-white text-[#102A29] transition hover:bg-[#F1F5F1] disabled:opacity-50 sm:right-7 sm:top-7"
            >
              <X size={18} />
            </button>

            <div className="overflow-y-auto overscroll-contain">
              <div className="grid min-h-[540px] lg:grid-cols-[0.39fr_0.61fr]">
                {/* Left editorial panel */}
                <div className="relative hidden overflow-hidden bg-[#102A29] p-9 text-white lg:flex lg:flex-col">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-32 -top-32 h-[320px] w-[320px] rounded-full border border-white/10"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-20 -top-20 h-[250px] w-[250px] rounded-full border border-white/10"
                  />

                  <div className="relative flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#D8F3A5]">
                    <Sparkles size={15} />
                    The Showwork experience
                  </div>

                  <div className="relative mt-20">
                    <p className="text-xs font-semibold text-[#D8F3A5]">
                      A better way to work starts here.
                    </p>

                    <h2 className="mt-5 text-[clamp(2.3rem,3vw,3.5rem)] font-semibold leading-[1.08] tracking-[-0.065em]">
                      Your team.
                      <br />
                      Your workflow.
                      <br />
                      <span className="font-[var(--font-fraunces)] italic font-normal text-[#D8F3A5]">
                        In sync.
                      </span>
                    </h2>

                    <p className="mt-6 max-w-[260px] text-sm leading-7 text-white/65">
                      See how your team can plan, collaborate,
                      publish, and engage from one intelligent
                      workspace.
                    </p>
                  </div>

                  <div className="relative mt-auto pt-12">
                    <div className="flex items-center gap-3 border-t border-white/15 pt-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D8F3A5] text-[#102A29]">
                        <UsersRound size={19} />
                      </div>
                      <p className="text-xs leading-5 text-white/75">
                        Built for the people
                        <br />
                        behind the marketing.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right form panel */}
                <div className="min-w-0 px-5 pb-7 pt-8 sm:px-9 sm:pb-9 sm:pt-10">
                  <div className="mb-7 pr-12">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#16834B]" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#155FC7]">
                        Book a Demo — Showwork
                      </span>
                    </div>

                    {step !== 3 && (
                      <>
                        <h2
                          id={titleId}
                          className="text-[clamp(1.85rem,3vw,2.65rem)] font-semibold leading-[1.1] tracking-[-0.055em] text-[#102A29]"
                        >
                          See Showwork{" "}
                          <span className="font-[var(--font-fraunces)] italic font-medium text-[#155FC7]">
                            in action.
                          </span>
                        </h2>

                        <p
                          id={descriptionId}
                          className="mt-3 max-w-[430px] text-[13px] leading-6 text-[#63736F] sm:text-sm"
                        >
                          Tell us a little about your team. We'll
                          show you how Showwork can make your work
                          easier.
                        </p>
                      </>
                    )}
                  </div>

                  {step !== 3 && (
                    <div className="mb-7 flex items-center gap-3">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                          step >= 1
                            ? "bg-[#155FC7] text-white"
                            : "bg-[#E9EFEC] text-[#64736E]"
                        }`}
                      >
                        {step > 1 ? <Check size={14} /> : "1"}
                      </div>
                      <span className="text-xs font-semibold text-[#102A29]">
                        Your details
                      </span>

                      <div className="h-px flex-1 bg-[#DCE6E0]" />

                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                          step === 2
                            ? "bg-[#155FC7] text-white"
                            : "bg-[#E9EFEC] text-[#64736E]"
                        }`}
                      >
                        2
                      </div>
                      <span className="text-xs font-semibold text-[#64736E]">
                        Date & time
                      </span>
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {step === 1 && (
                      <motion.form
                        key="details"
                        onSubmit={continueToCalendar}
                        initial={
                          reducedMotion
                            ? false
                            : { opacity: 0, x: -12 }
                        }
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{
                          duration: reducedMotion ? 0 : 0.22,
                        }}
                        className="space-y-4"
                      >
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <FieldLabel htmlFor="demo-full-name">
                              Full Name
                            </FieldLabel>
                            <input
                              id="demo-full-name"
                              type="text"
                              autoComplete="name"
                              placeholder="Your full name"
                              required
                              maxLength={120}
                              value={form.fullName}
                              onChange={(event) =>
                                updateField(
                                  "fullName",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-xl border border-[#DFE7E2] bg-white px-4 py-3 text-sm text-[#102A29] outline-none transition placeholder:text-[#A1ADA7] focus:border-[#155FC7] focus:ring-2 focus:ring-[#155FC7]/10"
                            />
                          </div>

                          <div>
                            <FieldLabel htmlFor="demo-email">
                              Work Email
                            </FieldLabel>
                            <input
                              id="demo-email"
                              type="email"
                              autoComplete="email"
                              placeholder="you@company.com"
                              required
                              maxLength={254}
                              value={form.email}
                              onChange={(event) =>
                                updateField(
                                  "email",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-xl border border-[#DFE7E2] bg-white px-4 py-3 text-sm text-[#102A29] outline-none transition placeholder:text-[#A1ADA7] focus:border-[#155FC7] focus:ring-2 focus:ring-[#155FC7]/10"
                            />
                          </div>
                        </div>

                        <div>
                          <FieldLabel htmlFor="demo-company">
                            Company / Business Name
                          </FieldLabel>
                          <input
                            id="demo-company"
                            type="text"
                            autoComplete="organization"
                            placeholder="Your company name"
                            required
                            maxLength={150}
                            value={form.company}
                            onChange={(event) =>
                              updateField(
                                "company",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-[#DFE7E2] bg-white px-4 py-3 text-sm text-[#102A29] outline-none transition placeholder:text-[#A1ADA7] focus:border-[#155FC7] focus:ring-2 focus:ring-[#155FC7]/10"
                          />
                        </div>

                        <div>
                          <FieldLabel htmlFor="demo-team-size">
                            How big is your team?
                          </FieldLabel>
                          <select
                            id="demo-team-size"
                            required
                            value={form.teamSize}
                            onChange={(event) =>
                              updateField(
                                "teamSize",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-[#DFE7E2] bg-white px-4 py-3 text-sm text-[#102A29] outline-none transition focus:border-[#155FC7] focus:ring-2 focus:ring-[#155FC7]/10"
                          >
                            <option value="" disabled>
                              Select team size
                            </option>
                            {TEAM_SIZES.map((size) => (
                              <option key={size} value={size}>
                                {size}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <FieldLabel htmlFor="demo-interest">
                            What would you like to explore?
                          </FieldLabel>
                          <select
                            id="demo-interest"
                            required
                            value={form.interest}
                            onChange={(event) =>
                              updateField(
                                "interest",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-[#DFE7E2] bg-white px-4 py-3 text-sm text-[#102A29] outline-none transition focus:border-[#155FC7] focus:ring-2 focus:ring-[#155FC7]/10"
                          >
                            <option value="" disabled>
                              Select an area of interest
                            </option>
                            {INTERESTS.map((interest) => (
                              <option
                                key={interest}
                                value={interest}
                              >
                                {interest}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Hidden honeypot */}
                        <div
                          className="absolute -left-[9999px]"
                          aria-hidden="true"
                        >
                          <input
                            type="text"
                            tabIndex={-1}
                            autoComplete="off"
                            value={form.website}
                            onChange={(event) =>
                              updateField(
                                "website",
                                event.target.value
                              )
                            }
                          />
                        </div>

                        {error && (
                          <p
                            role="alert"
                            className="text-xs text-red-600"
                          >
                            {error}
                          </p>
                        )}

                        <button
                          type="submit"
                          className="group mt-2 flex w-full items-center justify-center gap-3 rounded-full bg-[#155FC7] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#104CA1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155FC7]"
                        >
                          Continue to Calendar
                          <ArrowRight
                            size={17}
                            className="transition-transform group-hover:translate-x-1"
                          />
                        </button>

                        <p className="flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-[#83918B]">
                          <LockKeyhole size={12} />
                          A quick, personalised walkthrough.
                          No commitment required.
                        </p>
                      </motion.form>
                    )}

                    {step === 2 && (
                      <motion.div
                        key="calendar"
                        initial={
                          reducedMotion
                            ? false
                            : { opacity: 0, x: 12 }
                        }
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{
                          duration: reducedMotion ? 0 : 0.22,
                        }}
                      >
                        <div className="mb-5 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[#102A29]">
                              Choose your preferred date
                            </p>
                            <p className="mt-1 text-xs text-[#82918A]">
                              We'll confirm availability by email.
                            </p>
                          </div>

                          <CalendarDays
                            size={20}
                            className="text-[#155FC7]"
                          />
                        </div>

                        <div className="rounded-2xl border border-[#E2EAE5] bg-white p-4">
                          <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm font-bold text-[#102A29]">
                              {visibleMonth.toLocaleDateString(
                                "en-US",
                                {
                                  month: "long",
                                  year: "numeric",
                                }
                              )}
                            </p>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={isCurrentMonth}
                                onClick={() =>
                                  setVisibleMonth(
                                    new Date(
                                      visibleMonth.getFullYear(),
                                      visibleMonth.getMonth() - 1,
                                      1
                                    )
                                  )
                                }
                                aria-label="Previous month"
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E4EAE5] disabled:opacity-30"
                              >
                                <ChevronLeft size={16} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setVisibleMonth(
                                    new Date(
                                      visibleMonth.getFullYear(),
                                      visibleMonth.getMonth() + 1,
                                      1
                                    )
                                  )
                                }
                                aria-label="Next month"
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E4EAE5]"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-7 gap-1">
                            {WEEKDAYS.map((day) => (
                              <div
                                key={day}
                                className="py-2 text-center text-[10px] font-bold text-[#92A09A]"
                              >
                                {day}
                              </div>
                            ))}

                            {calendarDays.map((day, index) => {
                              if (day === null) {
                                return (
                                  <div key={`empty-${index}`} />
                                );
                              }

                              const date = new Date(
                                visibleMonth.getFullYear(),
                                visibleMonth.getMonth(),
                                day
                              );

                              const dateKey = localDateKey(date);
                              const isPast = dateKey < todayKey;
                              const isSelected =
                                form.preferredDate === dateKey;

                              return (
                                <button
                                  key={dateKey}
                                  type="button"
                                  disabled={isPast}
                                  onClick={() =>
                                    updateField(
                                      "preferredDate",
                                      dateKey
                                    )
                                  }
                                  aria-pressed={isSelected}
                                  className={`flex aspect-square items-center justify-center rounded-xl text-xs font-semibold transition ${
                                    isSelected
                                      ? "bg-[#155FC7] text-white shadow-[0_4px_12px_rgba(21,95,199,0.25)]"
                                      : isPast
                                      ? "cursor-not-allowed text-[#C5CDC8]"
                                      : "text-[#29413A] hover:bg-[#EAF2FF]"
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="mt-5">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-semibold text-[#102A29]">
                              Preferred time
                            </p>

                            <span className="flex items-center gap-1 text-[11px] text-[#81918A]">
                              <Clock3 size={13} />
                              {form.timezone}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {TIME_SLOTS.map((time) => {
                              const selected =
                                form.preferredTime === time;

                              return (
                                <button
                                  key={time}
                                  type="button"
                                  aria-pressed={selected}
                                  onClick={() =>
                                    updateField(
                                      "preferredTime",
                                      time
                                    )
                                  }
                                  className={`rounded-xl border px-2 py-3 text-xs font-semibold transition ${
                                    selected
                                      ? "border-[#155FC7] bg-[#EAF2FF] text-[#155FC7]"
                                      : "border-[#E2EAE5] bg-white text-[#50645B] hover:border-[#155FC7]/40"
                                  }`}
                                >
                                  {formatTime(time)}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {error && (
                          <p
                            role="alert"
                            className="mt-4 text-xs text-red-600"
                          >
                            {error}
                          </p>
                        )}

                        <div className="mt-6 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setStep(1);
                              setError("");
                            }}
                            disabled={submitting}
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#DCE5DF] text-[#102A29] transition hover:bg-[#F1F5F1]"
                            aria-label="Back to details"
                          >
                            <ArrowLeft size={18} />
                          </button>

                          <button
                            type="button"
                            onClick={submitBooking}
                            disabled={
                              submitting ||
                              !form.preferredDate ||
                              !form.preferredTime
                            }
                            className="flex h-12 flex-1 items-center justify-center gap-3 rounded-full bg-[#155FC7] px-5 text-sm font-semibold text-white transition hover:bg-[#104CA1] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {submitting ? (
                              <>
                                <Loader2
                                  size={17}
                                  className="animate-spin"
                                />
                                Sending request...
                              </>
                            ) : (
                              <>
                                Book My Demo
                                <ArrowRight size={17} />
                              </>
                            )}
                          </button>
                        </div>

                        <p className="mt-4 text-center text-[11px] leading-5 text-[#83918B]">
                          Your requested time is subject to
                          confirmation.
                        </p>
                      </motion.div>
                    )}

                    {step === 3 && (
                      <motion.div
                        key="success"
                        initial={
                          reducedMotion
                            ? false
                            : { opacity: 0, y: 16 }
                        }
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: reducedMotion ? 0 : 0.3,
                        }}
                        className="flex min-h-[400px] flex-col items-center justify-center py-8 text-center"
                      >
                        <motion.div
                          initial={
                            reducedMotion
                              ? false
                              : { scale: 0.6, opacity: 0 }
                          }
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 220,
                            damping: 16,
                          }}
                          className="flex h-20 w-20 items-center justify-center rounded-[25px] bg-[#E7F7E5] text-[#16834B]"
                        >
                          <CheckCircle2 size={38} />
                        </motion.div>

                        <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.18em] text-[#155FC7]">
                          Request received
                        </p>

                        <h2
                          id={titleId}
                          className="mt-3 text-3xl font-semibold tracking-[-0.055em] text-[#102A29]"
                        >
                          You're on your way.
                        </h2>

                        <p
                          id={descriptionId}
                          className="mt-4 max-w-sm text-sm leading-7 text-[#66766E]"
                        >
                          Thanks, {form.fullName.split(" ")[0]}!
                          We've received your request. Our team
                          will confirm the meeting details by
                          email.
                        </p>

                        <div className="mt-7 w-full max-w-sm rounded-2xl border border-[#E1EAE3] bg-white p-5 text-left">
                          <div className="flex items-center gap-3">
                            <CalendarDays
                              size={19}
                              className="text-[#155FC7]"
                            />
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A9890]">
                                Requested date
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#102A29]">
                                {formatDate(form.preferredDate)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center gap-3 border-t border-[#EEF2EF] pt-4">
                            <Clock3
                              size={19}
                              className="text-[#155FC7]"
                            />
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A9890]">
                                Requested time
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#102A29]">
                                {formatTime(form.preferredTime)}
                                {" · "}
                                {form.timezone}
                              </p>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={closeModal}
                          className="mt-7 flex items-center gap-2 rounded-full bg-[#102A29] px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1B4540]"
                        >
                          Done
                          <Check size={16} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
