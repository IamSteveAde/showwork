"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Role = "VIEW_ONLY" | "ADD_CONTENT" | "EDIT_CALENDAR";

interface CollaboratorRow {
  id: string;
  name: string | null;
  email: string;
  role: Role;
}

interface PendingInviteRow {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
}

const ROLES: {
  value: Role;
  label: string;
  description: string;
  color: string;
  icon: string;
}[] = [
  {
    value: "VIEW_ONLY",
    label: "View only",
    description: "Can view the workspace and content, but cannot make changes.",
    color: "#667085",
    icon: "M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z",
  },
  {
    value: "ADD_CONTENT",
    label: "Add content",
    description: "Can upload images and videos to planned posts. Best for designers and creators.",
    color: "#2478FF",
    icon: "M12 16V4M7.5 8.5 12 4l4.5 4.5M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5",
  },
  {
    value: "EDIT_CALENDAR",
    label: "Edit workspace",
    description: "Can create, edit and delete posts and change workspace details.",
    color: "#F97316",
    icon: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  },
];

function roleLabel(role: Role): string {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

function roleColor(role: Role): string {
  return ROLES.find((r) => r.value === role)?.color ?? "#667085";
}

function RoleIcon({
  role,
  size = 18,
}: {
  role: Role;
  size?: number;
}) {
  const config = ROLES.find((r) => r.value === role) ?? ROLES[0];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d={config.icon} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M20 21a8 8 0 0 0-16 0" strokeLinecap="round" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M5 12h13M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4">
      <path d="m5 12.5 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
      aria-hidden="true"
    />
  );
}

