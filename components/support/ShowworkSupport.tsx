"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const WHATSAPP_NUMBER = "2347018819588";

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M20.52 3.449A11.86 11.86 0 0 0 12.058 0C5.5 0 .164 5.337.162 11.895c0 2.097.547 4.144 1.587 5.948L.06 24l6.3-1.653a11.86 11.86 0 0 0 5.692 1.45h.005c6.557 0 11.893-5.337 11.895-11.895a11.85 11.85 0 0 0-3.432-8.453Zm-8.462 18.277h-.004a9.84 9.84 0 0 1-5.015-1.372l-.36-.214-3.74.981.998-3.646-.234-.374a9.86 9.86 0 0 1-1.512-5.205C2.193 6.46 6.61 2.043 12.063 2.043a9.82 9.82 0 0 1 6.987 2.897 9.82 9.82 0 0 1 2.892 6.992c-.002 5.454-4.419 9.794-9.884 9.794Zm5.407-7.349c-.296-.148-1.753-.865-2.025-.964-.272-.099-.47-.148-.667.149-.198.296-.766.964-.939 1.162-.173.198-.346.223-.642.074-.296-.148-1.252-.462-2.385-1.473-.882-.787-1.477-1.758-1.65-2.054-.173-.296-.018-.456.13-.604.134-.133.296-.346.445-.519.148-.173.198-.297.297-.495.099-.198.05-.371-.025-.519-.074-.148-.667-1.607-.914-2.202-.241-.579-.486-.5-.667-.509-.173-.009-.371-.01-.568-.01-.198 0-.519.074-.791.371-.272.296-1.038 1.014-1.038 2.473s1.063 2.869 1.211 3.067c.148.198 2.092 3.194 5.071 4.481.709.306 1.262.489 1.693.626.712.226 1.36.194 1.872.118.571-.085 1.753-.717 2.001-1.41.247-.692.247-1.285.173-1.409-.074-.123-.272-.197-.568-.346Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5.5 14.5 14.5 5.5M7 5.5h7.5V13"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 5l10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ShowworkSupport() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /*
   * Support should be available throughout the authenticated
   * Showwork application, but not on public/authentication pages.
   */
  const hiddenRoutes = [
    "/login",
    "/signup",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify",
    "/auth",
  ];

  const isHiddenRoute =
    !pathname ||
    hiddenRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );

  if (!mounted || isHiddenRoute) {
    return null;
  }

  const message = encodeURIComponent(
    [
      "Hello Showwork Support 👋",
      "",
      "I'm using Showwork and I'd like some assistance with my account.",
      "",
      "Could you please help me?",
      "",
      `Page: ${pathname}`,
    ].join("\n"),
  );

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

  return (
    <>
      {/* Desktop / tablet edge control */}
      <div
        className={`
          fixed right-0 top-1/2 z-[90]
          hidden -translate-y-1/2 sm:block
          transition-all duration-300 ease-out
          ${open ? "translate-x-0" : "translate-x-[8px]"}
        `}
      >
        <div className="relative">
          {/* Expanded support card */}
          <div
            className={`
              absolute right-[42px] top-1/2
              -translate-y-1/2
              origin-right
              transition-all duration-300 ease-out
              ${
                open
                  ? "pointer-events-auto scale-100 opacity-100"
                  : "pointer-events-none scale-95 opacity-0"
              }
            `}
          >
            <div
              className="
                w-[230px]
                rounded-[18px]
                border border-[#E4EAF2]
                bg-white/95
                p-3
                shadow-[0_18px_55px_rgba(15,23,42,0.13)]
                backdrop-blur-xl
              "
            >
              <div className="flex items-center gap-3 px-1 py-1.5">
                <div
                  className="
                    flex h-9 w-9 shrink-0 items-center justify-center
                    rounded-xl
                    bg-[#EAF8EF]
                    text-[#25D366]
                  "
                >
                  <WhatsAppIcon className="h-[18px] w-[18px]" />
                </div>

                <div className="min-w-0">
                  <p className="text-[12px] font-bold tracking-[-0.01em] text-[#101828]">
                    Need some help?
                  </p>
                  <p className="mt-0.5 text-[10px] leading-4 text-[#8A94A6]">
                    Chat with Showwork Support
                  </p>
                </div>
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  mt-2.5 flex w-full items-center justify-between
                  rounded-[12px]
                  bg-[#25D366]
                  px-3.5 py-2.5
                  text-[11px] font-bold text-white
                  shadow-[0_7px_18px_rgba(37,211,102,0.18)]
                  transition-all duration-200
                  hover:-translate-y-[1px]
                  hover:bg-[#20BD5A]
                  hover:shadow-[0_10px_22px_rgba(37,211,102,0.23)]
                "
              >
                <span className="flex items-center gap-2">
                  <WhatsAppIcon className="h-3.5 w-3.5" />
                  Chat on WhatsApp
                </span>

                <ArrowIcon className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Edge tab */}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close Showwork Support" : "Open Showwork Support"}
            aria-expanded={open}
            className="
              group
              relative
              flex h-[76px] w-[38px]
              items-center justify-center
              rounded-l-[14px]
              border border-r-0 border-[#DCE5F0]
              bg-white/90
              text-[#667085]
              shadow-[-6px_10px_30px_rgba(15,23,42,0.08)]
              backdrop-blur-xl
              transition-all duration-300
              hover:w-[43px]
              hover:bg-white
              hover:text-[#2478FF]
              focus:outline-none
              focus:ring-2
              focus:ring-[#2478FF]/20
            "
          >
            {/* subtle availability indicator */}
            <span
              className="
                absolute right-[5px] top-[10px]
                h-[5px] w-[5px]
                rounded-full
                bg-[#25D366]
                shadow-[0_0_0_3px_rgba(37,211,102,0.10)]
              "
            />

            <span
              className="
                flex h-8 w-8 items-center justify-center
                rounded-[10px]
                transition-all duration-300
                group-hover:scale-105
                group-hover:bg-[#F1F6FF]
              "
            >
              {open ? (
                <CloseIcon className="h-[16px] w-[16px]" />
              ) : (
                <WhatsAppIcon className="h-[16px] w-[16px]" />
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile edge control */}
      <div
        className="
          fixed right-0 top-1/2 z-[90]
          -translate-y-1/2
          sm:hidden
        "
      >
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with Showwork Support on WhatsApp"
          className="
            flex h-[52px] w-[34px]
            items-center justify-center
            rounded-l-[14px]
            border border-r-0 border-[#DCE5F0]
            bg-white/95
            text-[#25D366]
            shadow-[-5px_8px_24px_rgba(15,23,42,0.10)]
            backdrop-blur-xl
            transition-transform duration-200
            active:scale-95
          "
        >
          <span className="relative">
            <WhatsAppIcon className="h-[17px] w-[17px]" />

            <span
              className="
                absolute -right-1.5 -top-1.5
                h-1.5 w-1.5
                rounded-full
                bg-[#2478FF]
              "
            />
          </span>
        </a>
      </div>
    </>
  );
}