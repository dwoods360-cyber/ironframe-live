import type { Metadata } from "next";

import BriefingMarkdown from "@/app/components/governanceFrame/BriefingMarkdown";
import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import {
  getEditorialPolicyMarkdown,
  listEditorialPolicyDocs,
} from "@/app/lib/governanceFrame/researchCatalog";

export const metadata: Metadata = {
  title: "Editorial standards",
  description:
    "Governance Frame Editorial Standards — independence, evidence, citation, regulatory precision, publication workflow, and the core credibility rule.",
};

export default function ResearchEditorialStandardsPage() {
  const standards = getEditorialPolicyMarkdown("editorial-standards");
  const related = listEditorialPolicyDocs().filter((doc) =>
    [
      "what-governance-frame-is",
      "operating-outline",
      "editorial-charter",
      "editorial-independence",
      "conflicts-of-interest",
      "corrections-policy",
      "editorial-style-guide",
      "citation-standard",
      "verification-protocol",
      "research-methodology",
    ].includes(doc.id),
  );

  return (
    <section aria-labelledby="standards-heading" className="space-y-12">
      <div>
        <p className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-muted)]">
          Standards
        </p>
        <h1
          id="standards-heading"
          className="mt-2 font-[family-name:var(--font-gf-serif)] text-3xl font-semibold tracking-tight text-[var(--gf-ink)] sm:text-4xl"
        >
          Editorial standards
        </h1>
        <p className="mt-4 max-w-2xl font-[family-name:var(--font-gf-sans)] text-[15px] leading-relaxed text-[var(--gf-ink-soft)]">
          Binding standards for Governance Frame Research. Readers should always be able to
          distinguish what the evidence establishes, what Governance Frame concludes, what remains
          uncertain, and what action is merely recommended.
        </p>
        <p className="mt-3">
          <ResearchLink
            href="/about"
            className="font-[family-name:var(--font-gf-sans)] text-sm font-medium text-[var(--gf-accent)] no-underline hover:underline"
          >
            ← About Governance Frame
          </ResearchLink>
        </p>
      </div>

      {standards ? (
        <article className="border-t border-[var(--gf-line)] pt-8">
          <BriefingMarkdown markdown={standards.bodyMarkdown} tone="institute" />
        </article>
      ) : (
        <p className="font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-muted)]">
          Editorial standards manuscript is not public-ready.
        </p>
      )}

      <div>
        <h2 className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-muted)]">
          Related policy notes
        </h2>
        <ul className="mt-4 space-y-3">
          {related.map((doc) => (
            <li
              key={doc.id}
              className="border-b border-[var(--gf-line)] px-1 py-4 last:border-0"
            >
              <p className="font-[family-name:var(--font-gf-serif)] text-base font-semibold text-[var(--gf-ink)]">
                {doc.title}
              </p>
              <p className="mt-1 font-[family-name:var(--font-gf-sans)] text-xs font-medium uppercase tracking-[0.12em] text-[var(--gf-muted)]">
                {doc.ready ? "Public-ready" : "Under editorial review"}
              </p>
              <p className="mt-2 font-[family-name:var(--font-gf-sans)] text-xs text-[var(--gf-muted)]">
                {doc.relativePath}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
