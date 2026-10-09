import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createHash } from 'node:crypto';
import { Users, Check, ShieldCheck } from 'lucide-react';
import { getCurrentCreator } from '@/lib/auth';
import { db } from '@/lib/db';
import { TEAM_ROLES, TEAM_PERMISSIONS, normalizeTeamRole, effectiveTeamPermissions } from '@/lib/calendarTeamPolicy';
import AcceptCalendarInviteButton from '@/components/calendars/AcceptCalendarInviteButton';
import SwitchInviteAccountButton from '@/components/calendars/SwitchInviteAccountButton';
export const dynamic = 'force-dynamic';
export default async function CalendarInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await db.calendarInvite.findUnique({ where: { tokenHash: createHash('sha256').update(token).digest('hex') }, include: { calendar: { select: { id: true, clientName: true } }, invitedByCreator: { select: { name: true, email: true } } } });
  if (!invite) notFound();
  const role = normalizeTeamRole(invite.role);
  if (!role) notFound();
  const features = effectiveTeamPermissions(role, invite.permissions, invite.customPermissions);
  const actor = await getCurrentCreator();
  const nextUrl = `/calendars/invites/${token}`;
  let body;
  if (invite.status === 'ACCEPTED' && actor?.email.toLowerCase() === invite.email.toLowerCase()) body = <Link className="inline-flex min-h-11 items-center rounded-xl bg-[#2463CC] px-5 text-sm font-semibold text-white" href={`/dashboard/calendars/${invite.calendarId}`}>Open workspace</Link>;
  else if (invite.status !== 'PENDING') body = <p className="text-sm text-[#6C83A2]">This invitation is no longer active.</p>;
  else if (invite.expiresAt <= new Date()) body = <p className="text-sm text-[#6C83A2]">This invitation expired. Ask the owner or manager to resend it.</p>;
  else if (actor && actor.email.trim().toLowerCase() === invite.email.trim().toLowerCase()) body = <AcceptCalendarInviteButton token={token} />;
  else if (actor) body = <div><p className="text-sm leading-6 text-[#6C83A2]">This invitation is for {invite.email}. You are signed in as {actor.email}.</p><SwitchInviteAccountButton nextUrl={nextUrl} /></div>;
  else {
    const account = await db.creator.findUnique({ where: { email: invite.email }, select: { id: true } });
    body = <Link className="inline-flex min-h-11 items-center rounded-xl bg-[#2463CC] px-5 text-sm font-semibold text-white" href={`/${account ? 'login' : 'signup'}?next=${encodeURIComponent(nextUrl)}`}>{account ? 'Sign in to join' : 'Create an account to join'}</Link>;
  }
  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,#D7E7FF,#EEF3FB_65%)] p-5 text-[#234369]"><div className="w-full max-w-xl overflow-hidden rounded-3xl border border-[#C9DBF4] bg-white shadow-[0_25px_65px_-35px_#244A81]">
    <header className="bg-[linear-gradient(130deg,#164283,#2468D0)] p-7 text-white"><Users size={29} aria-hidden="true" /><p className="mt-5 text-xs uppercase tracking-widest text-blue-100">You’re invited</p><h1 className="mt-2 text-3xl font-medium tracking-tight">A place on the team.</h1><p className="mt-3 text-sm leading-6 text-blue-100">{invite.invitedByCreator.name || invite.invitedByCreator.email} invited you to {invite.calendar.clientName}.</p></header>
    <div className="p-7"><div className="flex items-center gap-2"><ShieldCheck size={18} aria-hidden="true" /><h2 className="text-lg font-semibold">{TEAM_ROLES[role].label}</h2></div><p className="mt-2 text-sm leading-6 text-[#7187A3]">{TEAM_ROLES[role].description}</p>{invite.customPermissions && <p className="mt-3 text-xs leading-6 text-[#5C7DA4]">Your access is customized. Only the features listed below are enabled.</p>}<ul className="mt-5 grid gap-2 sm:grid-cols-2">{features.map(permission => <li key={permission} className="flex items-start gap-2 rounded-lg bg-[#F1F6FF] p-2.5 text-xs leading-5 text-[#587BA5]"><Check size={13} className="mt-1 shrink-0" aria-hidden="true" />{TEAM_PERMISSIONS[permission].label}</li>)}</ul><div className="mt-6 border-t border-[#D8E4F4] pt-5">{body}</div></div>
  </div></main>;
}
