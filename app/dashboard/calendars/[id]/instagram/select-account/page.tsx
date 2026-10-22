'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { calendarMutationFetch } from '@/lib/publishing/clientRequests';

type Selection = {
  accounts: { accountId: string; pageId: string; name: string }[];
  expectedVersion: number;
  insightsGranted?: boolean;
};
export default function InstagramAccountSelection({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [options, setOptions] = useState<Selection | null>(null);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/calendars/${id}/instagram/select-account`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw Error(body.error);
        if (!controller.signal.aborted) setOptions(body);
      }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [id]);
  async function select() {
    if (!options || !selected || busy) return;
    setBusy(true); setError('');
    try {
      const response = await calendarMutationFetch(`/api/calendars/${id}/instagram/select-account`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selected, expectedVersion: options.expectedVersion }),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      router.replace(`/dashboard/calendars/${id}?view=channels&instagramConnected=true`);
    } catch (error) { setError(error instanceof Error ? error.message : 'Account selection failed.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-xl space-y-5 p-6">
    <h1 className="text-2xl font-semibold">Choose your Instagram account</h1>
    <p>Select the Facebook Page and linked Instagram professional account for this workspace.</p>
    {options?.insightsGranted !== undefined && <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-800">
      {options.insightsGranted
        ? 'Meta granted Instagram Insights during this authorization. Connect the account, then sync Analytics & Reporting to verify access to live metrics.'
        : 'Meta did not grant Instagram Insights during this authorization. Publishing and messaging can still connect; analytics access requires reauthorization with the Insights permission.'}
    </p>}
    {!options && !error && <p role="status">Loading your linked accounts…</p>}
    {options && options.accounts.length === 0 && <p>No linked Instagram professional accounts were returned. Connect again and allow access to the appropriate Facebook Page.</p>}
    <fieldset className="space-y-3" disabled={busy}>
      <legend className="sr-only">Instagram accounts linked to Facebook Pages</legend>
      {options?.accounts.map(account => <label key={account.accountId} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-300 p-4">
        <input className="mt-1" type="radio" name="instagram-account" value={account.accountId}
          checked={selected === account.accountId} onChange={() => setSelected(account.accountId)} />
        <span className="min-w-0 break-words">{account.name}</span>
      </label>)}
    </fieldset>
    <button className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
      onClick={() => void select()} disabled={busy || !selected || !options}>
      {busy ? 'Connecting…' : 'Connect selected account'}
    </button>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <a className="block text-sm underline" href={`/api/calendars/${id}/instagram/connect`}>Restart Instagram authorization</a>
  </main>;
}
