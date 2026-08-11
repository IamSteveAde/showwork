import Link from "next/link";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import AcceptInviteButton from "@/components/AcceptInviteButton";

const COLOR = {
  black: "#0A0A0A",
  blue: "#2478FF",
  gradient: "linear-gradient(135deg, #2478FF 0%, #0052FF 100%)",
  charcoal: "#1A1A1A",
  midGray: "#888786",
};

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const invite = await db.projectInvite.findUnique({
    where: { tokenHash },
    include: { project: { select: { id: true, clientName: true } }, invitedByCreator: { select: { name: true, email: true } } },
  });

  const currentCreator = await getCurrentCreator();
  const nextParam = encodeURIComponent(`/invites/${token}`);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <main className="flex min-h-screen items-center justify-center px-6" style={{ background: COLOR.black }}>
      <div className="w-full max-w-md rounded-2xl p-8 text-center" style={{ background: COLOR.charcoal }}>
        {children}
      </div>
    </main>
  );

  if (!invite) {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-bold text-white">Invite not found</h1>
        <p className="text-sm" style={{ color: COLOR.midGray }}>
          This invite link isn&apos;t valid — it may have been mistyped, or the project may no longer exist.
        </p>
      </Shell>
    );
  }

  if (invite.status === "ACCEPTED") {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-bold text-white">You&apos;re already on this project</h1>
        <p className="mb-6 text-sm" style={{ color: COLOR.midGray }}>
          You already accepted this invite to <strong className="text-white">{invite.project.clientName}</strong>.
        </p>
        <Link
          href={`/dashboard/${invite.project.id}`}
          className="inline-block rounded-lg px-6 py-3 text-sm font-semibold text-white"
          style={{ background: COLOR.gradient }}
        >
          Go to project
        </Link>
      </Shell>
    );
  }

  if (invite.status === "DECLINED") {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-bold text-white">Invite declined</h1>
        <p className="text-sm" style={{ color: COLOR.midGray }}>
          This invite was already declined. Ask {invite.invitedByCreator.name || invite.invitedByCreator.email} to send a new one if you&apos;ve changed your mind.
        </p>
      </Shell>
    );
  }

  if (invite.status === "EXPIRED" || invite.expiresAt < new Date()) {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-bold text-white">This invite has expired</h1>
        <p className="text-sm" style={{ color: COLOR.midGray }}>
          Ask {invite.invitedByCreator.name || invite.invitedByCreator.email} to send you a new invite.
        </p>
      </Shell>
    );
  }

  // PENDING and not expired from here on.

  // Logged in, but as the wrong account.
  if (currentCreator && currentCreator.email.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-bold text-white">Wrong account</h1>
        <p className="mb-6 text-sm" style={{ color: COLOR.midGray }}>
          This invite was sent to <strong className="text-white">{invite.email}</strong>, but you&apos;re
          currently logged in as <strong className="text-white">{currentCreator.email}</strong>.
        </p>
        <Link
          href={`/login?next=${nextParam}`}
          className="text-sm font-semibold underline"
          style={{ color: COLOR.blue }}
        >
          Log in as {invite.email} instead
        </Link>
      </Shell>
    );
  }

  // Logged in as the right account — ready to accept.
  if (currentCreator) {
    return (
      <Shell>
        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.1em" }}>
          You&apos;re invited
        </p>
        <h1 className="mb-2 text-xl font-bold text-white">
          Join &ldquo;{invite.project.clientName}&rdquo;
        </h1>
        <p className="mb-6 text-sm" style={{ color: COLOR.midGray }}>
          {invite.invitedByCreator.name || invite.invitedByCreator.email} invited you to collaborate on this project.
        </p>
        <AcceptInviteButton token={token} />
      </Shell>
    );
  }

  // Not logged in at all — check whether this email already has an
  // account, to send them down the right path (log in vs. sign up).
  const existingAccount = await db.creator.findUnique({ where: { email: invite.email } });

  return (
    <Shell>
      <p className="mb-2 text-xs font-semibold uppercase" style={{ color: COLOR.blue, letterSpacing: "0.1em" }}>
        You&apos;re invited
      </p>
      <h1 className="mb-2 text-xl font-bold text-white">
        Join &ldquo;{invite.project.clientName}&rdquo;
      </h1>
      <p className="mb-6 text-sm" style={{ color: COLOR.midGray }}>
        {invite.invitedByCreator.name || invite.invitedByCreator.email} invited{" "}
        <strong className="text-white">{invite.email}</strong> to collaborate on this project.
      </p>
      {existingAccount ? (
        <Link
          href={`/login?next=${nextParam}`}
          className="inline-block rounded-lg px-6 py-3 text-sm font-semibold text-white"
          style={{ background: COLOR.gradient }}
        >
          Log in to accept
        </Link>
      ) : (
        <Link
          href={`/signup?next=${nextParam}`}
          className="inline-block rounded-lg px-6 py-3 text-sm font-semibold text-white"
          style={{ background: COLOR.gradient }}
        >
          Create an account to accept
        </Link>
      )}
    </Shell>
  );
}