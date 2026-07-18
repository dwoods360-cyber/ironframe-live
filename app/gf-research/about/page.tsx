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
      <div>
        <h2
          id="about-heading"
          className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500"
        >
          About Governance Frame
        </h2>
        <h1 className="mt-3 font-mono text-2xl font-bold tracking-tight text-slate-50">
          Governance Frame
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
          An independent governance research and executive education organization — not a software
          company.
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
          Publisher · Governance Frame Research
        </p>
      </div>

      <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-slate-400">
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
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Relationship to Ironframe
        </h3>
        <p className="text-sm leading-relaxed text-slate-400">
          Governance Frame publishes research for industry. Ironframe demonstrates one implementation
          approach of principles discussed in that research. Ironframe should almost never be the
          subject of Governance Frame articles. When product architecture appears, it is labeled and
          does not represent a regulatory requirement.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Content pillars
        </p>
        <ul className="mt-3 space-y-1 font-mono text-[11px] text-slate-400">
          <li>Industry research papers</li>
          <li>Industry briefings</li>
          <li>Executive storytelling</li>
          <li>Newsletters</li>
          <li>Video, training, and industry reports (over time)</li>
        </ul>
      </div>

      <div className="max-w-2xl space-y-3">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Editorial principles
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
          <li>Do not invent numbers</li>
          <li>Separate evidence from opinion</li>
          <li>Distinguish architecture from regulation</li>
          <li>Label illustrative scenarios</li>
          <li>Prefer primary sources</li>
          <li>Maintain corrections and verification ledgers</li>
        </ul>
        <p className="text-sm text-slate-500">
          Full charter:{" "}
          <ResearchLink
            href="/editorial-standards"
            className="font-mono text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-200"
          >
            Editorial standards →
          </ResearchLink>
          {" · "}
          <ResearchLink
            href="/operating-outline"
            className="font-mono text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-200"
          >
            Operating outline →
          </ResearchLink>
        </p>
      </div>
    </section>
  );
}
