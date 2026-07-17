import type { Metadata } from "next";

import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import { listResearchPapers } from "@/app/lib/governanceFrame/researchCatalog";

export const metadata: Metadata = {
  title: "Research papers",
};

export default function ResearchPapersIndexPage() {
  const papers = listResearchPapers();

  return (
    <section aria-labelledby="papers-index-heading">
      <h2
        id="papers-index-heading"
        className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500"
      >
        Research papers · GF series
      </h2>
      <p className="mt-4 max-w-2xl text-sm text-slate-400">
        Long-form institutional research. Only papers with status PUBLISHED are available in full;
        editorial drafts appear as forthcoming entries.
      </p>
      <ul className="mt-8 space-y-3">
        {papers.map((paper) => (
          <li key={paper.slug}>
            <ResearchLink
              href={`/research-papers/${paper.slug}`}
              className="block rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4 hover:border-slate-600"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                {paper.researchId}
                {paper.isPublic ? "" : " · Forthcoming"}
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-slate-50">{paper.title}</p>
              {paper.subtitle ? <p className="mt-1 text-sm text-slate-400">{paper.subtitle}</p> : null}
              {!paper.isPublic ? (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-slate-600">
                  Status: {paper.status}
                  {paper.version ? ` · ${paper.version}` : ""}
                </p>
              ) : null}
            </ResearchLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
