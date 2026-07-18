import Link from "next/link";

import { WORKFLOW_REVIEW_CTA_MINUTES } from "@/lib/ironframeProductKnowledge/commercial";

export type SolutionSlug =
  | "quantitative-cyber-risk"
  | "audit-ready-evidence"
  | "multi-entity-grc"
  | "governed-ai"
  | "third-party-resilience";

export type SolutionPageContent = {
  slug: SolutionSlug;
  eyebrow: string;
  title: string;
  summary: string;
  problem: string;
  approach: readonly string[];
  audiences: readonly string[];
};

export const SOLUTION_PAGES: readonly SolutionPageContent[] = [
  {
    slug: "quantitative-cyber-risk",
    eyebrow: "Quantitative cyber-risk governance",
    title: "Give risk conversations a defensible financial basis.",
    summary:
      "Connect cyber-risk work to loss exposure expressed in integer cents, with assumptions operators can review before it reaches the board.",
    problem:
      "Color-coded heatmaps can signal urgency, but they do not give a board a durable basis for comparing exposure, control investment, and risk decisions.",
    approach: [
      "Model annualized loss exposure with BigInt arithmetic in whole cents.",
      "Keep risk, linked controls, evidence, and remediation connected in one workflow.",
      "Prepare board-facing outputs from documented assumptions rather than unsupported spreadsheet totals.",
    ],
    audiences: [
      "Regional banking CISO and compliance operators managing FFIEC supervision and board reporting.",
      "Utility and OT security leaders who need NERC CIP evidence trails alongside operational attestations.",
      "Boards and risk owners who need to ask “in dollars?” without losing the control context.",
    ],
  },
  {
    slug: "audit-ready-evidence",
    eyebrow: "Audit-ready control evidence",
    title: "Keep the evidence behind each control ready to explain.",
    summary:
      "Bring controls, evidence, owners, review history, and remediation into a connected workflow built for audit preparation.",
    problem:
      "When evidence lives across folders and spreadsheets, teams spend audit season reconstructing ownership, review history, and the reason a control was considered effective.",
    approach: [
      "Link evidence and review history to the control and its responsible owner.",
      "Use evidence and export surfaces to prepare a bounded, reviewable record for auditors.",
      "Maintain remediation context so outstanding work is visible beside the supporting evidence.",
    ],
    audiences: [
      "Healthcare compliance operators and vendor-risk leads handling HIPAA privacy obligations.",
      "Utility CIP program owners responsible for operational attestations and evidence trails.",
      "Regional financial-services teams preparing recurring board and supervisory materials.",
    ],
  },
  {
    slug: "multi-entity-grc",
    eyebrow: "Multi-entity GRC",
    title: "Separate each entity’s governance work without losing oversight.",
    summary:
      "Operate subsidiaries, client programs, and departments in tenant-isolated enclaves while retaining a clear command view.",
    problem:
      "Shared workspaces create cross-entity evidence bleed and make it harder to establish who should see, review, and export a specific record.",
    approach: [
      "Use native multi-tenant isolation through row-level security and Ironguard.",
      "Scope records and exports to the relevant tenant enclave.",
      "Give program leaders a command view without treating every entity as one shared evidence pool.",
    ],
    audiences: [
      "Multi-entity and regional banking organizations with subsidiary-level governance boundaries.",
      "MSSP and vCISO teams serving multiple regulated clients.",
      "Portfolio operators who need clean audit boundaries across two to five subsidiaries.",
    ],
  },
  {
    slug: "governed-ai",
    eyebrow: "Governed AI assistance",
    title: "Use AI assistance with a human accountable for the outcome.",
    summary:
      "Let AI help prepare governed work while human reviewers retain control over what is accepted, exported, or sent.",
    problem:
      "Unreviewed AI output can blur accountability in a GRC workflow, especially when it influences evidence narratives, risk context, or external communication.",
    approach: [
      "Route AI-assisted work through human-in-the-loop review instead of automatic action.",
      "Keep drafts reviewable before they are used in a governed workflow.",
      "Use Irongate to sanitize external intelligence before it is persisted.",
    ],
    audiences: [
      "Healthcare and financial-services compliance teams working with sensitive operational context.",
      "MSSP and vCISO teams that need repeatable, client-scoped review practices.",
      "Governance leaders who want AI assistance without delegating accountable decisions.",
    ],
  },
  {
    slug: "third-party-resilience",
    eyebrow: "Third-party and operational resilience",
    title: "Bring vendor and operational risk into a reviewable resilience workflow.",
    summary:
      "Connect third-party risk context, controls, evidence, remediation, and board reporting without relying on a disconnected vendor spreadsheet.",
    problem:
      "Vendor dependencies and operational risk often reach leadership as fragmented updates, making it difficult to see the linked evidence, owners, and remaining exposure.",
    approach: [
      "Relate third-party and operational risk records to the controls and evidence that support a response.",
      "Sanitize external intelligence with Irongate before it enters persisted governance records.",
      "Use board-report and export surfaces to prepare a reviewable resilience narrative.",
    ],
    audiences: [
      "Healthcare vendor-risk leads responsible for HIPAA privacy and vendor oversight.",
      "Utility security leaders managing OT dependencies and operational attestations.",
      "Regional financial-services and multi-entity operators coordinating vendor oversight.",
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
          Focused GRC workflows for regulated operators.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-[var(--login-muted)] sm:text-lg">
          Explore the governance problem in front of your team, then map one workflow with Ironframe.
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
                <li key={item} className="rounded-lg border border-[var(--login-border)] bg-[var(--bg-secondary)] p-4 text-sm leading-relaxed text-[var(--login-muted)]">
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
