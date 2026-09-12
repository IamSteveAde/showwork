"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";

type Role = "VIEW_ONLY" | "ADD_CONTENT" | "EDIT_CALENDAR";

type Collaborator = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
};

type PendingInvite = {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
};

const ROLES: {
  value: Role;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    value: "VIEW_ONLY",
    label: "View only",
    description: "Can review the workspace without changing anything.",
    color: "#667085",
  },
  {
    value: "ADD_CONTENT",
    label: "Add content",
    description: "Can upload creative to planned content.",
    color: "#2478FF",
  },
  {
    value: "EDIT_CALENDAR",
    label: "Edit workspace",
    description: "Can manage posts and workspace details.",
    color: "#F97316",
  },
];

function roleConfig(role: Role) {
  return ROLES.find((item) => item.value === role) ?? ROLES[0];
}

function PeopleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.4-3.4 2.2-5.2 5.5-5.2s5.1 1.8 5.5 5.2" />
      <path d="M16 6.2a2.7 2.7 0 0 1 0 5.2M17 14.2c2.1.7 3.4 2.2 3.7 4.8" />
    </svg>
  );
}

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function XIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M9 7V4.5h6V7" />
      <path d="m6.5 7 .8 12h9.4l.8-12" />
      <path d="M10 11v4.5M14 11v4.5" />
    </svg>
  );
}

function MailIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <path d="m4.5 7 7.5 5.5L19.5 7" />
    </svg>
  );
}

