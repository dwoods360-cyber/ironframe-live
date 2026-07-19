import type { Metadata } from "next";

import BriefingMarkdown from "@/app/components/governanceFrame/BriefingMarkdown";
import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import { getEditorialPolicyMarkdown } from "@/app/lib/governanceFrame/researchCatalog";

export const metadata: Metadata = {
  title: "What Governance Frame is",
  description:
    "Governance Frame is an independent governance research and executive education organization — vendor-neutral, evidence-based, and editorially separate from Ironframe product marketing.",
};

export default function ResearchWhatGovernanceFrameIsPage() {
  const charter = getEditorialPolicyMarkdown("what-governance-frame-is");

  return (
    <section aria-labelledby="charter-heading" className="space-y-12">
      <div>
        <p className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-muted)]">
          Charter
        </p>
        <h1
          id="charter-heading"
          className="mt-2 font-[family-name:var(--font-gf-serif)] text-3xl font-semibold tracking-tight text-[var(--gf-ink)] sm:text-4xl"
        >
          What Governance Frame is
        </h1>
        <p className="mt-4 max-w-2xl font-[family-name:var(--font-gf-sans)] text-[15px] leading-relaxed text-[var(--gf-ink-soft)]">
          Mission and identity for Governance Frame Research — independent of Ironframe product
          marketing.
        </p>
        <p className="mt-3 flex flex-wrap gap-4">
          <ResearchLink
            href="/editorial-standards"
            className="font-[family-name:var(--font-gf-sans)] text-sm font-medium text-[var(--gf-accent)] no-underline hover:underline"
          >
            Editorial standards →
          </ResearchLink>
          <ResearchLink
            href="/operating-outline"
            className="font-[family-name:var(--font-gf-sans)] text-sm font-medium text-[var(--gf-accent)] no-underline hover:underline"
          >
            Operating outline →
          </ResearchLink>
          <ResearchLink
            href="/about"
            className="font-[family-name:var(--font-gf-sans)] text-sm font-medium text-[var(--gf-accent)] no-underline hover:underline"
          >
            ← About
          </ResearchLink>
        </p>
      </div>

      {charter ? (
        <article className="border-t border-[var(--gf-line)] pt-8">
          <BriefingMarkdown markdown={charter.bodyMarkdown} tone="institute" />
        </article>
      ) : (
        <p className="font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-muted)]">
          Charter manuscript is not public-ready.
        </p>
      )}
    </section>
  );
}
