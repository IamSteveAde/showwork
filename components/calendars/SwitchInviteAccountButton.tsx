"use client";
import { useState } from 'react';
export default function SwitchInviteAccountButton({ nextUrl }: { nextUrl: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div><button type="button" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { const response = await fetch('/api/auth/logout', { method: 'POST' }); if (!response.ok) throw new Error('Could not switch accounts. Please try again.'); window.location.href = `/login?next=${encodeURIComponent(nextUrl)}`; } catch (error) { setError(error instanceof Error ? error.message : 'Connection failed. Please try again.'); setBusy(false); } }} className="mt-4 min-h-11 rounded-xl bg-[#2463CC] px-5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Switching…' : 'Switch account'}</button>{error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}</div>;
}
