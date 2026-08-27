import type { Metadata } from "next";

import MarketingAnimatedLogo from "@/app/components/marketing/MarketingAnimatedLogo";
import { FELLOWS_MISSION_LESSONS } from "@/app/lib/fellows/missionLessons";

import FellowsApplyForm from "./FellowsApplyForm";
import FellowsNav from "./FellowsNav";

export const metadata: Metadata = {
  title: "IRONFRAMEGRC // FELLOWS | Academic Lab",
  description:
    "Free isolated GRC sandbox for WGU Cybersecurity BS / MSCSIA candidates — short in-browser learning missions plus a capstone companion path for appendix-ready exports. Independent Ironframe lab, not a WGU-operated site.",
};

const FAQ = [
  {
    q: "Is the lab 60 days of work?",
    a: "No. In-browser mission work is about 45–60 minutes for the full learning path (four guided missions). The 60-day window is access for writing, revision, and capstone drafting — not continuous lab time.",
  },
  {
    q: "How long does this take, and do I need to code?",
    a: "Self-paced and 100% in-browser — no coding, CLI, AWS setup, or software install. Each mission starts with a short lesson (teach + check) before the hands-on run. Full path targets ~45–60 minutes including rubric and export.",
  },
  {
    q: "What’s the difference between Learning and Capstone paths?",
    a: "Same sandbox and missions. Learning = complete guided missions and export for coursework or portfolio. Capstone = same missions plus deeper methodology write-up (assumptions, lineage, boundary proof) using the 60-day seat while you draft appendices off-platform.",
  },
  {
    q: "Can I cite this data in my WGU MSCSIA Capstone or BS portfolio?",
    a: "Yes. Exported evidence registers and estimated-exposure calculation matrices are structured for capstone technical appendices, methodology chapters, or GitHub portfolios. Confirm citation rules with your evaluator.",
  },
  {
    q: "Is any company or client data required?",
    a: "No. Lab missions run on pre-seeded synthetic enterprise estates (e.g. regional healthcare, fintech, defense suppliers). Never enter real-world credentials or proprietary company / client data.",
  },
  {
    q: "Is this an official WGU course requirement?",
    a: "No. IRONFRAMEGRC // FELLOWS is an independent academic lab for cybersecurity students, alumni, and practitioners — not a WGU-operated site or required course module.",
  },
  {
    q: "Does this prepare me for audits?",
    a: "It maps four common exam questions (estimated exposure, unverified ingest, cross-entity bleed, lineage) to hands-on synthetic labs. Useful for methodology and appendices — not a compliance certification or auditor substitute.",
  },
  {
    q: "Does completion grant a formal certification?",
    a: "No. You receive a verified lab completion receipt and exportable data package — not an accredited industry certification.",
  },
  {
    q: "Is there related reading outside the lab?",
    a: "Optional. Governance Frame publishes vendor-neutral GRC research (briefs and papers) at research.ironframegrc.com — separate from this sandbox and not a WGU course requirement.",
  },
] as const;

