import Link from "next/link";

const COLOR = { black: "#080808", blue: "#2478FF", lime: "#B8FF35" };

function IconInstagram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconTwitter() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.9 2H22l-7.2 8.2L23.3 22h-6.6l-5.2-6.8L5.5 22H2.4l7.7-8.8L1.7 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.8L7.4 3.9H5.5L17.7 20Z" />
    </svg>
  );
}
function IconLinkedIn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9.75h4v11H3v-11Zm7 0h3.83v1.5h.05c.53-1 1.84-2.06 3.79-2.06 4.06 0 4.81 2.67 4.81 6.14v6.42h-4v-5.7c0-1.36-.02-3.1-1.89-3.1-1.9 0-2.19 1.48-2.19 3v5.8h-4v-11Z" />
    </svg>
  );
}
function IconTikTok() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.6 2h-3.3v13.8c0 1.5-1.2 2.7-2.7 2.7a2.7 2.7 0 0 1 0-5.4c.3 0 .5 0 .8.1V9.8a6.1 6.1 0 0 0-.8 0A6.1 6.1 0 1 0 16.6 15.9V8.5a8 8 0 0 0 4.6 1.5V6.7a4.8 4.8 0 0 1-4.6-4.7Z" />
    </svg>
  );
}
function IconFacebook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V8c0-.9.25-1.5 1.55-1.5H16.7V3.7C16.4 3.66 15.4 3.57 14.2 3.57c-2.4 0-4.05 1.47-4.05 4.16v2.16H7.4V13h2.75v8h3.35Z" />
    </svg>
  );
}

const SOCIALS = [
  { name: "Instagram", href: "https://instagram.com/useshowworkofficial", Icon: IconInstagram },
  { name: "X / Twitter", href: "https://x.com/useshowwork", Icon: IconTwitter },
  { name: "LinkedIn", href: "https://linkedin.com/company/useshowwork", Icon: IconLinkedIn },
  { name: "TikTok", href: "https://tiktok.com/@useshowwork", Icon: IconTikTok },
  { name: "Facebook", href: "https://facebook.com/useshowwork", Icon: IconFacebook },
];

export default function BlogFooter() {
  return (
    <footer className="px-6 py-14 md:px-16" style={{ background: COLOR.black }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-10 border-b border-white/10 pb-10 md:flex-row md:items-start">
          <div>
            <Link href="/" className="text-lg font-bold text-white">
              Show<span style={{ color: COLOR.blue }}>work</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/45">
              Positioned like the premium brand you already are.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 text-sm sm:flex sm:gap-16">
            <div className="flex flex-col gap-2.5">
              <p className="mb-1 text-xs font-bold uppercase text-white/30" style={{ letterSpacing: "0.16em" }}>Explore</p>
              <Link href="/start" className="text-white/60 hover:text-white">Deliver a project</Link>
              <Link href="/signup?next=/dashboard/portfolio" className="text-white/60 hover:text-white">Create portfolio</Link>
              <Link href="/blog" className="text-white/60 hover:text-white">Blog</Link>
              <Link href="/login" className="text-white/60 hover:text-white">Log in</Link>
            </div>
            <div className="flex flex-col gap-2.5">
              <p className="mb-1 text-xs font-bold uppercase text-white/30" style={{ letterSpacing: "0.16em" }}>Contact</p>
              <a href="mailto:hello@useshowwork.com" className="text-white/60 hover:text-white">hello@useshowwork.com</a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-6 pt-8 md:flex-row">
          <span className="text-xs text-white/25">© {new Date().getFullYear()} Showwork. All rights reserved.</span>
          <div className="flex items-center gap-4">
            {SOCIALS.map(({ name, href, Icon }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={name}
                className="text-white/40 transition-colors hover:text-white"
              >
                <Icon />
              </a>
            ))}
          </div>
          <span className="text-xs" style={{ color: COLOR.lime }}>PREMIUM WORK. PRESENTED PROPERLY.</span>
        </div>
      </div>
    </footer>
  );
}