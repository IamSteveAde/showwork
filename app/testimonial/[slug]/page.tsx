import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import TestimonialSubmitForm from "@/components/portfolio/TestimonialSubmitForm";

const COLOR = { black: "#0A0A0A", gold: "#F5C842", charcoal: "#1A1A1A" };

export default async function TestimonialSubmitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const portfolio = await db.portfolio.findUnique({
    where: { slug },
    select: { slug: true, companyName: true, logoUrl: true, primaryColor: true },
  });

  if (!portfolio) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16" style={{ background: COLOR.black }}>
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          {portfolio.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portfolio.logoUrl} alt={portfolio.companyName} className="mx-auto mb-5 h-8 w-auto" />
          ) : (
            <p className="mb-5 text-lg font-semibold text-white">{portfolio.companyName}</p>
          )}
          <h1 className="text-2xl font-bold text-white">Leave a testimonial</h1>
          <p className="mt-2 text-sm text-white/50">
            A quick note about what it was like working with {portfolio.companyName} —
            it might end up featured on their portfolio.
          </p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: COLOR.charcoal }}>
          <TestimonialSubmitForm portfolioSlug={portfolio.slug} accentColor={portfolio.primaryColor ?? COLOR.gold} />
        </div>
      </div>
    </main>
  );
}