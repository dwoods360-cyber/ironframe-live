import type { Metadata } from "next";

import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import {
  listEditorialPolicyDocs,
  listPublicResearchPapers,
} from "@/app/lib/governanceFrame/researchCatalog";

export const metadata: Metadata = {
  title: "Sources and corrections",
};

export default function ResearchSourcesAndCorrectionsPage() {
  const corrections = listEditorialPolicyDocs().find((doc) => doc.id === "corrections-policy");
  const papers = listPublicResearchPapers();

  return (
    <section aria-labelledby="sources-heading" className="max-w-3xl">
      <h1
        id="sources-heading"
        className="font-[family-name:var(--font-gf-serif)] text-3xl text-[var(--gf-ink)] sm:text-4xl"
      >
        Sources and corrections
      </h1>
      <p className="mt-4 max-w-2xl font-[family-name:var(--font-gf-sans)] text-[15px] leading-relaxed text-[var(--gf-ink-soft)]">
        Each published research package maintains a source-verification ledger and reference list in
        the canonical repository. Corrections are published when primary sources supersede prior
        citations.
      </p>

      <div className="mt-8 border-y border-[var(--gf-line)] py-5">
        <p className="font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink)]">
          {corrections?.title ?? "Corrections Policy"}
        </p>
        <p className="mt-1 font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.12em] text-[var(--gf-muted)]">
          {corrections?.ready ? "Public-ready" : "Under editorial review"}
        </p>
        {corrections ? (
          <p className="mt-2 font-[family-name:var(--font-gf-sans)] text-xs text-[var(--gf-muted)]">
            {corrections.relativePath}
          </p>
        ) : null}
      </div>

      <h2 className="mt-10 font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-muted)]">
        Package ledgers
      </h2>
      {papers.length === 0 ? (
        <p className="mt-4 font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-muted)]">
          No published research papers yet — package ledgers appear here after Approve.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--gf-line)] border-y border-[var(--gf-line)]">
          {papers.map((paper) => (
            <li key={paper.slug} className="py-5">
              <p className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-accent)]">
                {paper.researchId}
              </p>
              <p className="mt-1 font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink)]">
                {paper.title}
              </p>
              <p className="mt-2 font-[family-name:var(--font-gf-sans)] text-xs text-[var(--gf-muted)]">
                {paper.packagePath}/source-ledger.md
              </p>
              <ResearchLink
                href={`/research-papers/${paper.slug}`}
                className="mt-2 inline-block font-[family-name:var(--font-gf-sans)] text-sm font-medium text-[var(--gf-accent)] no-underline hover:underline"
              >
                Open paper →
              </ResearchLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