export default function InviteCollaboratorForm({
  calendarId,
}: {
  calendarId: string;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("ADD_CONTENT");
  const [loading, setLoading] = useState(false);
  const [sentRole, setSentRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInviteRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const inviteRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const loadPeople = useCallback(async () => {
    setLoadingList(true);

    try {
      const res = await fetch(`/api/calendars/${calendarId}/invites`, {
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        setCollaborators(data.collaborators ?? []);
        setPendingInvites(data.pendingInvites ?? []);
      }
    } catch {
      // Keep the current UI intact if the list request temporarily fails.
    } finally {
      setLoadingList(false);
    }
  }, [calendarId]);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  const focusInvite = () => {
    inviteRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    window.setTimeout(() => emailRef.current?.focus(), 350);
  };

  const submit = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || loading) return;

    setLoading(true);
    setError(null);
    setSentRole(null);
    setRequiresUpgrade(false);

    try {
      const res = await fetch(`/api/calendars/${calendarId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          role,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSentRole((data.role as Role) ?? role);
        setEmail("");
        setRole("ADD_CONTENT");
        await loadPeople();
      } else {
        setError(data.error ?? "Failed to send invite");
        setRequiresUpgrade(!!data.requiresUpgrade);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const upgradeToCompany = async () => {
    setUpgrading(true);
    setError(null);

    try {
      const res = await fetch("/api/calendars/upgrade-to-company", {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data.authorizationUrl) {
          window.location.href = data.authorizationUrl;
        } else {
          window.location.reload();
        }
      } else {
        setError(data.error ?? "Failed to upgrade — try again");
        setUpgrading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setUpgrading(false);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    setRemovingId(inviteId);

    try {
      const res = await fetch(
        `/api/calendars/${calendarId}/invites/${inviteId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
      }
    } finally {
      setRemovingId(null);
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    setRemovingId(collaboratorId);

    try {
      const res = await fetch(
        `/api/calendars/${calendarId}/collaborators/${collaboratorId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId));
      }
    } finally {
      setRemovingId(null);
    }
  };

  const totalPeople = collaborators.length + pendingInvites.length;

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          HEADER
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DCE7FF] bg-[#F4F7FF] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2478FF]">
              Collaboration
            </span>
          </div>

          <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[#101828] sm:text-[32px]">
            The people behind the work.
          </h2>

          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#667085]">
            Bring designers, creators and trusted teammates into this workspace.
            Give each person exactly the access they need.
          </p>
        </div>

        <button
  type="button"
  onClick={focusInvite}
  className="inline-flex h-12 min-w-[190px] shrink-0 items-center justify-center gap-2.5 rounded-xl bg-[#101828] px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(16,24,40,0.14)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#182230] hover:shadow-[0_12px_30px_rgba(16,24,40,0.18)] focus:outline-none focus:ring-4 focus:ring-[#2478FF]/15"
>
  <PlusIcon />
  Invite collaborator
  <ArrowIcon />
</button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          QUICK STATS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#E6EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(16,24,40,0.035)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">
              Active
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECFDF3] text-[#12B76A]">
              <UserIcon />
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#101828]">
            {loadingList ? "—" : collaborators.length}
          </p>
          <p className="mt-1 text-xs text-[#98A2B3]">people with access</p>
        </div>

        <div className="rounded-2xl border border-[#E6EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(16,24,40,0.035)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">
              Pending
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF7ED] text-[#F97316]">
              <ClockIcon />
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#101828]">
            {loadingList ? "—" : pendingInvites.length}
          </p>
          <p className="mt-1 text-xs text-[#98A2B3]">awaiting acceptance</p>
        </div>

        <div className="col-span-2 rounded-2xl border border-[#E6EAF0] bg-[#F8FAFC] p-4 shadow-[0_8px_30px_rgba(16,24,40,0.025)] lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF2FF] text-[#2478FF]">
              <MailIcon />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#101828]">
                Simple access
              </p>
              <p className="mt-0.5 text-xs text-[#667085]">
                Invite by email, assign a role.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MAIN GRID
      ───────────────────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        {/* INVITE PANEL — ALWAYS VISIBLE */}
        <section
          ref={inviteRef}
          className="overflow-hidden rounded-[26px] border border-[#DDE4EE] bg-white shadow-[0_18px_55px_rgba(16,24,40,0.06)]"
        >
          <div className="relative overflow-hidden border-b border-[#E9EDF3] bg-[#F8FAFC] px-6 py-6 sm:px-7">
            <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#2478FF]/[0.08] blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-90px] left-[-40px] h-40 w-40 rounded-full bg-[#7C3AED]/[0.05] blur-3xl" />

            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#101828] text-white shadow-[0_8px_20px_rgba(16,24,40,0.14)]">
                  <PlusIcon />
                </div>
                <div>
                  <p className="text-[17px] font-semibold tracking-[-0.02em] text-[#101828]">
                    Add someone to the workspace
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-[#667085]">
                    They&apos;ll receive an email with a secure invitation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6 sm:p-7">
            {/* EMAIL */}
            <div>
             <label
  htmlFor="collaborator-email"
  className="mb-2.5 block text-sm font-semibold tracking-[-0.01em] text-[#101828]"
>
  Email address
</label>

              <div className="group relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#98A2B3] transition group-focus-within:text-[#2478FF]">
                  <MailIcon />
                </span>

                <input
                  ref={emailRef}
                  id="collaborator-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                    setSentRole(null);
                    setRequiresUpgrade(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && email.trim()) submit();
                  }}
                  placeholder="designer@studio.com"
                  autoComplete="email"
                  className="h-16 w-full rounded-2xl border border-[#D8E0EA] bg-white pl-12 pr-4 text-[15px] text-[#101828] outline-none transition placeholder:text-[#98A2B3] hover:border-[#C5CFDC] focus:border-[#2478FF] focus:ring-4 focus:ring-[#2478FF]/10"
                />
              </div>
            </div>

            {/* ROLE */}
            <div>
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.11em] text-[#667085]">
                    Permission level
                  </p>
                  <p className="mt-1 text-xs text-[#98A2B3]">
                    You can change this before sending.
                  </p>
                </div>
                <span className="hidden text-xs font-medium text-[#2478FF] sm:block">
                  {roleLabel(role)}
                </span>
              </div>

              <div className="space-y-2.5">
                {ROLES.map((r) => {
                  const selected = role === r.value;

                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => {
                        setRole(r.value);
                        setSentRole(null);
                        setError(null);
                      }}
                      className="group flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition duration-200 focus:outline-none focus:ring-4 focus:ring-[#2478FF]/10"
                      style={{
                        borderColor: selected ? `${r.color}66` : "#E6EAF0",
                        background: selected ? `${r.color}08` : "#FFFFFF",
                        boxShadow: selected
                          ? `0 8px 24px ${r.color}10`
                          : "none",
                      }}
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition"
                        style={{
                          background: selected ? `${r.color}16` : "#F2F4F7",
                          color: selected ? r.color : "#667085",
                        }}
                      >
                        <RoleIcon role={r.value} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-[#101828]">
                            {r.label}
                          </span>

                          {r.value === "ADD_CONTENT" && (
                            <span className="rounded-full bg-[#EAF2FF] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#2478FF]">
                              Recommended
                            </span>
                          )}
                        </span>

                        <span className="mt-1 block text-xs leading-5 text-[#667085]">
                          {r.description}
                        </span>
                      </span>

                      <span
                        className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition"
                        style={{
                          borderColor: selected ? r.color : "#D0D5DD",
                          background: selected ? r.color : "transparent",
                        }}
                      >
                        {selected && <CheckIcon />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {role === "EDIT_CALENDAR" && (
                <div className="mt-3 rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] p-3.5">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F97316] text-[10px] font-bold text-white">
                      !
                    </span>
                    <p className="text-xs leading-5 text-[#9A3412]">
                      This is the highest permission level. Only give it to
                      someone you fully trust because they can delete posts and
                      edit workspace details.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* RESULT / ERROR */}
            {sentRole && (
              <div className="flex items-start gap-3 rounded-2xl border border-[#ABEFC6] bg-[#ECFDF3] p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#12B76A] text-white">
                  <CheckIcon />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#067647]">
                    Invitation sent
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-[#027A48]">
                    They were invited with{" "}
                    <strong>{roleLabel(sentRole)}</strong> access.
                  </p>
                </div>
              </div>
            )}

            {requiresUpgrade ? (
              <div className="rounded-2xl border border-[#C7D7FE] bg-[#F4F7FF] p-4.5">
                <p className="text-sm font-semibold text-[#101828]">
                  Unlock team collaboration
                </p>
                <p className="mt-1.5 text-xs leading-5 text-[#667085]">
                  Your account is on Individual. Switch to Company
                  (₦15,000/month) to invite up to 10 people with role-based
                  permissions.
                </p>
                <button
                  type="button"
                  onClick={upgradeToCompany}
                  disabled={upgrading}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#2478FF] px-4 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(36,120,255,0.2)] transition hover:bg-[#1769EA] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {upgrading ? <Spinner /> : null}
                  {upgrading ? "Switching..." : "Switch to Company"}
                  {!upgrading && <ArrowIcon />}
                </button>
              </div>
            ) : (
              error && (
                <div className="rounded-2xl border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3.5 text-xs leading-5 text-[#B42318]">
                  {error}
                </div>
              )
            )}

            {/* SEND */}
            <button
              type="button"
              onClick={submit}
              disabled={loading || !email.trim()}
              className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#101828] text-sm font-semibold text-white shadow-[0_12px_28px_rgba(16,24,40,0.14)] transition hover:-translate-y-0.5 hover:bg-[#182230] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {loading ? <Spinner /> : <MailIcon />}
              {loading ? "Sending invitation..." : "Send invitation"}
              {!loading && (
                <span className="ml-1 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-80">
                  <ArrowIcon />
                </span>
              )}
            </button>

            <p className="text-center text-[11px] leading-5 text-[#98A2B3]">
              Invitations are sent securely by email. You can revoke a pending
              invitation at any time.
            </p>
          </div>
        </section>

        {/* PEOPLE PANEL */}
        <section className="min-w-0 rounded-[26px] border border-[#DDE4EE] bg-white shadow-[0_18px_55px_rgba(16,24,40,0.045)]">
          <div className="flex flex-col gap-4 border-b border-[#E9EDF3] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-[18px] font-semibold tracking-[-0.025em] text-[#101828]">
                  Workspace access
                </h3>
                <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-bold text-[#667085]">
                  {totalPeople}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#98A2B3]">
                Everyone who can access this client workspace.
              </p>
            </div>

            <button
              type="button"
              onClick={loadPeople}
              disabled={loadingList}
              className="self-start rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#667085] transition hover:bg-[#F2F4F7] hover:text-[#101828] disabled:opacity-50 sm:self-auto"
            >
              {loadingList ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <div className="p-4 sm:p-5">
            {loadingList ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex animate-pulse items-center gap-3 rounded-2xl border border-[#EEF1F5] p-4"
                  >
                    <div className="h-10 w-10 rounded-xl bg-[#F2F4F7]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 rounded bg-[#F2F4F7]" />
                      <div className="h-2.5 w-48 rounded bg-[#F2F4F7]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : collaborators.length === 0 && pendingInvites.length === 0 ? (
              <div className="flex min-h-[330px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#D8E0EA] bg-[#FAFBFC] px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF2FF] text-[#2478FF]">
                  <UserIcon />
                </div>
                <h4 className="mt-5 text-base font-semibold text-[#101828]">
                  Your team starts here.
                </h4>
                <p className="mt-2 max-w-sm text-xs leading-5 text-[#667085]">
                  Invite the designer, strategist or creator working on this
                  client and give them the right level of access.
                </p>
                <button
                  type="button"
                  onClick={focusInvite}
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#2478FF] px-4 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(36,120,255,0.18)] transition hover:bg-[#1769EA]"
                >
                  <PlusIcon />
                  Add your first collaborator
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {collaborators.length > 0 && (
                  <div>
                    <div className="mb-2.5 flex items-center justify-between px-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
                        People with access
                      </p>
                      <span className="text-[10px] font-medium text-[#98A2B3]">
                        {collaborators.length}{" "}
                        {collaborators.length === 1 ? "person" : "people"}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {collaborators.map((c) => {
                        const color = roleColor(c.role);

                        return (
                          <div
                            key={c.id}
                            className="group flex items-center gap-3 rounded-2xl border border-[#E8ECF2] bg-white p-3.5 transition hover:border-[#D6DEE9] hover:shadow-[0_8px_25px_rgba(16,24,40,0.045)]"
                          >
                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                              style={{
                                background: `${color}12`,
                                color,
                              }}
                            >
                              {(c.name || c.email).slice(0, 1).toUpperCase()}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#101828]">
                                {c.name || c.email}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-[#98A2B3]">
                                {c.email}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <span
                                className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold sm:inline-flex"
                                style={{
                                  background: `${color}12`,
                                  color,
                                }}
                              >
                                <RoleIcon role={c.role} size={12} />
                                {roleLabel(c.role)}
                              </span>

                              <div className="relative">
                                <button
                                  type="button"
                                  aria-label={`Remove ${c.name || c.email}`}
                                  onClick={() => removeCollaborator(c.id)}
                                  disabled={removingId === c.id}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[#98A2B3] transition hover:bg-[#FEF3F2] hover:text-[#B42318] disabled:opacity-40"
                                >
                                  {removingId === c.id ? (
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#D0D5DD] border-t-[#B42318]" />
                                  ) : (
                                    <MoreIcon />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {pendingInvites.length > 0 && (
                  <div>
                    <div className="mb-2.5 flex items-center justify-between px-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
                        Pending invitations
                      </p>
                      <span className="text-[10px] font-medium text-[#98A2B3]">
                        {pendingInvites.length} waiting
                      </span>
                    </div>

                    <div className="space-y-2">
                      {pendingInvites.map((invite) => {
                        const color = roleColor(invite.role);

                        return (
                          <div
                            key={invite.id}
                            className="flex items-center gap-3 rounded-2xl border border-dashed border-[#D8E0EA] bg-[#FAFBFC] p-3.5"
                          >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF7ED] text-[#F97316]">
                              <ClockIcon />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#101828]">
                                {invite.email}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold"
                                  style={{
                                    background: `${color}12`,
                                    color,
                                  }}
                                >
                                  <RoleIcon role={invite.role} size={10} />
                                  {roleLabel(invite.role)}
                                </span>
                                <span className="text-[10px] text-[#98A2B3]">
                                  Awaiting acceptance
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => revokeInvite(invite.id)}
                              disabled={removingId === invite.id}
                              className="shrink-0 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-[#98A2B3] transition hover:bg-[#FEF3F2] hover:text-[#B42318] disabled:opacity-40"
                            >
                              {removingId === invite.id ? "Revoking…" : "Revoke"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl bg-[#F8FAFC] px-4 py-3.5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#667085] shadow-sm">
                      <CheckIcon />
                    </div>
                    <p className="text-[11px] leading-5 text-[#667085]">
                      Permissions are applied per person. You can remove a
                      collaborator or revoke an invitation whenever you need
                      to.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