export default function FellowsLandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <FellowsNav />

      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.2fr_0.9fr] lg:px-6 lg:py-16">
        <section>
          <div>
            <MarketingAnimatedLogo className="h-16 w-16 sm:h-20 sm:w-20" />
          </div>
          <p className="mt-4 font-mono text-[10px] font-bold tracking-[0.12em] text-teal-400">
            IRONFRAMEGRC // FELLOWS
          </p>
          <p className="mt-2 font-mono text-[10px] font-bold tracking-[0.18em] text-slate-500">
            BUILT FOR WGU CYBERSECURITY BS / MSCSIA CANDIDATES
          </p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Build Your Capstone on Real GRC Architecture.{" "}
            <span className="text-teal-300">Break Our Math.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
            A short in-browser learning lab that produces durable evidence — then a capstone
            companion path for MSCSIA students who need appendix-ready methodology, not just a
            demo click-through.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            <li className="flex gap-2">
              <span className="text-teal-400">[*]</span>
              Learning path: ~1 hour guided missions (exposure, ingest, boundary, lineage)
            </li>
            <li className="flex gap-2">
              <span className="text-teal-400">[*]</span>
              Capstone path: same lab + deeper write-up over a 60-day access window
            </li>
            <li className="flex gap-2">
              <span className="text-teal-400">[*]</span>
              Synthetic estates only — no company / client data required
            </li>
          </ul>

          <p className="mt-6 text-xs text-slate-600">Independent academic lab.</p>
        </section>

        <aside>
          <FellowsApplyForm />
        </aside>
      </main>

      <section id="how-it-works" className="border-t border-slate-900 bg-slate-950/80 px-4 py-12 lg:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-mono text-xs font-bold tracking-widest text-slate-500">
            HOW THE LAB WORKS
          </h2>
          <p className="mt-2 max-w-2xl text-xs text-slate-500">
            Self-paced · in your browser · no coding or software install. Learning path: about
            45–60 minutes. The 60-day seat is only an access window for writing and revisions — not
            60 days of lab time.
          </p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: "01",
                t: "Get access",
                d: "Submit the form. You’re in immediately — no install. Seat stays open 60 days and extends when you use the lab.",
              },
              {
                n: "02",
                t: "Run the missions",
                d: "Open the lab console. Each mission: short lesson (teach + check) → guided run (exposure, ingest, boundary, lineage export).",
              },
              {
                n: "03",
                t: "Capture notes",
                d: "Record short feedback on the workflows. Capstone path: expand assumptions, lineage, and boundary proof in your own write-up.",
              },
              {
                n: "04",
                t: "Export evidence",
                d: "Download tamper-evident JSON/CSV registers and a completion receipt for your portfolio or capstone appendices.",
              },
            ].map((step) => (
              <li
                key={step.n}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"
              >
                <p className="font-mono text-[10px] text-teal-500">STEP {step.n}</p>
                <h3 className="mt-1 text-sm font-semibold text-white">{step.t}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{step.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="audits" className="border-t border-slate-900 px-4 py-12 lg:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-mono text-xs font-bold tracking-widest text-slate-500">
            WHY THIS MATTERS IN AN AUDIT
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Exam pressure exposes weak GRC habits: soft tenancy, unverified questionnaires, and
            color-only risk packs. This lab does not certify you — it gives you language and
            artifacts for the questions examiners and evaluators actually ask.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              {
                q: "What’s the estimated dollar exposure — and the assumptions?",
                a: "Mission 01 — whole-cent estimated exposure with visible SLE/ARO bounds (not float theater).",
              },
              {
                q: "Was this vendor pack verified before the executive pack?",
                a: "Mission 02 — quarantine-before-trust blocks unverified promote; the block is the evidence.",
              },
              {
                q: "Can Client B’s register appear under Client A’s exam scope?",
                a: "Mission 03 — cross-enclave probe returns server 403 + receipt with zero bleed.",
              },
              {
                q: "Who collected this, when, under what scope — and can I trust the file?",
                a: "Mission 04 — lineage fields + server SHA-256 export for appendices.",
              },
            ].map((row) => (
              <div
                key={row.q}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"
              >
                <p className="text-sm font-medium text-white">{row.q}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{row.a}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-2xl text-xs text-slate-600">
            Capstone path: turn these four answers into an off-platform audit narrative — still
            synthetic data only; still not an industry certification.
          </p>
        </div>
      </section>

      <section id="learning" className="border-t border-slate-900 px-4 py-12 lg:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-mono text-xs font-bold tracking-widest text-slate-500">
            LEARNING PATH
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Hands-on missions in a shared sandbox. Ideal for Cybersecurity BS coursework and anyone
            who needs portfolio evidence without writing a full thesis chapter.
          </p>
          <p className="mt-3 max-w-2xl text-xs text-slate-500">
            What “done” means: for each mission, complete the short lesson check → run the lab →
            then finish all four → short rubric → export package.
          </p>

          <div id="missions" className="mt-8 grid gap-4 sm:grid-cols-2">
            {FELLOWS_MISSION_LESSONS.map((m) => (
              <div
                key={m.code}
                className="relative rounded-lg border border-teal-500/40 bg-slate-900/70 p-4"
              >
                <p className="font-mono text-[10px] text-teal-400">{m.code}</p>
                <h3 className="mt-1 text-sm font-semibold text-white">{m.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{m.labAction}</p>
                <p className="mt-3 text-xs leading-relaxed text-amber-200/80">
                  <span className="font-mono text-[10px] font-bold tracking-widest text-amber-500/90">
                    AUDIT Q ·{" "}
                  </span>
                  {m.auditQuestion}
                </p>
                <p className="mt-3 font-mono text-[10px] font-bold tracking-widest text-slate-500">
                  LESSON · YOU WILL LEARN
                </p>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-400">
                  {m.youWillLearn.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="shrink-0 text-teal-500">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 font-mono text-[10px] font-bold tracking-widest text-slate-500">
                  IN LAB
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Teach → comprehension check → unlock hands-on run.{" "}
                  <span className="text-slate-400">PASS proves: </span>
                  {m.youProve}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="capstone" className="border-t border-slate-900 bg-slate-950/80 px-4 py-12 lg:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-mono text-xs font-bold tracking-widest text-slate-500">
            CAPSTONE PATH
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Same missions — higher bar on methodology. Built for MSCSIA capstone (and coursework)
            students who need the lab as <em>evidence input</em>, then weeks of writing off-platform.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="text-sm font-semibold text-white">What the lab contributes</h3>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-500">
                <li>· Whole-cent estimated exposure stress-test artifacts (Mission 01)</li>
                <li>· Quarantine-before-trust ingest evidence (Mission 02)</li>
                <li>· Server-proven boundary receipt (Mission 03)</li>
                <li>· Lineage trail + SHA-256 export pack (Mission 04)</li>
              </ul>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="text-sm font-semibold text-white">What you write (off-platform)</h3>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-500">
                <li>· Visible assumptions log for exposure math</li>
                <li>· Boundary isolation narrative (403 = proof, not theater)</li>
                <li>· Continuous assurance vs point-in-time questionnaire framing</li>
                <li>· Appendix packaging for evaluator / portfolio citation</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-teal-900/40 bg-teal-950/20 p-5">
            <h3 className="font-mono text-[10px] font-bold tracking-widest text-teal-400">
              CAPSTONE COMPANION CHECKLIST
            </h3>
            <ol className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400">
              <li>
                <span className="font-semibold text-slate-300">1.</span> Complete Learning missions
                in-browser (~45–60 minutes for the full path).
              </li>
              <li>
                <span className="font-semibold text-slate-300">2.</span> Capture screenshots /
                receipt tokens and export the tamper-evident package.
              </li>
              <li>
                <span className="font-semibold text-slate-300">3.</span> Draft methodology section:
                isolation model, estimated-exposure assumptions, ingest quarantine stance.
              </li>
              <li>
                <span className="font-semibold text-slate-300">4.</span> Attach registers + completion
                receipt as technical appendices; keep the 60-day seat for revisions.
              </li>
              <li>
                <span className="font-semibold text-slate-300">5.</span> Optional: skim Governance
                Frame research for vendor-neutral framing (not a WGU requirement).
              </li>
            </ol>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                t: "Cryptographic evidence package",
                d: "SHA-256 tamper-evident JSON/CSV registers — control lineage, collector timestamps, operator sign-offs.",
              },
              {
                t: "Lab completion receipt",
                d: "Hash-matched record that boundary and exposure stress-tests were server-proven, not client-mocked.",
              },
              {
                t: "Methodology depth (MSCSIA)",
                d: "Expand architecture notes into capstone chapters: point-in-time packs vs continuous multi-tenant assurance.",
              },
            ].map((item) => (
              <div
                key={item.t}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"
              >
                <h3 className="text-sm font-semibold text-white">{item.t}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-900 px-4 py-12 lg:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-mono text-xs font-bold tracking-widest text-slate-500">
            ARCHITECTURE &amp; TECHNICAL SPECIFICATIONS
          </h2>
          <div className="mt-6 overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="bg-slate-900/80 font-mono text-[10px] tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Specification</th>
                  <th className="px-4 py-3 font-bold">Implementation in sandbox</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="px-4 py-3 text-slate-400">Data isolation</td>
                  <td className="px-4 py-3">
                    Dedicated academic Postgres schema + server-proven cross-enclave boundary checks
                    (403 + receipt; zero bleed)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-400">Financial risk engine</td>
                  <td className="px-4 py-3">
                    Deterministic math in whole integer cents (BIGINT) — float drift eliminated
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-400">Ingress pipeline</td>
                  <td className="px-4 py-3">
                    Quarantine-before-trust pattern for untrusted ingest (lab Mission 02)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-400">Framework coverage</td>
                  <td className="px-4 py-3">
                    Control IDs mapped for NIST SP 800-171 / CMMC-style labs, SOC 2 evidence
                    workflows, and multi-tenant assurance patterns (sandbox scope)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-slate-900 bg-slate-950/80 px-4 py-12 lg:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-mono text-xs font-bold tracking-widest text-slate-500">
            INSTITUTIONAL GOVERNANCE &amp; STUDENT FAQ
          </h2>
          <dl className="mt-6 space-y-5">
            {FAQ.map((item) => (
              <div key={item.q} className="border-b border-slate-900 pb-5 last:border-0">
                <dt className="text-sm font-semibold text-white">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-400">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <footer className="border-t border-slate-900 px-4 py-8 lg:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono tracking-[0.08em]">
            IRONFRAMEGRC // FELLOWS — independent academic lab
          </p>
          <p>
            Optional reading:{" "}
            <a
              href="https://research.ironframegrc.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 underline-offset-2 transition-colors hover:text-teal-300 hover:underline"
            >
              Governance Frame research
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
