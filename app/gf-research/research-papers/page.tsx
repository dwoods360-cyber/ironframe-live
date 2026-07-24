import type { Metadata } from "next";

import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import { listPublicResearchPapers } from "@/app/lib/governanceFrame/researchCatalog";

export const metadata: Metadata = {
  title: "Research papers",
};

export default function ResearchPapersIndexPage() {
  const papers = listPublicResearchPapers();

  return (
    <section aria-labelledby="papers-index-heading" className="max-w-3xl">
      <h1
        id="papers-index-heading"
        className="font-[family-name:var(--font-gf-serif)] text-3xl text-[var(--gf-ink)] sm:text-4xl"
      >
        Research papers
      </h1>
      <p className="mt-4 max-w-2xl font-[family-name:var(--font-gf-sans)] text-[15px] leading-relaxed text-[var(--gf-muted)]">
        Long-form institutional research. Only papers with status PUBLISHED appear here; editorial
        drafts stay private until Approve.
      </p>
      {papers.length === 0 ? (
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
        </ul>
      )}
    </section>
  );
}