function Spinner({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 ${
        dark
          ? "border-[#D0D5DD] border-t-[#344054]"
          : "border-white/30 border-t-white"
      }`}
      aria-hidden="true"
    />
  );
}

export default function CalendarPeopleManager({
  calendarId,
  calendarName,
  totalMembers,
}: {
  calendarId: string;
  calendarName: string;
  totalMembers: number;
}) {
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("ADD_CONTENT");

  const [loadingList, setLoadingList] = useState(false);
  const [sending, setSending] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const loadPeople = async () => {
    setLoadingList(true);

    try {
      const res = await fetch(`/api/calendars/${calendarId}/invites`, {
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Couldn't load workspace people.");
        return;
      }

      setCollaborators(data.collaborators ?? []);
      setPendingInvites(data.pendingInvites ?? []);
    } catch {
      setError("Couldn't load workspace people. Please try again.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      loadPeople();
    }
  }, [open, calendarId]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeManager();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, sending, removingId, upgrading]);

  const openManager = (event?: MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    setError(null);
    setOpen(true);
  };

  const closeManager = () => {
    if (sending || removingId || upgrading) return;
    setOpen(false);
    setInviteOpen(false);
    setError(null);
    setSent(false);
  };

  const sendInvite = async () => {
    const trimmed = email.trim();

    if (!trimmed || sending) return;

    setSending(true);
    setError(null);
    setSent(false);
    setRequiresUpgrade(false);

    try {
      const res = await fetch(`/api/calendars/${calendarId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          role,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Failed to send invitation.");
        setRequiresUpgrade(!!data.requiresUpgrade);
        return;
      }

      setEmail("");
      setRole("ADD_CONTENT");
      setSent(true);
      setInviteOpen(false);
      await loadPeople();
    } catch {
      setError("Something went wrong while sending the invitation.");
    } finally {
      setSending(false);
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    setRemovingId(collaboratorId);
    setError(null);

    try {
      const res = await fetch(
        `/api/calendars/${calendarId}/collaborators/${collaboratorId}`,
        { method: "DELETE" },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Couldn't remove this person.");
        return;
      }

      setCollaborators((current) =>
        current.filter((person) => person.id !== collaboratorId),
      );
    } catch {
      setError("Something went wrong while removing this person.");
    } finally {
      setRemovingId(null);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    setRemovingId(inviteId);
    setError(null);

    try {
      const res = await fetch(
        `/api/calendars/${calendarId}/invites/${inviteId}`,
        { method: "DELETE" },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Couldn't cancel this invitation.");
        return;
      }

      setPendingInvites((current) =>
        current.filter((invite) => invite.id !== inviteId),
      );
    } catch {
      setError("Something went wrong while cancelling the invitation.");
    } finally {
      setRemovingId(null);
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

      if (!res.ok) {
        setError(data.error ?? "Couldn't upgrade the account.");
        return;
      }

      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        window.location.reload();
      }
    } catch {
      setError("Something went wrong while upgrading.");
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <>
      {/* Compact people control that lives directly on the workspace card.
          The whole card can still be opened normally; this control sits above
          the card navigation layer. */}
      <button
        type="button"
        onClick={openManager}
        className="group/people relative z-30 flex w-full items-center justify-between rounded-2xl border border-[#E4E7EC] bg-[#F8FAFC] px-4 py-3 text-left transition-all duration-200 hover:border-[#BFD7FF] hover:bg-[#F3F7FF] focus:outline-none focus:ring-4 focus:ring-[#2478FF]/10"
        aria-label={`Manage people with access to ${calendarName}`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF2FF] text-[#2478FF]">
            <PeopleIcon />
          </span>

          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-[0.11em] text-[#667085]">
              People
            </span>
            <span className="mt-0.5 block text-sm font-semibold text-[#101828]">
              {totalMembers} {totalMembers === 1 ? "person" : "people"}
            </span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2 text-[12px] font-semibold text-[#2478FF]">
          Manage People
          <span className="transition-transform group-hover/people:translate-x-0.5">
            →
          </span>
        </span>
      </button>

      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#101828]/60 p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  closeManager();
                }
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`people-title-${calendarId}`}
                className="flex max-h-[min(760px,calc(100vh-32px))] w-full max-w-2xl flex-col overflow-hidden rounded-[30px] border border-[#E4E7EC] bg-white shadow-[0_40px_120px_rgba(16,24,40,0.24)]"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="relative overflow-hidden border-b border-[#EAECF0] px-6 py-6 sm:px-7">
                  <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#2478FF]/[0.09] blur-3xl" />

                  <div className="relative flex items-start justify-between gap-5">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF2FF] text-[#2478FF]">
                        <PeopleIcon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#2478FF]">
                          Workspace access
                        </p>

                        <h2
                          id={`people-title-${calendarId}`}
                          className="mt-1 truncate text-[24px] font-semibold tracking-[-0.035em] text-[#101828]"
                          title={calendarName}
                        >
                          {calendarName}
                        </h2>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-bold text-[#475467]">
                            {totalMembers}{" "}
                            {totalMembers === 1 ? "person" : "people"} with
                            access
                          </span>
                        </div>

                        <p className="mt-2 max-w-lg text-sm leading-5 text-[#667085]">
                          Add collaborators, see who is already inside, or
                          remove access without opening the workspace.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={closeManager}
                      disabled={sending || !!removingId || upgrading}
                      aria-label="Close people manager"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#667085] transition hover:bg-[#F2F4F7] hover:text-[#101828] disabled:opacity-40"
                    >
                      <XIcon />
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-7">
                  {error && (
                    <div
                      role="alert"
                      className="mb-5 rounded-2xl border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm leading-5 text-[#B42318]"
                    >
                      {error}

                      {requiresUpgrade && (
                        <button
                          type="button"
                          onClick={upgradeToCompany}
                          disabled={upgrading}
                          className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-[#2478FF] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1769EA] disabled:opacity-60"
                        >
                          {upgrading ? <Spinner /> : null}
                          Upgrade to invite
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mb-7 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#101828]">
                        People with access
                      </p>

                      <p className="mt-1 text-[13px] text-[#667085]">
                        You are the workspace owner. Collaborators appear
                        below.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setInviteOpen((value) => !value);
                        setSent(false);
                        setError(null);
                      }}
                      className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#101828] px-5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(16,24,40,0.13)] transition hover:-translate-y-0.5 hover:bg-[#182230] focus:outline-none focus:ring-4 focus:ring-[#2478FF]/10"
                    >
                      <PlusIcon />
                      Invite
                    </button>
                  </div>

                  {inviteOpen && (
                    <div className="mb-6 overflow-hidden rounded-[24px] border border-[#CFE0FF] bg-[linear-gradient(145deg,#F8FBFF,#F2F7FF)]">
                      <div className="border-b border-[#DCE9FF] px-5 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#2478FF]">
                          {calendarName}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-[#101828]">
                          Invite a collaborator
                        </p>

                        <p className="mt-1 text-[13px] text-[#667085]">
                          Choose the minimum access they need to do their job.
                        </p>
                      </div>

                      <div className="space-y-4 p-5">
                        <div>
                          <label
                            htmlFor={`invite-email-${calendarId}`}
                            className="mb-2 block text-sm font-semibold text-[#101828]"
                          >
                            Email address
                          </label>

                          <div className="relative">
                            <MailIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />

                            <input
                              id={`invite-email-${calendarId}`}
                              type="email"
                              value={email}
                              onChange={(event) => {
                                setEmail(event.target.value);
                                setError(null);
                                setSent(false);
                              }}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" &&
                                  email.trim()
                                ) {
                                  event.preventDefault();
                                  sendInvite();
                                }
                              }}
                              placeholder="designer@studio.com"
                              autoComplete="email"
                              className="h-12 w-full rounded-xl border border-[#D0D5DD] bg-white pl-11 pr-4 text-[15px] text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-[#2478FF] focus:ring-4 focus:ring-[#2478FF]/10"
                            />
                          </div>
                        </div>

                        <div>
                          <p className="mb-2.5 text-sm font-semibold text-[#101828]">
                            Permission
                          </p>

                          <div className="grid gap-2 sm:grid-cols-3">
                            {ROLES.map((item) => {
                              const selected = role === item.value;

                              return (
                                <button
                                  key={item.value}
                                  type="button"
                                  onClick={() => setRole(item.value)}
                                  className="rounded-xl border p-3 text-left transition hover:-translate-y-0.5"
                                  style={{
                                    borderColor: selected
                                      ? `${item.color}66`
                                      : "#E4E7EC",
                                    background: selected
                                      ? `${item.color}09`
                                      : "#FFFFFF",
                                  }}
                                >
                                  <span
                                    className="block text-[13px] font-semibold"
                                    style={{
                                      color: selected
                                        ? item.color
                                        : "#344054",
                                    }}
                                  >
                                    {item.label}
                                  </span>

                                  <span className="mt-1 block text-[11px] leading-4 text-[#667085]">
                                    {item.description}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {sent && (
                          <div className="rounded-xl border border-[#ABEFC6] bg-[#ECFDF3] px-4 py-3 text-sm font-medium text-[#067647]">
                            Invitation sent successfully.
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setInviteOpen(false)}
                            disabled={sending}
                            className="h-11 rounded-xl border border-[#D0D5DD] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#F8FAFC] disabled:opacity-50"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={sendInvite}
                            disabled={!email.trim() || sending}
                            className="inline-flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-xl bg-[#2478FF] px-5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(36,120,255,0.20)] transition hover:bg-[#1769EA] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {sending ? <Spinner /> : null}
                            {sending ? "Sending…" : "Send invitation"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {loadingList ? (
                    <div className="flex items-center justify-center rounded-[24px] border border-[#EAECF0] bg-[#F8FAFC] py-14">
                      <div className="flex items-center gap-3 text-sm text-[#667085]">
                        <Spinner dark />
                        Loading people…
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-2xl border border-[#EAECF0] bg-white">
                        <div className="flex items-center gap-3 border-b border-[#EAECF0] px-4 py-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#101828] text-sm font-bold text-white">
                            You
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[#101828]">
                              Workspace owner
                            </p>

                            <p className="mt-0.5 text-xs text-[#667085]">
                              Full access
                            </p>
                          </div>

                          <span className="rounded-full bg-[#ECFDF3] px-2.5 py-1 text-[10px] font-bold text-[#027A48]">
                            Owner
                          </span>
                        </div>

                        {collaborators.length > 0 ? (
                          collaborators.map((person) => {
                            const config = roleConfig(person.role);

                            return (
                              <div
                                key={person.id}
                                className="flex items-center gap-3 border-b border-[#F0F2F5] px-4 py-4 last:border-b-0"
                              >
                                <div
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                                  style={{
                                    background: `${config.color}12`,
                                    color: config.color,
                                  }}
                                >
                                  {(person.name || person.email)
                                    .slice(0, 1)
                                    .toUpperCase()}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-[#101828]">
                                    {person.name || person.email}
                                  </p>

                                  <p className="mt-0.5 truncate text-xs text-[#667085]">
                                    {person.email}
                                  </p>
                                </div>

                                <span
                                  className="hidden rounded-full px-2.5 py-1 text-[10px] font-bold sm:inline-flex"
                                  style={{
                                    color: config.color,
                                    background: `${config.color}10`,
                                  }}
                                >
                                  {config.label}
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeCollaborator(person.id)
                                  }
                                  disabled={removingId === person.id}
                                  aria-label={`Remove ${
                                    person.name || person.email
                                  }`}
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#98A2B3] transition hover:bg-[#FEF3F2] hover:text-[#B42318] disabled:opacity-40"
                                >
                                  {removingId === person.id ? (
                                    <Spinner dark />
                                  ) : (
                                    <TrashIcon className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="px-5 py-8 text-center">
                            <p className="text-sm font-semibold text-[#344054]">
                              No collaborators yet
                            </p>

                            <p className="mt-1 text-[13px] text-[#667085]">
                              Invite a designer, content creator or
                              client-side teammate.
                            </p>
                          </div>
                        )}
                      </div>

                      {pendingInvites.length > 0 && (
                        <div className="mt-5">
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-[#101828]">
                                Pending invitations
                              </p>

                              <p className="mt-1 text-[13px] text-[#667085]">
                                These people have been invited but have not
                                joined yet.
                              </p>
                            </div>

                            <span className="rounded-full bg-[#FFF7ED] px-2.5 py-1 text-[10px] font-bold text-[#C2410C]">
                              {pendingInvites.length} waiting
                            </span>
                          </div>

                          <div className="space-y-2">
                            {pendingInvites.map((invite) => {
                              const config = roleConfig(invite.role);

                              return (
                                <div
                                  key={invite.id}
                                  className="flex items-center gap-3 rounded-2xl border border-dashed border-[#D0D5DD] bg-[#FAFBFC] px-4 py-3.5"
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F2F4F7] text-[#667085]">
                                    <MailIcon />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-[#344054]">
                                      {invite.email}
                                    </p>

                                    <p className="mt-0.5 text-xs text-[#98A2B3]">
                                      {config.label} · waiting for acceptance
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => revokeInvite(invite.id)}
                                    disabled={removingId === invite.id}
                                    className="text-xs font-semibold text-[#667085] transition hover:text-[#B42318] disabled:opacity-40"
                                  >
                                    {removingId === invite.id
                                      ? "Cancelling…"
                                      : "Cancel"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-[#EAECF0] bg-[#F8FAFC] px-6 py-4 sm:px-7">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-[#667085]">
                      Permissions can be changed later from the workspace
                      People area.
                    </p>

                    <button
                      type="button"
                      onClick={closeManager}
                      disabled={sending || !!removingId || upgrading}
                      className="h-10 rounded-xl border border-[#D0D5DD] bg-white px-4 text-xs font-semibold text-[#344054] transition hover:bg-[#F2F4F7] disabled:opacity-50"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
