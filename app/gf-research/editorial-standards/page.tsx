import type { Metadata } from "next";

import { listEditorialPolicyDocs } from "@/app/lib/governanceFrame/researchCatalog";

export const metadata: Metadata = {
  title: "Editorial standards",
};

export default function ResearchEditorialStandardsPage() {
  const docs = listEditorialPolicyDocs().filter((doc) =>
    [
      "editorial-charter",
      "editorial-independence",
      "conflicts-of-interest",
      "editorial-style-guide",
    ].includes(doc.id),
  );

  return (
    <section aria-labelledby="standards-heading">
      <h2
        id="standards-heading"
        className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500"
      >
        Editorial standards
      </h2>
      <div className="mt-4 max-w-2xl space-y-3 text-sm leading-relaxed text-slate-400">
        <p>
          Governance Frame research must remain editorially distinguishable from Ironframe product
          development and commercial operations.
        </p>
        <p>
          Conclusions are not determined by product requirements. Commercial relationships are
          disclosed where relevant. Regulatory requirements are distinguished from architectural
          recommendations.
        </p>
      </div>

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
