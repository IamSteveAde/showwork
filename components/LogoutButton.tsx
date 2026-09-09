"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="
        group inline-flex items-center gap-2
        rounded-full
        border border-[#E4E7EC]
        bg-white
        px-3.5 py-2
        text-xs font-semibold
        text-[#667085]
        shadow-[0_2px_6px_rgba(16,24,40,0.04)]
        transition-all duration-200
        hover:-translate-y-0.5
        hover:border-[#F0CACA]
        hover:bg-[#FFF7F7]
        hover:text-[#B42318]
        hover:shadow-[0_6px_18px_rgba(180,35,24,0.08)]
        focus:outline-none
        focus:ring-2
        focus:ring-[#2478FF]/20
        focus:ring-offset-2
      "
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden="true"
      >
        <path
          d="M10 5H7.2A2.2 2.2 0 0 0 5 7.2v9.6A2.2 2.2 0 0 0 7.2 19H10"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />

        <path
          d="M13 8l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M17 12H9"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>

      <span>Log out</span>
    </button>
  );
}