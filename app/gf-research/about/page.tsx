import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

export default function ResearchAboutPage() {
  return (
    <section aria-labelledby="about-heading" className="space-y-8">
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
          Independent research on governance, risk, compliance, operational resilience,
          cybersecurity, and AI governance.
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
          Published by Ironframe GRC
        </p>
      </div>

      <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-slate-400">
        <p>
          Governance Frame is the independent research and editorial publication of Ironframe GRC.
          Its purpose is to publish evidence-driven research concerning governance, risk, compliance,
          cybersecurity governance, evidence stewardship, quantitative risk, operational resilience,
          and accountable automation.
        </p>
        <p>
          Governance Frame and Ironframe may share infrastructure, personnel, and subject-matter
          expertise. Research conclusions must not be determined by Ironframe product requirements.
          Product claims are not presented as independent research findings. References to Ironframe
          products or architecture are clearly labeled and do not represent regulatory requirements.
        </p>
        <p>
          Publisher identity: <span className="text-slate-300">Governance Frame Research</span>.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Publication classes
        </p>
        <ul className="mt-3 space-y-1 font-mono text-[11px] text-slate-400">
          <li>Executive briefs</li>
          <li>Industry briefings</li>
          <li>Research briefs</li>
          <li>White papers / research papers</li>
          <li>Newsletters</li>
          <li>Methodology and standards documents</li>
        </ul>
      </div>
    </section>
  );
}
