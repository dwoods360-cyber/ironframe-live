import type { Metadata } from "next";

import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Governance Frame is: independent governance research and executive education — vendor-neutral, evidence-based, editorially independent from Ironframe product marketing.",
};

export default function ResearchAboutPage() {
  return (
    <section aria-labelledby="about-heading" className="space-y-10">
      <div className="max-w-2xl border-b border-[var(--gf-line)] pb-8">
        <p className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gf-accent)]">
          About the publication
        </p>
        <h1
          id="about-heading"
          className="mt-3 font-[family-name:var(--font-gf-serif)] text-3xl text-[var(--gf-ink)] sm:text-4xl"
        >
          Governance Frame
        </h1>
        <p className="mt-4 font-[family-name:var(--font-gf-serif)] text-lg leading-snug text-[var(--gf-ink-soft)]">
          An independent governance research and executive education organization — not a software
          company.
        </p>
      </div>

      <div className="max-w-2xl space-y-4 font-[family-name:var(--font-gf-sans)] text-[15px] leading-relaxed text-[var(--gf-ink-soft)]">
        <p>
          Governance Frame improves how organizations understand governance, risk, compliance,
          operational resilience, evidence, and executive decision-making. Its mission is to explain
          why organizations repeatedly fail in the same ways — and how better governance
          architectures can reduce those failures.
        </p>
        <p>
          The tone is vendor-neutral, research-driven, evidence-based, and institutionally credible.
          It is not an Ironframe marketing site, a sales blog, an SEO article mill, a compliance-news
          feed, or a GRC product comparison site.
        </p>
      </div>

      <div className="max-w-2xl space-y-3">
        <h2 className="font-[family-name:var(--font-gf-serif)] text-xl text-[var(--gf-ink)]">
          Relationship to Ironframe
        </h2>
        <p className="font-[family-name:var(--font-gf-sans)] text-[15px] leading-relaxed text-[var(--gf-ink-soft)]">
          Governance Frame publishes research for industry. Ironframe demonstrates one implementation
          approach of principles discussed in that research. Ironframe should almost never be the
          subject of Governance Frame articles. When product architecture appears, it is labeled and
          does not represent a regulatory requirement.
        </p>
      </div>

      <div className="max-w-2xl border-y border-[var(--gf-line)] py-6">
        <h2 className="font-[family-name:var(--font-gf-serif)] text-xl text-[var(--gf-ink)]">
          Content pillars
        </h2>
        <ul className="mt-3 space-y-1.5 font-[family-name:var(--font-gf-sans)] text-[15px] text-[var(--gf-ink-soft)]">
          <li>Industry research papers</li>
          <li>Industry briefings</li>
          <li>Executive storytelling</li>
          <li>Newsletters</li>
          <li>Video, training, and industry reports (over time)</li>
        </ul>
      </div>

      <div className="max-w-2xl space-y-3">
        <h2 className="font-[family-name:var(--font-gf-serif)] text-xl text-[var(--gf-ink)]">
          Editorial principles
        </h2>
        <ul className="list-disc space-y-1 pl-5 font-[family-name:var(--font-gf-sans)] text-[15px] text-[var(--gf-ink-soft)]">
          <li>Do not invent numbers</li>
          <li>Separate evidence from opinion</li>
          <li>Distinguish architecture from regulation</li>
          <li>Label illustrative scenarios</li>
          <li>Prefer primary sources</li>
          <li>Maintain corrections and verification ledgers</li>
        </ul>
        <p className="pt-2 font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-muted)]">
          <ResearchLink
            href="/what-governance-frame-is"
            className="font-medium text-[var(--gf-accent)] no-underline hover:underline"
          >
            What Governance Frame is
          </ResearchLink>
          {" · "}
          <ResearchLink
            href="/editorial-standards"
            className="font-medium text-[var(--gf-accent)] no-underline hover:underline"
          >
            Editorial standards
          </ResearchLink>
          {" · "}
          <ResearchLink
            href="/operating-outline"
            className="font-medium text-[var(--gf-accent)] no-underline hover:underline"
          >
            Operating outline
          </ResearchLink>
        </p>
      </div>
    </section>
  );
}
