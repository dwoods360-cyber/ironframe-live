import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import { getResearchSeries, listResearchSeries } from "@/app/lib/governanceFrame/researchCatalog";

type PageProps = {
  params: Promise<{ seriesId: string }>;
};

export function generateStaticParams() {
  return listResearchSeries().map((series) => ({ seriesId: series.seriesId }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { seriesId } = await params;
  const series = getResearchSeries(seriesId);
  return { title: series?.title ?? "Series" };
}

export default async function ResearchSeriesPage({ params }: PageProps) {
  const { seriesId } = await params;
  const series = getResearchSeries(seriesId);
  if (!series) notFound();

  return (
    <section aria-labelledby="series-heading">
      <ResearchLink
        href="/series"
        className="font-mono text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-300"
      >
        ← All series
      </ResearchLink>
      <h2
        id="series-heading"
        className="mt-6 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500"
      >
        {series.seriesId}
      </h2>
      <h1 className="mt-3 font-mono text-2xl font-bold tracking-tight text-slate-50">
        {series.title}
      </h1>

      <ol className="mt-8 space-y-3">
        {series.installments.map((installment) => (
          <li
            key={installment.packageId}
            className="rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              {installment.packageId}
              {installment.status ? ` · ${installment.status}` : ""}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {[installment.era, installment.yearRange].filter(Boolean).join(" · ")}
            </p>
            {installment.publishedSlug ? (
              <ResearchLink
                href={`/briefings/${installment.publishedSlug}`}
                className="mt-2 inline-block font-mono text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-200"
              >
                Read published briefing →
              </ResearchLink>
            ) : (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-slate-600">
                Not yet on the public ledger
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
