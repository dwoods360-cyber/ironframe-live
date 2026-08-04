import type { Metadata } from "next";

import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import { fetchPublishedBriefings } from "@/app/lib/governanceFrame/briefingLoader";
import { classifyPublishedLedgerItem } from "@/app/lib/governanceFrame/publishedLedgerKind";
import { listPublicResearchPapers } from "@/app/lib/governanceFrame/researchCatalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Research papers",
};

export default async function ResearchPapersIndexPage() {
  const [papers, ledger] = await Promise.all([
    Promise.resolve(listPublicResearchPapers()),
    fetchPublishedBriefings(),
  ]);

  const industryResearch = ledger.filter(
    (item) =>
      classifyPublishedLedgerItem(item.markdown, item.slug, item.title) === "industry_research",
  );

  const hasAny = papers.length > 0 || industryResearch.length > 0;

  return (
    <section aria-labelledby="papers-index-heading" className="max-w-3xl">
      <h1
        id="papers-index-heading"
        className="font-[family-name:var(--font-gf-serif)] text-3xl text-[var(--gf-ink)] sm:text-4xl"
      >
        Research papers
      </h1>
      <p className="mt-4 max-w-2xl font-[family-name:var(--font-gf-sans)] text-[15px] leading-relaxed text-[var(--gf-muted)]">
        Long-form institutional research and industry research briefs. Formal manuscripts appear only
        when status is PUBLISHED; editorial drafts stay private until Approve.
      </p>
      {!hasAny ? (
        <p className="mt-8 font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-muted)]">
          No published research papers yet.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-[var(--gf-line)] border-y border-[var(--gf-line)]">
          {papers.map((paper) => (
            <li key={paper.slug}>
              <ResearchLink
                href={`/research-papers/${paper.slug}`}
                className="block py-5 no-underline transition hover:bg-white/40"
              >
                <p className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-accent)]">
                  {paper.researchId}
                </p>
                <p className="mt-1 font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink)]">
                  {paper.title}
                </p>
                {paper.subtitle ? (
                  <p className="mt-1 font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-muted)]">
                    {paper.subtitle}
                  </p>
                ) : null}
              </ResearchLink>
            </li>
          ))}
          {industryResearch.map((item) => (
            <li key={item.slug}>
              <ResearchLink
                href={`/briefings/${item.slug}`}
                className="block py-5 no-underline transition hover:bg-white/40"
              >
                <p className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-accent)]">
                  Industry research brief
                </p>
                <p className="mt-1 font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink)]">
                  {item.title}
                </p>
                <p className="mt-1 font-[family-name:var(--font-gf-sans)] text-xs text-[var(--gf-muted)]">
                  {item.slug}
                </p>
              </ResearchLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
