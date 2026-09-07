import Link from "next/link";
import { notFound } from "next/navigation";
import { createHash } from "crypto";
import { getCurrentCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import AcceptCalendarInviteButton from "@/components/calendars/AcceptCalendarInviteButton";

const COLOR = { black: "#0A0A0A", blue: "#2478FF" };

const ROLE_META: Record<string, { label: string; description: string; color: string }> = {
  VIEW_ONLY: { label: "View only", description: "You'll be able to see this calendar, but not make changes.", color: "#888786" },
  ADD_CONTENT: { label: "Add content", description: "You'll be able to upload images and videos to planned posts.", color: "#2478FF" },
  EDIT_CALENDAR: { label: "Edit calendar", description: "You'll be able to create, edit, and delete posts, and edit the calendar itself.", color: "#F97316" },
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const dynamic = "force-dynamic";

export default async function CalendarInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await db.calendarInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { calendar: { select: { clientName: true } }, invitedByCreator: { select: { name: true, email: true } } },
  });

  if (!invite) notFound();

  const roleMeta = ROLE_META[invite.role] ?? ROLE_META.ADD_CONTENT;

  const currentCreator = await getCurrentCreator();
  const nextUrl = `/calendars/invites/${token}`;

  let body: React.ReactNode;

  if (invite.status !== "PENDING") {
    body = <p className="text-sm text-white/50">This invite has already been used.</p>;
  } else if (invite.expiresAt < new Date()) {
    body = <p className="text-sm text-white/50">This invite has expired — ask {invite.invitedByCreator.name || invite.invitedByCreator.email} to send a new one.</p>;
  } else if (currentCreator) {
    if (currentCreator.email.toLowerCase() === invite.email.toLowerCase()) {
      body = <AcceptCalendarInviteButton token={token} />;
    } else {
      body = (
        <p className="text-sm text-white/50">
          This invite was sent to {invite.email}, but you&apos;re logged in as {currentCreator.email}. Log out and try again with the right account.
        </p>
      );
    }
  } else {
    const existingAccount = await db.creator.findUnique({ where: { email: invite.email }, select: { id: true } });
    body = existingAccount ? (
      <Link
        href={`/login?next=${encodeURIComponent(nextUrl)}`}
        className="inline-block rounded-lg px-6 py-3 text-sm font-semibold text-white"
        style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
      >
        Log in to accept
      </Link>
    ) : (
      <Link
        href={`/signup?next=${encodeURIComponent(nextUrl)}`}
        className="inline-block rounded-lg px-6 py-3 text-sm font-semibold text-white"
        style={{ background: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)" }}
      >
        Sign up to accept
      </Link>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6" style={{ background: COLOR.black }}>
      <div className="w-full max-w-md rounded-2xl p-8 text-center" style={{ background: "#1A1A1A" }}>
        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.1em" }}>
          Calendar invite
        </p>
        <h1 className="mb-2 text-xl font-bold text-white">
          {invite.invitedByCreator.name || invite.invitedByCreator.email} invited you
        </h1>
        <p className="mb-6 text-sm text-white/50">
          To help create content for <strong className="text-white">{invite.calendar.clientName}</strong>&apos;s calendar.
        </p>
        <div className="mb-6 rounded-xl p-4 text-left" style={{ background: `${roleMeta.color}14` }}>
          <p className="text-xs font-semibold uppercase" style={{ color: roleMeta.color, letterSpacing: "0.06em" }}>
            {roleMeta.label} access
          </p>
          <p className="mt-1 text-xs text-white/50">{roleMeta.description}</p>
        </div>
        {body}
      </div>
    </main>
  );
}