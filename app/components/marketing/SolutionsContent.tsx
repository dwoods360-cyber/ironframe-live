import Link from "next/link";

import {
  DEMO_ALE_BASELINE_CENTS,
  DEMO_ALE_BASELINE_DISPLAY,
} from "@/app/lib/demo/demoModeConstants";
import { WORKFLOW_REVIEW_CTA_MINUTES } from "@/lib/ironframeProductKnowledge/commercial";

export type SolutionSlug =
  | "fintech"
  | "healthcare"
  | "infrastructure"
  | "enterprise"
  | "risk-engineering";

export type SolutionDemoBaseline = {
  /** Seed demo-tenant label — never a customer reference. */
  demoTenant: "Vaultbank NA" | "Medshield Health" | "Gridcore Infrastructure";
  aleCents: bigint;
  aleDisplay: string;
};

export type SolutionPageContent = {
  slug: SolutionSlug;
  eyebrow: string;
  title: string;
  summary: string;
  problem: string;
  approach: readonly string[];
  audiences: readonly string[];
  /** Illustrative Irontrust seed baseline only — labeled on the page. */
  demoBaseline?: SolutionDemoBaseline;
};

export const SOLUTION_PAGES: readonly SolutionPageContent[] = [
  {
    slug: "fintech",
    eyebrow: "High-Velocity FinTech Containment",
    title: "Contain subsidiary and product-line risk without shared-schema bleed.",
    summary:
      "Database-tier multi-tenancy (RLS + Ironguard), real-time API shielding via Irongate sanitize-before-persist, and BigInt ALE baselines — Vaultbank demo enclave ($5.9M illustrative ALE).",
    problem:
      "FinTech holding structures and product lines often share one GRC schema. A single exam or connector expansion can expose sibling entities when isolation is only a UI filter.",
    approach: [
      "Enforce row-level security and Ironguard session bounds so each legal entity or product line stays in its own query-time enclave.",
      "Real-time API shielding: Irongate sanitizes external intelligence and connector payloads before persist — no trusted-API shortcut into the risk register.",
      "Persist ALE as whole-cent BigInt (Vaultbank demo baseline 590000000¢ / $5,900,000.00) — no float money fields.",
    ],
    audiences: [
      "Regional bank holding company and fintech compliance operators under FFIEC-style supervision.",
      "Product-line CISOs who need database-tier subsidiary isolation across legal entities.",
      "Risk owners who reject float-rounded loss math on persisted ALE fields.",
    ],
    demoBaseline: {
      demoTenant: "Vaultbank NA",
      aleCents: DEMO_ALE_BASELINE_CENTS.vaultbank,
      aleDisplay: DEMO_ALE_BASELINE_DISPLAY.vaultbank,
    },
  },
  {
    slug: "healthcare",
    eyebrow: "Healthcare Perimeter Watch",
    title: "Bind perimeter and vendor intake to attributable control records.",
    summary:
      "Real-time API shielding on edge/vendor intake (Irongate sanitize-before-persist), control↔evidence foreign-key lineage, and BigInt ALE — Medshield demo baseline ($11.1M illustrative ALE).",
    problem:
      "Healthcare perimeter tools produce validation signals and vendor noise that never become an attributable control, owner, or dollar-denominated exposure before the board or examiner asks.",
    approach: [
      "Persist perimeter and vendor signals as records linked to control, evidence, owner, and remediation IDs — not a disconnected ticket dump.",
      "Real-time API shielding: Irongate sanitizes external and edge payloads before persistence so untrusted telemetry cannot become trusted evidence by accident.",
      "Store material exposure as BigInt cents against the Medshield demo ALE baseline (1110000000¢ / $11,100,000.00) with persisted assumption fields.",
    ],
    audiences: [
      "Health-system compliance and privacy operators handling HIPAA evidence and vendor oversight.",
      "GRC leads who need perimeter signals bound to control and evidence record IDs.",
      "Audit chairs who require attributable evidence objects before accepting an exposure total.",
    ],
    demoBaseline: {
      demoTenant: "Medshield Health",
      aleCents: DEMO_ALE_BASELINE_CENTS.medshield,
      aleDisplay: DEMO_ALE_BASELINE_DISPLAY.medshield,
    },
  },
  {
    slug: "infrastructure",
    eyebrow: "Critical Infrastructure & Energy Ops",
    title: "Keep OT and CIP-style evidence inside a sovereign operational enclave.",
    summary:
      "Database-tier tenant scoping for OT/ingest paths, real-time API shielding (Irongate sanitize-before-persist), and BigInt resilience metrics — Gridcore demo model ($4.7M illustrative ALE).",
    problem:
      "Energy and critical-infrastructure programs often bolt OT signals onto enterprise GRC spreadsheets, losing isolation, evidence lineage, and integer-cent exposure totals when an operational event hits.",
    approach: [
      "Scope OT and third-party operational records to the Gridcore-style enclave with RLS — no shared evidence pool across unrelated assets.",
      "Real-time API shielding: route external and telemetry intake through Irongate before persistence; keep remediation and exports tenant-scoped.",
      "Persist operational and third-party exposure as BigInt cents against the Gridcore demo ALE baseline (470000000¢ / $4,700,000.00).",
    ],
    audiences: [
      "Utility and OT security leaders responsible for NERC CIP-style attestations and evidence trails.",
      "Operational resilience owners coordinating vendors without a disconnected spreadsheet register.",
      "Operators who need continuity and cyber exposure stored as the same BigInt cents fields.",
    ],
    demoBaseline: {
      demoTenant: "Gridcore Infrastructure",
      aleCents: DEMO_ALE_BASELINE_CENTS.gridcore,
      aleDisplay: DEMO_ALE_BASELINE_DISPLAY.gridcore,
    },
  },
  {
    slug: "enterprise",
    eyebrow: "Multi-Entity Corporate Rollups",
    title: "Stop segment data-bleed across fragmented legal structures.",
    summary:
      "Database-tier multi-tenancy: RLS + Ironguard query-time enclaves so subsidiaries, departments, and client programs never share an evidence pool.",
    problem:
      "PE roll-ups and multi-entity corporates open one GRC login for many legal entities. Metadata tags are not query-time isolation — auditors for Entity A can see Entity B.",
    approach: [
      "Use database-tier tenant isolation (RLS + Ironguard) so every risk, evidence object, and export is scoped to one enclave.",
      "Provide cross-enclave program aggregation without collapsing entities into a shared evidence table.",
      "Gate AI-assisted drafts behind human-in-the-loop acceptance — no auto-write or auto-export across entity boundaries.",
    ],
    audiences: [
      "Multi-entity and regional operators with subsidiary-level governance boundaries.",
      "MSSP and vCISO teams serving multiple regulated clients in separate enclaves.",
      "Portfolio operators who need clean audit boundaries across two to five legal entities.",
    ],
  },
  {
    slug: "risk-engineering",
    eyebrow: "Deterministic Capital Allocation",
    title: "Engineer risk monetization with BigInt cents — not color codes.",
    summary:
      "BigInt ALE in whole United States cents, persisted assumption fields, and tenant-scoped export pipelines — no float money math, no heatmap-only registers.",
    problem:
      "Capital and control investment decisions stall when exposure is a heatmap or a float-rounded spreadsheet. Finance and security cannot reconcile the same number.",
    approach: [
      "Model ALE with BigInt arithmetic in whole cents — no float persistence on money fields.",
      "Persist assumptions beside linked control, evidence, and remediation IDs so totals remain reconstructable under challenge.",
      "Emit tenant-scoped exports from documented baseline integers rather than unsupported spreadsheet aggregates.",
    ],
    audiences: [
      "CISOs and CROs who require whole-cent ALE beside linked control records.",
      "Finance partners who reject float-rounded loss estimates on money columns.",
      "Design-partner operators naming Path B success criteria around a tenant-scoped BigInt exposure export.",
    ],
  },
] as const;

