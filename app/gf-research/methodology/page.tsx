import type { Metadata } from "next";

import { listEditorialPolicyDocs } from "@/app/lib/governanceFrame/researchCatalog";

export const metadata: Metadata = {
  title: "Methodology",
};

export default function ResearchMethodologyPage() {
  const docs = listEditorialPolicyDocs().filter((doc) =>
    ["research-methodology", "citation-standard", "verification-protocol"].includes(doc.id),
  );

  return (
    <section aria-labelledby="methodology-heading">
      <h2
        id="methodology-heading"
        className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500"
      >
        Research methodology
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
        Governance Frame publishes evidence-based institutional analysis. Methodology and citation
        standards are maintained in the canonical repository and appear here once approved for public
        release.
      </p>

      <ul className="mt-8 space-y-3">
        {docs.map((doc) => (
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
    </section>
  );
}
