import type { Metadata } from "next";

import BriefingMarkdown from "@/app/components/governanceFrame/BriefingMarkdown";
import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import { getEditorialPolicyMarkdown } from "@/app/lib/governanceFrame/researchCatalog";

export const metadata: Metadata = {
  title: "Operating outline",
  description:
    "Governance Frame Operating Outline — roles, tools, and cadence for research, verification, and human-approved publication.",
};

export default function ResearchOperatingOutlinePage() {
  const outline = getEditorialPolicyMarkdown("operating-outline");

  return (
    <section aria-labelledby="ops-heading" className="space-y-12">
      <div>
        <p className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-muted)]">
          Operations
        </p>
        <h1
          id="ops-heading"
          className="mt-2 font-[family-name:var(--font-gf-serif)] text-3xl font-semibold tracking-tight text-[var(--gf-ink)] sm:text-4xl"
        >
          Operating outline
        </h1>
        <p className="mt-4 max-w-2xl font-[family-name:var(--font-gf-sans)] text-[15px] leading-relaxed text-[var(--gf-ink-soft)]">
          Roles, tools, and cadence for Governance Frame Research. Plan quarterly, research and
          publish monthly, review weekly, verify every claim, and require human approval before
          release.
        </p>
        <p className="mt-3 flex flex-wrap gap-4">
          <ResearchLink
            href="/editorial-standards"
            className="font-[family-name:var(--font-gf-sans)] text-sm font-medium text-[var(--gf-accent)] no-underline hover:underline"
          >
            Editorial standards →
          </ResearchLink>
          <ResearchLink
            href="/about"
            className="font-[family-name:var(--font-gf-sans)] text-sm font-medium text-[var(--gf-accent)] no-underline hover:underline"
          >
            ← About
          </ResearchLink>
        </p>
      </div>

      {outline ? (
        <article className="border-t border-[var(--gf-line)] pt-8">
          <BriefingMarkdown markdown={outline.bodyMarkdown} tone="institute" />
        </article>
      ) : (
        <p className="font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-muted)]">
          Operating outline manuscript is not public-ready.
        </p>
      )}
    </section>
  );
}
