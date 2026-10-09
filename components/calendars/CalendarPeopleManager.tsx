"use client";
import { useEffect, useRef, useState } from 'react';
import { Users, X } from 'lucide-react';
import WorkspaceTeamPanel from './WorkspaceTeamPanel';
export default function CalendarPeopleManager({ calendarId, calendarName, totalMembers, compact = false }: { calendarId: string; calendarName: string; totalMembers: number; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    dialogRef.current?.showModal(); document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; triggerRef.current?.focus({ preventScroll: true }); };
  }, [open]);
  return <>
    <button ref={triggerRef} type="button" onClick={event => { event.preventDefault(); event.stopPropagation(); setOpen(true); }} aria-label={`Manage people for ${calendarName}`} className={compact ? 'relative z-30 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[#607898] hover:bg-[#EAF2FF]' : 'flex w-full items-center gap-3 rounded-2xl border border-[#C7D9F2] bg-[#F1F6FF] p-4 text-left text-[#355F94]'}><Users size={compact ? 15 : 20} aria-hidden="true" /><span>{compact ? `${totalMembers} ${totalMembers === 1 ? 'person' : 'people'}` : 'People & feature access'}</span></button>
    {open && <dialog ref={dialogRef} aria-labelledby={`team-dialog-${calendarId}`} onCancel={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }} className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-24px)] max-w-4xl overflow-y-auto rounded-3xl border border-[#CCD9EE] bg-[#F5F8FE] p-0 text-[#203C5F] shadow-2xl backdrop:bg-[#142A49]/55 backdrop:backdrop-blur-sm"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#D7E2F2] bg-[#F5F8FE]/95 px-5 py-3 backdrop-blur"><h2 id={`team-dialog-${calendarId}`} className="text-sm font-medium">{calendarName} · People & access</h2><button type="button" aria-label="Close people manager" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-xl text-[#6E88AC] hover:bg-[#E6EEFB]"><X size={18} aria-hidden="true" /></button></div><div className="p-5 sm:p-7"><WorkspaceTeamPanel calendarId={calendarId} /></div></dialog>}
  </>;
}
