export type PartnerTagProfile = { status: string; isActive: boolean } | null | undefined;
export default function PartnerTag({ profile }: { profile: PartnerTagProfile }) {
  if (!profile) return null;
  const accepted = profile.status === "ACTIVE";
  const label = accepted ? "Accepted partner" : profile.status === "PENDING" ? "Partner applicant" : profile.status === "SUSPENDED" ? "Suspended partner" : "Partner application rejected";
  return <span title={accepted && !profile.isActive ? "Accepted partner; new referrals are paused" : label} className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${accepted ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>{label}{accepted && !profile.isActive ? " · referrals paused" : ""}</span>;
}
