"use client";

import {
  REPLY_PROFILE_FIELDS,
  REPLY_TONES,
  type ReplyProfile,
} from "@/lib/socialMessaging/replyProfile";

export default function CustomerCareSettings({
  profile,
  guidance,
  saving,
  onProfileChange,
  onGuidanceChange,
  onSave,
}: {
  profile: ReplyProfile;
  guidance: string;
  saving: boolean;
  onProfileChange: (profile: ReplyProfile) => void;
  onGuidanceChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-4 border-t border-[#E9EDF3] pt-4">
      <p className="text-xs font-semibold text-[#344054]">
        Customer-care playbook
      </p>
      <p className="mt-1 text-[11px] leading-5 text-[#667085]">
        Set your default voice and give replies the facts your team would use.
        Applies to automatic replies and staff drafts, alongside your workspace
        Knowledge.
      </p>
      <label className="mt-3 block text-[11px] font-semibold text-[#344054]">
        Default reply tone
        <select
          aria-label="Default reply tone"
          value={profile.tone}
          disabled={saving}
          onChange={(event) =>
            onProfileChange({
              ...profile,
              tone: event.target.value as ReplyProfile["tone"],
            })
          }
          className="mt-1.5 min-h-11 w-full rounded-lg border border-[#D0D5DD] bg-white px-3 text-xs"
        >
          {REPLY_TONES.map((tone) => (
            <option key={tone.value} value={tone.value}>
              {tone.label}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-1.5 text-[10px] text-[#667085]">
        {REPLY_TONES.find((tone) => tone.value === profile.tone)?.description}
      </p>
      <details className="mt-4 rounded-xl border border-[#E3E8EF] bg-[#FAFBFD]">
        <summary className="min-h-11 cursor-pointer px-3 py-3 text-xs font-semibold text-[#344054]">
          Business facts & response guidance
        </summary>
        <div className="space-y-4 px-3 pb-4">
          {REPLY_PROFILE_FIELDS.map((field) => (
            <label
              key={field.key}
              className="block text-[11px] font-semibold text-[#344054]"
            >
              {field.label}
              <textarea
                rows={field.key === "industry" ? 1 : 3}
                maxLength={field.limit}
                disabled={saving}
                value={profile[field.key]}
                onChange={(event) =>
                  onProfileChange({
                    ...profile,
                    [field.key]: event.target.value,
                  })
                }
                placeholder={field.placeholder}
                className="mt-1.5 min-h-11 w-full resize-y rounded-lg border border-[#D0D5DD] bg-white px-3 py-2.5 text-xs font-normal leading-5 outline-none focus:border-blue-400"
              />
              <span className="mt-1 block text-right text-[9px] font-normal text-[#98A2B3]">
                {profile[field.key].length}/{field.limit.toLocaleString()}
              </span>
            </label>
          ))}
          <label className="block text-[11px] font-semibold text-[#344054]">
            Additional voice guidance
            <textarea
              rows={2}
              maxLength={1200}
              disabled={saving}
              value={guidance}
              onChange={(event) => onGuidanceChange(event.target.value)}
              placeholder="e.g. Use British English. Avoid emojis. Keep replies under four sentences."
              className="mt-1.5 min-h-11 w-full resize-y rounded-lg border border-[#D0D5DD] bg-white px-3 py-2.5 text-xs font-normal leading-5 outline-none focus:border-blue-400"
            />
          </label>
        </div>
      </details>
      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        className="mt-3 min-h-11 rounded-lg bg-[#1768E8] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save customer-care settings"}
      </button>
    </div>
  );
}
