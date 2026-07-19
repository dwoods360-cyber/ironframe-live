import type { Metadata } from "next";

import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import { listResearchSeries } from "@/app/lib/governanceFrame/researchCatalog";

export const metadata: Metadata = {
  title: "Series",
};

export default function ResearchSeriesIndexPage() {
  const series = listResearchSeries();

  return (
    <section aria-labelledby="series-index-heading" className="max-w-3xl">
      <h1
        id="series-index-heading"
        className="font-[family-name:var(--font-gf-serif)] text-3xl text-[var(--gf-ink)] sm:text-4xl"
      >
        Research series
      </h1>
      <p className="mt-4 max-w-2xl font-[family-name:var(--font-gf-sans)] text-[15px] leading-relaxed text-[var(--gf-ink-soft)]">
        Multi-installment research programs. Published installments link to the briefing ledger.
      </p>
      <ul className="mt-8 divide-y divide-[var(--gf-line)] border-y border-[var(--gf-line)]">
        {series.map((item) => (
          <li key={item.seriesId}>
            <ResearchLink
              href={`/series/${item.seriesId}`}
              className="block py-5 no-underline transition hover:bg-white/40"
            >
              <p className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-accent)]">
                {item.seriesId}
              </p>
              <p className="mt-1 font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink)]">
                {item.title}
              </p>
              <p className="mt-1 font-[family-name:var(--font-gf-sans)] text-xs text-[var(--gf-muted)]">
                {item.installments.length} installment
                {item.installments.length === 1 ? "" : "s"}
              </p>
            </ResearchLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
