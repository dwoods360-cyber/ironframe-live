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
        <h2
          id="standards-heading"
          className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500"
        >
          Editorial standards
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
          Binding standards for Governance Frame Research. Readers should always be able to
          distinguish what the evidence establishes, what Governance Frame concludes, what remains
          uncertain, and what action is merely recommended.
        </p>
        <p className="mt-3">
          <ResearchLink
            href="/about"
            className="font-mono text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-200"
          >
            ← About Governance Frame
          </ResearchLink>
        </p>
      </div>

      {standards ? (
        <article className="prose-governance-frame border-t border-slate-800 pt-8">
          <BriefingMarkdown markdown={standards.bodyMarkdown} />
        </article>
      ) : (
        <p className="text-sm text-slate-500">Editorial standards manuscript is not public-ready.</p>
      )}

      <div>
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
          Related policy notes
        </h3>
        <ul className="mt-4 space-y-3">
          {related.map((doc) => (
            <li
              key={doc.id}
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4"
            >
              <p className="font-mono text-sm font-bold text-slate-50">{doc.title}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                {doc.ready ? "Public-ready" : "Under editorial review"}
              </p>
              <p className="mt-2 font-mono text-[10px] text-slate-600">{doc.relativePath}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
