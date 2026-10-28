"use client";
import { calendarMutationFetch } from "@/lib/publishing/clientRequests";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Image from "next/image";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import styles from "./ClientEntry.module.css";

export default function CalendarPasswordGate({ slug, clientName }: { slug: string; clientName: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await calendarMutationFetch(`/api/social-calendar/${slug}/unlock`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, email, name }),
      });
      if (res.ok) router.refresh();
      else { const data = await res.json().catch(() => null); setError(data?.error || "We couldn’t unlock this workspace. Check the password and try again."); }
    } catch { setError("Couldn’t connect. Please try again."); }
    finally { setLoading(false); }
  };

  return <main className={styles.entry} data-showwork-client-view="workspace-entry">
    <div className={styles.frame}>
      <section className={styles.story}><Image src="/images/logo/swwhite.svg" alt="Showwork" width={105} height={26} priority/><div><span className={styles.eyebrow}>Made to move work forward</span><h1>A little feedback.<br/>A bigger<br/><span>possibility.</span></h1><p>Your content, your perspective. One private place to review what’s next.</p></div><div className={styles.steps}><span>01 / Explore</span><span>02 / Refine</span><span>03 / Approve</span></div></section>
      <section className={styles.formSide}><span className={styles.lock}><LockKeyhole size={23}/></span><span className={styles.label}>Your client workspace</span><h2>{clientName}</h2><p>Welcome in. Use the password shared by your team.</p>
        <form onSubmit={submit}>
          <label htmlFor="client-viewer-name">Your name <small>Optional</small></label><input id="client-viewer-name" autoComplete="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="How should we call you?" disabled={loading}/>
          <label htmlFor="client-viewer-email">Email address <small>Optional</small></label><input id="client-viewer-email" autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" disabled={loading}/>
          <label htmlFor="client-viewer-password">Workspace password</label><div className={styles.password}><input id="client-viewer-password" autoComplete="current-password" type={visible ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" disabled={loading}/><button type="button" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button type="submit" className={styles.submit} disabled={loading}>{loading ? <><LoaderCircle size={17} className={styles.spinner}/>Opening your workspace…</> : <>Enter workspace<ArrowRight size={17}/></>}</button>
        </form><p className={styles.privacy}><ShieldCheck size={13}/>Private access · Shared with you by your team</p>
      </section>
    </div>
  </main>;
}
