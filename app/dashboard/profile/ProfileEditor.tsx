
"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { putFileWithProgress } from "@/lib/uploadClient";

type CreatorData = {
  name: string | null;
  email: string;
  phone: string | null;
  companyName: string | null;
  avatarUrl: string | null;
  notifyOnView: boolean;
  accountType: string;
};

type Props = {
  creator: CreatorData;
};

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="m5 12 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="m4 20 4.2-.9L19 8.3a2.1 2.1 0 0 0-3-3L5.2 16.1 4 20Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m14.5 6.5 3 3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M12 16V4m0 0L7 9m5-5 5 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function getInitials(
  name: string | null,
  email: string
) {
  const value = name?.trim();

  if (value) {
    const parts = value
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${
        parts[parts.length - 1][0]
      }`.toUpperCase();
    }

    return value.slice(0, 2).toUpperCase();
  }

  return email.slice(0, 2).toUpperCase();
}

export default function ProfileEditor({
  creator,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(
    creator.name ?? ""
  );

  const [phone, setPhone] = useState(
    creator.phone ?? ""
  );

  const [companyName, setCompanyName] = useState(
    creator.companyName ?? ""
  );

  const [notifyOnView, setNotifyOnView] =
    useState(creator.notifyOnView);

  const [avatarUrl, setAvatarUrl] = useState(
    creator.avatarUrl
  );

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] =
    useState(false);
  const [avatarUploadPercent, setAvatarUploadPercent] = useState(0);

  const [message, setMessage] = useState<string | null>(
    null
  );

  const [error, setError] = useState<string | null>(
    null
  );

  const [isDirty, setIsDirty] = useState(false);

  const initials = getInitials(
    name || creator.name,
    creator.email
  );

  function markDirty() {
    setIsDirty(true);
    setMessage(null);
    setError(null);
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        "/api/account/profile",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            phone,
            companyName,
            notifyOnView,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ??
            "We couldn't save your changes."
        );
        return;
      }

      setMessage("Your profile has been updated.");
      setIsDirty(false);

      router.refresh();
    } catch {
      setError(
        "We couldn't connect to Showwork. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setMessage(null);
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setError(
        "Profile photos must be 5MB or smaller."
      );
      return;
    }

    setUploadingAvatar(true);
    setAvatarUploadPercent(0);

    try {
      /*
       * The existing account avatar endpoint returns a
       * presigned R2 upload URL and the public URL.
       */
      const presignResponse = await fetch(
        "/api/account/avatar",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
          }),
        }
      );

      const presignData =
        await presignResponse.json();

      if (!presignResponse.ok) {
        setError(
          presignData.error ??
            "Couldn't prepare the profile photo upload."
        );
        return;
      }

      await putFileWithProgress(presignData.uploadUrl, file, {
        contentType: file.type,
        onProgress: ({ percent }) => setAvatarUploadPercent(percent),
      });

      /*
       * The existing avatar endpoint handles the account
       * avatar record/update as part of its flow.
       */
      setAvatarUrl(
        `${presignData.publicUrl}?v=${Date.now()}`
      );

      setMessage("Profile photo updated.");
      router.refresh();
    } catch {
      setError(
        "We couldn't upload your profile photo. Please try again."
      );
    } finally {
      setUploadingAvatar(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* PROFILE INFORMATION */}
      <section className="overflow-hidden rounded-[24px] border border-black/[0.07] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.025)]">
        <div className="border-b border-[#EAECF0] px-5 py-5 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#98A2B3]">
                Profile
              </p>

              <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[#101828]">
                Personal information
              </h2>

              <p className="mt-1 text-[12px] text-[#667085]">
                Keep the information on your Showwork
                account up to date.
              </p>
            </div>

            <div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-[#F2F4F7] text-[#667085] sm:flex">
              <PencilIcon />
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSave}
          className="p-5 sm:p-7"
        >
          {/* AVATAR */}
          <div className="flex flex-col gap-4 border-b border-[#EAECF0] pb-7 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name || "Profile"}
                  className="h-20 w-20 rounded-[20px] object-cover ring-1 ring-black/[0.08]"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-[20px] bg-[#2478FF] text-lg font-bold text-white">
                  {initials}
                </div>
              )}

              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#111318] text-white">
                <UploadIcon />
              </div>
            </div>

            <div>
              <p className="text-[13px] font-semibold text-[#101828]">
                Profile photo
              </p>

              <p className="mt-1 max-w-md text-[11px] leading-5 text-[#98A2B3]">
                Use a clear photo or professional image.
                JPG, PNG or WebP up to 5MB.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={uploadingAvatar}
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-3.5 text-[11px] font-semibold text-[#344054] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UploadIcon />

                {uploadingAvatar
                  ? `Uploading ${avatarUploadPercent}%`
                  : "Change photo"}
              </button>
            </div>
          </div>

          {/* FIELDS */}
          <div className="grid gap-5 pt-7 sm:grid-cols-2">
            <div>
              <label
                htmlFor="profile-name"
                className="text-[11px] font-semibold text-[#344054]"
              >
                Full name
              </label>

              <input
                id="profile-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  markDirty();
                }}
                placeholder="Your name"
                autoComplete="name"
                className="mt-2 h-11 w-full rounded-xl border border-[#D0D5DD] bg-white px-3.5 text-[13px] text-[#101828] outline-none transition placeholder:text-[#B0B7C3] focus:border-[#2478FF] focus:ring-4 focus:ring-[#2478FF]/10"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="flex items-center justify-between text-[11px] font-semibold text-[#344054]"
              >
                Email address

                <span className="text-[9px] font-medium text-[#98A2B3]">
                  Account email
                </span>
              </label>

              <div className="relative mt-2">
                <input
                  id="profile-email"
                  value={creator.email}
                  disabled
                  className="h-11 w-full rounded-xl border border-[#EAECF0] bg-[#F8FAFC] px-3.5 pr-24 text-[13px] text-[#667085] outline-none"
                />

                <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[9px] font-semibold text-emerald-600">
                  <CheckIcon />
                  Verified
                </span>
              </div>

              <p className="mt-1.5 text-[10px] text-[#98A2B3]">
                Changing your login email requires
                verification.
              </p>
            </div>

            <div>
              <label
                htmlFor="profile-phone"
                className="text-[11px] font-semibold text-[#344054]"
              >
                Phone number
              </label>

              <input
                id="profile-phone"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  markDirty();
                }}
                placeholder="+2348012345678"
                autoComplete="tel"
                inputMode="tel"
                className="mt-2 h-11 w-full rounded-xl border border-[#D0D5DD] bg-white px-3.5 text-[13px] text-[#101828] outline-none transition placeholder:text-[#B0B7C3] focus:border-[#2478FF] focus:ring-4 focus:ring-[#2478FF]/10"
              />
            </div>

            <div>
              <label
                htmlFor="profile-company"
                className="text-[11px] font-semibold text-[#344054]"
              >
                Company / studio name
              </label>

              <input
                id="profile-company"
                value={companyName}
                onChange={(event) => {
                  setCompanyName(event.target.value);
                  markDirty();
                }}
                placeholder="Your company or studio"
                autoComplete="organization"
                className="mt-2 h-11 w-full rounded-xl border border-[#D0D5DD] bg-white px-3.5 text-[13px] text-[#101828] outline-none transition placeholder:text-[#B0B7C3] focus:border-[#2478FF] focus:ring-4 focus:ring-[#2478FF]/10"
              />
            </div>
          </div>

          {/* ACCOUNT TYPE */}
          <div className="mt-7 rounded-xl border border-[#EAECF0] bg-[#F8FAFC] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold text-[#344054]">
                  Account type
                </p>

                <p className="mt-1 text-[10px] leading-5 text-[#98A2B3]">
                  Your account type controls certain Showwork
                  capabilities and cannot be changed from this
                  page.
                </p>
              </div>

              <span className="inline-flex w-fit rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-[#344054] ring-1 ring-black/[0.06]">
                {creator.accountType === "AGENCY"
                  ? "Agency"
                  : "Creator"}
              </span>
            </div>
          </div>

          {/* FORM FEEDBACK */}
          {(message || error) && (
            <div
              className={`mt-5 rounded-xl px-4 py-3 text-[11px] font-medium ${
                error
                  ? "bg-red-50 text-red-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {error ?? message}
            </div>
          )}

          {/* SAVE */}
          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#EAECF0] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] text-[#98A2B3]">
              {isDirty
                ? "You have unsaved changes."
                : "Your information is up to date."}
            </p>

            <button
              type="submit"
              disabled={saving || !isDirty}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#2478FF] px-5 text-[11px] font-semibold text-white transition hover:bg-[#1769E8] disabled:cursor-not-allowed disabled:bg-[#D0D5DD]"
            >
              {saving
                ? "Saving changes..."
                : "Save changes"}
            </button>
          </div>
        </form>
      </section>

      {/* PREFERENCES */}
      <section className="rounded-[24px] border border-black/[0.07] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.025)]">
        <div className="border-b border-[#EAECF0] px-5 py-5 sm:px-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#98A2B3]">
            Preferences
          </p>

          <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[#101828]">
            Notifications
          </h2>
        </div>

        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-5">
            <div className="max-w-xl">
              <p className="text-[13px] font-semibold text-[#344054]">
                Profile view notifications
              </p>

              <p className="mt-1.5 text-[11px] leading-5 text-[#98A2B3]">
                Get notified when someone views your
                profile or delivery presence. You can change
                this preference at any time.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={notifyOnView}
              onClick={() => {
                setNotifyOnView((value) => !value);
                markDirty();
              }}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                notifyOnView
                  ? "bg-[#2478FF]"
                  : "bg-[#D0D5DD]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                  notifyOnView
                    ? "left-[22px]"
                    : "left-0.5"
                }`}
              />
            </button>
          </div>

          {isDirty && (
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setNotifyOnView(
                    creator.notifyOnView
                  );
                  setName(creator.name ?? "");
                  setPhone(creator.phone ?? "");
                  setCompanyName(
                    creator.companyName ?? ""
                  );
                  setIsDirty(false);
                  setError(null);
                  setMessage(null);
                }}
                className="text-[11px] font-semibold text-[#667085] hover:text-[#101828]"
              >
                Discard changes
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
  
