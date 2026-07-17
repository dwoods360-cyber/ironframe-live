import type { Metadata } from "next";

import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import { listResearchSeries } from "@/app/lib/governanceFrame/researchCatalog";

export const metadata: Metadata = {
  title: "Series",
};

export default function ResearchSeriesIndexPage() {
  const series = listResearchSeries();

  return (
    <section aria-labelledby="series-index-heading">
      <h2
        id="series-index-heading"
        className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500"
      >
        Research series
      </h2>
      <ul className="mt-8 space-y-3">
        {series.map((item) => (
          <li key={item.seriesId}>
            <ResearchLink
              href={`/series/${item.seriesId}`}
              className="block rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4 hover:border-slate-600"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                {item.seriesId}
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-slate-50">{item.title}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-600">
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
