import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import { fetchPublishedBriefings } from "@/app/lib/governanceFrame/briefingLoader";
import { listResearchPapers, listResearchSeries } from "@/app/lib/governanceFrame/researchCatalog";

export const dynamic = "force-dynamic";

export default async function GovernanceFrameResearchHomePage() {
  const [papers, series, briefings] = await Promise.all([
    Promise.resolve(listResearchPapers()),
    Promise.resolve(listResearchSeries()),
    fetchPublishedBriefings(),
  ]);

  const publicPapers = papers.filter((paper) => paper.isPublic);
  const forthcomingPapers = papers.filter((paper) => !paper.isPublic);

  return (
    <div className="space-y-12">
      <section aria-labelledby="gf-home-heading">
        <h2
          id="gf-home-heading"
          className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500"
        >
          Publication home
        </h2>
        <p className="mt-4 max-w-2xl font-sans text-sm leading-relaxed text-slate-300">
          Institutional research papers, industry briefings, series, and editorial standards from
          Governance Frame Research — the independent research and editorial publication of Ironframe
          GRC.
        </p>
      </section>

      <section aria-labelledby="gf-papers-heading" className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h3
            id="gf-papers-heading"
            className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500"
          >
            Research papers
          </h3>
          <ResearchLink
            href="/research-papers"
            className="font-mono text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-200"
          >
            View all
          </ResearchLink>
        </div>
        {publicPapers.length === 0 && forthcomingPapers.length === 0 ? (
          <p className="text-sm text-slate-500">No research papers registered yet.</p>
        ) : (
          <ul className="space-y-3">
            {publicPapers.map((paper) => (
              <li key={paper.slug}>
                <ResearchLink
                  href={`/research-papers/${paper.slug}`}
                  className="block rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4 hover:border-slate-600"
                >
                  <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    {paper.researchId}
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-50">{paper.title}</p>
                </ResearchLink>
              </li>
            ))}
            {forthcomingPapers.map((paper) => (
              <li
                key={paper.slug}
                className="rounded-xl border border-slate-800/80 px-5 py-4 text-slate-400"
              >
                <p className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
                  {paper.researchId} · Forthcoming
                </p>
                <p className="mt-1 font-mono text-sm text-slate-300">{paper.title}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-600">
                  Status: {paper.status}
                  {paper.version ? ` · ${paper.version}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="gf-briefings-heading" className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h3
            id="gf-briefings-heading"
            className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500"
          >
            Published briefings
          </h3>
          <ResearchLink
            href="/briefings"
            className="font-mono text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-200"
          >
            View all
          </ResearchLink>
        </div>
        {briefings.length === 0 ? (
          <p className="text-sm text-slate-500">No published briefings yet.</p>
        ) : (
          <ul className="space-y-3">
            {briefings.slice(-5).reverse().map((briefing) => (
              <li key={briefing.slug}>
                <ResearchLink
                  href={`/briefings/${briefing.slug}`}
                  className="block rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4 hover:border-slate-600"
                >
                  <p className="font-mono text-sm font-bold text-slate-50">{briefing.title}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    {briefing.slug}
                  </p>
                </ResearchLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="gf-series-heading" className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h3
            id="gf-series-heading"
            className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500"
          >
            Series
          </h3>
          <ResearchLink
            href="/series"
            className="font-mono text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-200"
          >
            View all
          </ResearchLink>
        </div>
        <ul className="space-y-3">
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
    </div>
  );
}
