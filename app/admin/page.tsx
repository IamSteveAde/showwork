import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

export default async function AdminPage() {
  const currentCreator = await getCurrentCreator();

  if (!currentCreator) {
    redirect("/login");
  }

  if (!isAdminEmail(currentCreator.email)) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-[#101828]">
      <header className="sticky top-0 z-50 border-b border-[#E4E7EC] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[72px] w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#101828] text-sm font-black text-white">
              S
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-[-0.02em]">
                Showwork
              </p>

              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">
                Admin command center
              </p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex min-h-10 items-center rounded-xl border border-[#D0D5DD] bg-white px-4 text-xs font-semibold text-[#344054] transition hover:bg-[#F9FAFB]"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1400px] px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <section className="rounded-[28px] border border-[#E4E7EC] bg-white p-6 shadow-[0_8px_30px_rgba(16,24,40,0.035)] sm:p-8 lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D9E6FF] bg-[#EEF4FF] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2478FF]" />

            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#175CD3]">
              Admin access confirmed
            </span>
          </div>

          <h1 className="mt-5 text-[32px] font-semibold tracking-[-0.045em] text-[#101828] sm:text-[42px]">
            Admin dashboard
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#667085]">
            The admin dashboard is loading successfully. This is a temporary
            lightweight version used to verify the production runtime.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminArea
              href="/admin/activity"
              title="Activity"
              description="Review platform activity."
            />

            <AdminArea
              href="/admin/social-calendars"
              title="Content Workspaces"
              description="Manage client workspaces."
            />

            <AdminArea
              href="/admin/creativo"
              title="Creativo"
              description="Manage the creator community."
            />

            <AdminArea
              href="/admin/blog"
              title="Blog"
              description="Manage editorial content."
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminArea({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-[#E4E7EC] bg-[#F9FAFB] p-4 transition hover:border-[#B2DDFF] hover:bg-[#F5F9FF]"
    >
      <p className="text-sm font-semibold text-[#101828] group-hover:text-[#175CD3]">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-[#667085]">
        {description}
      </p>
    </Link>
  );
}