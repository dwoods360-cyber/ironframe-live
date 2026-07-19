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
    <section aria-labelledby="series-heading" className="max-w-3xl">
      <ResearchLink
        href="/series"
        className="font-[family-name:var(--font-gf-sans)] text-sm font-medium text-[var(--gf-accent)] no-underline hover:underline"
      >
        ← All series
      </ResearchLink>
      <p className="mt-6 font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-muted)]">
        {series.seriesId}
      </p>
      <h1
        id="series-heading"
        className="mt-2 font-[family-name:var(--font-gf-serif)] text-3xl font-semibold tracking-tight text-[var(--gf-ink)] sm:text-4xl"
      >
        {series.title}
      </h1>

      <ol className="mt-8 divide-y divide-[var(--gf-line)] border-y border-[var(--gf-line)]">
        {series.installments.map((installment) => (
          <li key={installment.packageId} className="py-5">
            <p className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-muted)]">
              {installment.packageId}
              {installment.status ? ` · ${installment.status}` : ""}
            </p>
            <p className="mt-1 font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-ink-soft)]">
              {[installment.era, installment.yearRange].filter(Boolean).join(" · ")}
            </p>
            {installment.publishedSlug ? (
              <ResearchLink
                href={`/briefings/${installment.publishedSlug}`}
                className="mt-2 inline-block font-[family-name:var(--font-gf-sans)] text-sm font-medium text-[var(--gf-accent)] no-underline hover:underline"
              >
                Read published briefing →
              </ResearchLink>
            ) : (
              <p className="mt-2 font-[family-name:var(--font-gf-sans)] text-xs text-[var(--gf-muted)]">
                Not yet on the public ledger
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
