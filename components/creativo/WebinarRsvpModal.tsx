"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";

const COLOR = { blue: "#2478FF", black: "#0A0A0A", yellow: "#FFCC00" };

const FIELDS = [
  "Videography",
  "Photography",
  "Graphics Design",
  "Social Media Management",
  "Branding/Illustration",
  "Motion Design",
  "Other",
];

export default function WebinarRsvpModal({
  webinarId,
  topic,
  onClose,
}: {
  webinarId: string;
  topic: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [field, setField] = useState(FIELDS[0]);
  const [joinedCommunity, setJoinedCommunity] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !whatsappNumber.trim() || joinedCommunity === null) {
      setError("Please fill in every field, including whether you've joined the community.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/webinars/${webinarId}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, whatsappNumber, field, joinedCommunity }),
    });
    const data = await res.json();

    if (res.ok) {
      setDone(true);
    } else {
      setError(data.error ?? "Something went wrong — try again.");
    }
    setSubmitting(false);
  };

  const inputClass = "w-full rounded-lg border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-black outline-none focus:border-black/25";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase text-black/40";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
          <p className="text-sm font-bold text-black">Reserve your spot</p>
          <button onClick={onClose} aria-label="Close" className="text-black/40 hover:text-black">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${COLOR.blue}18` }}>
              <Check size={20} style={{ color: COLOR.blue }} />
            </div>
            <p className="text-base font-bold text-black">You&apos;re confirmed.</p>
            <p className="mt-2 text-sm text-black/50">Check your email — we've sent your confirmation and the details for {topic}.</p>
            <button onClick={onClose} className="mt-6 rounded-full px-6 py-2.5 text-sm font-bold text-white" style={{ background: COLOR.blue }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
            <div>
              <label className={labelClass}>Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} style={{ fontSize: "16px" }} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ fontSize: "16px" }} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>WhatsApp number</label>
              <input type="tel" required value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} style={{ fontSize: "16px" }} className={inputClass} placeholder="+234 800 000 0000" />
            </div>

            <div>
              <label className={labelClass}>What field are you in?</label>
              <select value={field} onChange={(e) => setField(e.target.value)} style={{ fontSize: "16px" }} className={inputClass}>
                {FIELDS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Have you joined the Creativo community?</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setJoinedCommunity(true)}
                  className="flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors"
                  style={joinedCommunity === true ? { background: COLOR.blue, color: "#fff" } : { background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.5)" }}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setJoinedCommunity(false)}
                  className="flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors"
                  style={joinedCommunity === false ? { background: COLOR.blue, color: "#fff" } : { background: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.5)" }}
                >
                  Not yet
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 rounded-full py-3.5 text-sm font-bold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
              style={{ background: COLOR.blue }}
            >
              {submitting ? "Reserving..." : "Confirm my spot"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}