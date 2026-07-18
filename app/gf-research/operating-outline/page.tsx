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
        <h2
          id="ops-heading"
          className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500"
        >
          Operating outline
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
          Roles, tools, and cadence for Governance Frame Research. Plan quarterly, research and
          publish monthly, review weekly, verify every claim, and require human approval before
          release.
        </p>
        <p className="mt-3 flex flex-wrap gap-4">
          <ResearchLink
            href="/editorial-standards"
            className="font-mono text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-200"
          >
            Editorial standards →
          </ResearchLink>
          <ResearchLink
            href="/about"
            className="font-mono text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-200"
          >
            ← About
          </ResearchLink>
        </p>
      </div>

      {outline ? (
        <article className="prose-governance-frame border-t border-slate-800 pt-8">
          <BriefingMarkdown markdown={outline.bodyMarkdown} />
        </article>
      ) : (
        <p className="text-sm text-slate-500">Operating outline manuscript is not public-ready.</p>
      )}
    </section>
  );
}