export function getSolutionPage(slug: string): SolutionPageContent | undefined {
  return SOLUTION_PAGES.find((solution) => solution.slug === slug);
}

function WorkflowReviewCta() {
  return (
    <Link
      href="/register/contact"
      className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-6 text-sm font-bold tracking-wide text-white uppercase transition-colors hover:bg-indigo-500"
    >
      Request a {WORKFLOW_REVIEW_CTA_MINUTES} min workflow review
    </Link>
  );
}

export function SolutionsIndexContent() {
  return (
    <main
      className="ironframe-public-funnel min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)]"
      data-ironframe-surface="public-funnel"
    >
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24" aria-labelledby="solutions-title">
        <p className="font-mono text-xs tracking-widest text-[var(--login-accent)] uppercase">Solutions</p>
        <h1 id="solutions-title" className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Baseline-aligned GRC for regulated operators.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-[var(--login-muted)] sm:text-lg">
          Five deep-dives mapped to operational baselines and demo enclaves. Demo ALE figures are
          illustrative seed tenants — not customer references.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {SOLUTION_PAGES.map((solution) => (
            <Link
              key={solution.slug}
              href={`/solutions/${solution.slug}`}
              className="rounded-lg border border-[var(--login-border)] bg-[var(--bg-secondary)] p-6 transition-colors hover:border-cyan-700/50"
            >
              <p className="font-mono text-xs text-[var(--login-accent)]">{solution.eyebrow}</p>
              <h2 className="mt-2 text-xl font-bold text-[var(--text-main)]">{solution.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--login-muted)]">{solution.summary}</p>
              {solution.demoBaseline ? (
                <p className="mt-3 font-mono text-[10px] tracking-wide text-[var(--login-muted)] uppercase">
                  Demo baseline · {solution.demoBaseline.demoTenant} · {solution.demoBaseline.aleDisplay}
                </p>
              ) : null}
              <span className="mt-4 inline-flex text-sm font-medium text-cyan-300">Explore solution →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export function SolutionDetailContent({ solution }: { solution: SolutionPageContent }) {
  return (
    <main
      className="ironframe-public-funnel min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)]"
      data-ironframe-surface="public-funnel"
    >
      <article className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <header className="max-w-4xl">
          <Link href="/solutions" className="font-mono text-xs text-[var(--login-accent)] hover:underline">
            ← Solutions
          </Link>
          <p className="mt-8 font-mono text-xs tracking-widest text-[var(--login-accent)] uppercase">
            {solution.eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{solution.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[var(--login-muted)]">{solution.summary}</p>
          {solution.demoBaseline ? (
            <p className="mt-4 max-w-3xl rounded-md border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
              Illustrative demo-tenant ALE baseline only —{" "}
              <strong className="font-medium">{solution.demoBaseline.demoTenant}</strong> at{" "}
              <span className="font-mono">{solution.demoBaseline.aleCents.toString()}¢</span> (
              {solution.demoBaseline.aleDisplay}). Not a live customer, pilot result, or certification claim.
            </p>
          ) : null}
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <WorkflowReviewCta />
            <Link href="/product-demo" className="text-sm font-medium text-cyan-300 underline hover:text-cyan-200">
              View demonstration data in the guided demo
            </Link>
          </div>
        </header>

        <div className="mt-16 grid gap-10 border-t border-[var(--login-border)] pt-12 lg:grid-cols-3">
          <section className="lg:col-span-3">
            <p className="font-mono text-xs tracking-widest text-[var(--login-accent)] uppercase">The problem</p>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-[var(--login-muted)]">{solution.problem}</p>
          </section>
          <section className="lg:col-span-2">
            <p className="font-mono text-xs tracking-widest text-[var(--login-accent)] uppercase">
              How Ironframe addresses it
            </p>
            <ul className="mt-4 space-y-3">
              {solution.approach.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-[var(--login-border)] bg-[var(--bg-secondary)] p-4 text-sm leading-relaxed text-[var(--login-muted)]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <aside>
            <p className="font-mono text-xs tracking-widest text-[var(--login-accent)] uppercase">Who it&apos;s for</p>
            <ul className="mt-4 space-y-3">
              {solution.audiences.map((audience) => (
                <li key={audience} className="text-sm leading-relaxed text-[var(--login-muted)]">
                  {audience}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </article>
    </main>
  );
}
