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
    <section aria-labelledby="methodology-heading" className="max-w-3xl">
      <h1
        id="methodology-heading"
        className="font-[family-name:var(--font-gf-serif)] text-3xl text-[var(--gf-ink)] sm:text-4xl"
      >
        Research methodology
      </h1>
      <p className="mt-4 max-w-2xl font-[family-name:var(--font-gf-sans)] text-[15px] leading-relaxed text-[var(--gf-muted)]">
        Governance Frame publishes evidence-based institutional analysis. Methodology and citation
        standards are maintained in the canonical repository and appear here once approved for public
        release.
      </p>

      <ul className="mt-8 divide-y divide-[var(--gf-line)] border-y border-[var(--gf-line)]">
        {docs.map((doc) => (
          <li key={doc.id} className="py-5">
            <p className="font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink)]">
              {doc.title}
            </p>
            <p className="mt-1 font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.12em] text-[var(--gf-muted)]">
              {doc.ready ? "Public-ready" : "Under editorial review"}
            </p>
            <p className="mt-2 font-[family-name:var(--font-gf-sans)] text-xs text-[var(--gf-muted)]">
              {doc.relativePath}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
