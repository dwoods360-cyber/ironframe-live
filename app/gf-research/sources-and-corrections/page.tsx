import type { Metadata } from "next";

import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import { listEditorialPolicyDocs, listResearchPapers } from "@/app/lib/governanceFrame/researchCatalog";

export const metadata: Metadata = {
  title: "Sources and corrections",
};

export default function ResearchSourcesAndCorrectionsPage() {
  const corrections = listEditorialPolicyDocs().find((doc) => doc.id === "corrections-policy");
  const papers = listResearchPapers();

  return (
    <section aria-labelledby="sources-heading">
      <h2
        id="sources-heading"
        className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500"
      >
        Sources and corrections
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
        Each research package maintains a source-verification ledger and reference list in the
        canonical repository. Corrections are published when primary sources supersede prior
        citations.
      </p>

      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4">
        <p className="font-mono text-sm font-bold text-slate-50">
          {corrections?.title ?? "Corrections Policy"}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
          {corrections?.ready ? "Public-ready" : "Under editorial review"}
        </p>
        {corrections ? (
          <p className="mt-2 font-mono text-[10px] text-slate-600">{corrections.relativePath}</p>
        ) : null}
      </div>

      <h3 className="mt-10 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
        Package ledgers
      </h3>
      <ul className="mt-4 space-y-3">
        {papers.map((paper) => (
          <li
            key={paper.slug}
            className="rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              {paper.researchId}
            </p>
            <p className="mt-1 font-mono text-sm text-slate-200">{paper.title}</p>
            <p className="mt-2 font-mono text-[10px] text-slate-600">
              {paper.packagePath}/source-ledger.md
            </p>
            {paper.isPublic ? (
              <ResearchLink
                href={`/research-papers/${paper.slug}`}
                className="mt-2 inline-block font-mono text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-200"
              >
                Open paper →
              </ResearchLink>
            ) : (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-slate-600">
                Manuscript not yet public · ledger remains in repository
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
