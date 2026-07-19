import Link from "next/link";

import type { PublishedBriefingCard } from "@/app/lib/governanceFrame/publishedBriefingLedgerCards";
import {
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  DESIGN_PARTNER_SUCCESS_CRITERIA_COUNT,
  WORKFLOW_REVIEW_CTA_MINUTES,
  formatPathBUsd,
  formatPlannedGaCommandUsd,
} from "@/lib/ironframeProductKnowledge/commercial";
import { SALES_CONTACT_PATH } from "@/config/registration";

import BriefingsArchive from "./BriefingsArchive";
import MarketingAnimatedLogo from "./MarketingAnimatedLogo";
import MarketingCityCycleSubtitle from "./MarketingCityCycleSubtitle";
import PublicApexNav from "./PublicApexNav";
import { SOLUTION_PAGES } from "./SolutionsContent";

const WORKFLOW_STEPS = [
  "Risk identified",
  "Financial exposure estimated",
  "Controls linked",
  "Evidence collected",
  "Reviewed or quarantined",
  "Remediation assigned",
  "Board / audit report generated",
] as const;

/** Committee-forwardable truths a champion can defend — not a feature list. */
const COMMITTEE_DEFENSIBLES = [
  {
    title: "Exposure in integer cents",
    desc: "Documented financial exposure with assumptions and baselines operators can defend — not color codes alone.",
  },
  {
    title: "Connected evidence chain",
    desc: "Controls, evidence, owners, review history, and remediation stay linked in one workspace.",
  },
  {
    title: "Multi-entity separation",
    desc: "Subsidiaries, clients, and departments stay isolated without losing the command view.",
  },
] as const;

/**
 * Illustrative Path B criteria only — partners write their own at kickoff.
 * Never present as promised deliverables or measured customer results.
 */
const ILLUSTRATIVE_SUCCESS_CRITERIA = [
  "Produce one board-ready exposure export from a live risk with assumptions visible.",
  "Link controls and evidence for one priority control family end-to-end in the workspace.",
  "Run a multi-entity (or multi-client) review without cross-tenant evidence bleed.",
] as const;

type MarketingHomepageProps = {
  /** Live published-ledger teaser cards (never queue drafts). */
  publishedBriefingCards?: PublishedBriefingCard[];
};

export default function MarketingHomepage({
  publishedBriefingCards = [],
}: MarketingHomepageProps) {
  return (
    <main
      className="ironframe-public-landing min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)] transition-colors duration-200"
      data-ironframe-surface="public-landing"
      aria-labelledby="homepage-hero-title"
    >
      <PublicApexNav />

      <nav
        className="flex min-h-11 w-full items-center justify-center gap-5 overflow-x-auto border-b border-[var(--login-border)] bg-[var(--bg-primary)] px-4 text-sm font-medium text-[var(--login-muted)] sm:gap-8 sm:px-6"
        aria-label="Product sections"
      >
        <a href="#workflow" className="inline-flex min-h-[44px] shrink-0 items-center transition-colors hover:text-[var(--text-main)]">
          Workflow
        </a>
        <a href="#outcomes" className="inline-flex min-h-[44px] shrink-0 items-center transition-colors hover:text-[var(--text-main)]">
          Path B
        </a>
        <a href="#solutions" className="inline-flex min-h-[44px] shrink-0 items-center transition-colors hover:text-[var(--text-main)]">
          Solutions
        </a>
        <a href="#proof" className="inline-flex min-h-[44px] shrink-0 items-center transition-colors hover:text-[var(--text-main)]">
          Proof
        </a>
        <Link href="/product-demo" className="inline-flex min-h-[44px] shrink-0 items-center transition-colors hover:text-[var(--text-main)]">
          Guided demo
        </Link>
      </nav>

      <div className="flex flex-col items-center px-4 pt-8 sm:px-6">
        <MarketingAnimatedLogo className="h-28 w-28 sm:h-36 sm:w-36" />
        <p className="mt-3 font-mono text-sm font-black tracking-widest text-[var(--text-main)] sm:text-base">
          IRONFRAME
        </p>
        <MarketingCityCycleSubtitle />
      </div>

      <header className="mx-auto max-w-6xl space-y-6 px-6 pt-8 pb-16 text-center">
        <div
          className="inline-flex items-center space-x-2 rounded-full border border-[var(--login-accent)]/20 bg-[var(--login-accent)]/10 px-3 py-1 font-mono text-xs text-[var(--login-accent)]"
          role="status"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--login-accent)]" aria-hidden="true" />
          <span>Control-first GRC command post · design-partner phase</span>
        </div>
        <h1
          id="homepage-hero-title"
          className="mx-auto max-w-4xl text-4xl leading-tight font-bold tracking-tight text-[var(--text-main)] sm:text-5xl lg:text-6xl"
        >
          Ironframe
        </h1>
        <p className="mx-auto max-w-2xl text-xl font-medium leading-snug text-[var(--text-main)] sm:text-2xl">
          Replace spreadsheet risk-and-evidence work with an auditable, multi-entity workflow.
        </p>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-[var(--login-muted)] sm:text-lg">
          See how a risk moves from intake to quantified exposure, evidence review, remediation, and
          board-ready output — with tenant isolation enforced at every step.
        </p>
        <div className="flex w-full flex-col items-stretch justify-center gap-4 pt-6 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href={SALES_CONTACT_PATH}
            className="inline-flex h-11 w-full touch-manipulation items-center justify-center rounded-lg bg-indigo-600 px-6 font-sans text-sm font-bold tracking-wide text-white uppercase transition-all duration-150 hover:bg-indigo-500 active:scale-[0.98] sm:w-auto"
          >
            Request a {WORKFLOW_REVIEW_CTA_MINUTES} min workflow review
          </Link>
          <Link
            href="/product-demo"
            className="inline-flex h-11 w-full touch-manipulation items-center justify-center rounded-lg border border-slate-600 bg-slate-900/60 px-6 font-sans text-sm font-medium text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-800/80 sm:w-auto"
          >
            Open guided demonstration
          </Link>
        </div>
        <p className="mx-auto max-w-xl font-mono text-xs text-[var(--login-muted)]">
          Path B design-partner on-ramp {formatPathBUsd()} · {DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day scoped
          engagement
        </p>
      </header>

      <hr className="my-4 border-[var(--login-border)]" aria-hidden="true" />

      <section
        id="workflow"
        className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16"
        aria-labelledby="workflow-heading"
      >
        <h2
          id="workflow-heading"
          className="mb-2 font-mono text-xs tracking-widest text-[var(--login-accent)] uppercase"
        >
          One complete workflow
        </h2>
        <h3 className="mb-4 text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-3xl">
          From risk intake to board-ready output
        </h3>
        <p className="mb-8 max-w-3xl text-sm leading-relaxed text-[var(--login-muted)] sm:text-base">
          The guided demo walks a sandbox company through seven steps. Every figure is labeled
          demonstration data — not a live customer record. Opening the sandbox uses mock auth and
          client-side fixtures only — it does not provision a tenant or write to production databases.
        </p>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW_STEPS.map((label, index) => (
            <li
              key={label}
              className="rounded-lg border border-[var(--login-border)] bg-[var(--bg-primary)] p-4"
            >
              <p className="font-mono text-[10px] text-[var(--login-muted)]">STEP {index + 1}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-main)]">{label}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <Link
            href="/product-demo"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-cyan-600/50 bg-cyan-950/30 px-5 text-sm font-medium text-cyan-100 hover:bg-cyan-900/40"
          >
            Start the guided demo →
          </Link>
        </div>
      </section>

      <section
        id="outcomes"
        className="scroll-mt-24 border-y border-[var(--login-border)] bg-[var(--bg-secondary)] py-16"
        aria-labelledby="outcomes-heading"
      >
        <div className="mx-auto max-w-6xl px-6">
          <h2
            id="outcomes-heading"
            className="mb-2 font-mono text-xs tracking-widest text-[var(--login-accent)] uppercase"
          >
            Path B package
          </h2>
          <h3 className="mb-4 text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-3xl">
            What a committee can approve — before a longer sales cycle
          </h3>
          <p className="mb-8 max-w-3xl text-sm leading-relaxed text-[var(--login-muted)] sm:text-base">
            Forward this block to finance, audit, or the GRC owner. Same commercial truth as pricing
            and outreach — no open-ended free pilot.
          </p>

          <dl className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-[var(--login-border)] bg-[var(--bg-primary)] p-5">
              <dt className="font-mono text-[10px] tracking-widest text-[var(--login-muted)] uppercase">
                On-ramp
              </dt>
              <dd className="mt-2 text-lg font-bold text-[var(--text-main)]">{formatPathBUsd()}</dd>
              <dd className="mt-1 text-xs leading-relaxed text-[var(--login-muted)]">
                Path B / Command Tier design-partner seat
              </dd>
            </div>
            <div className="rounded-lg border border-[var(--login-border)] bg-[var(--bg-primary)] p-5">
              <dt className="font-mono text-[10px] tracking-widest text-[var(--login-muted)] uppercase">
                Window
              </dt>
              <dd className="mt-2 text-lg font-bold text-[var(--text-main)]">
                {DESIGN_PARTNER_DEFAULT_WINDOW_DAYS} days
              </dd>
              <dd className="mt-1 text-xs leading-relaxed text-[var(--login-muted)]">
                Convert or exit — not an indefinite trial
              </dd>
            </div>
            <div className="rounded-lg border border-[var(--login-border)] bg-[var(--bg-primary)] p-5">
              <dt className="font-mono text-[10px] tracking-widest text-[var(--login-muted)] uppercase">
                Success bar
              </dt>
              <dd className="mt-2 text-lg font-bold text-[var(--text-main)]">
                {DESIGN_PARTNER_SUCCESS_CRITERIA_COUNT} criteria
              </dd>
              <dd className="mt-1 text-xs leading-relaxed text-[var(--login-muted)]">
                You name them in writing at kickoff
              </dd>
            </div>
            <div className="rounded-lg border border-[var(--login-border)] bg-[var(--bg-primary)] p-5">
              <dt className="font-mono text-[10px] tracking-widest text-[var(--login-muted)] uppercase">
                Planned GA
              </dt>
              <dd className="mt-2 text-lg font-bold text-[var(--text-main)]">
                ~{formatPlannedGaCommandUsd()}/yr
              </dd>
              <dd className="mt-1 text-xs leading-relaxed text-[var(--login-muted)]">
                Ironframe Command — labeled planned until GA
              </dd>
            </div>
          </dl>

          <div className="mb-10 rounded-lg border border-dashed border-[var(--login-border)] bg-[var(--bg-primary)] p-5">
            <p className="font-mono text-[10px] tracking-widest text-[var(--login-accent)] uppercase">
              Illustrative only — not promised deliverables
            </p>
            <p className="mt-2 text-sm text-[var(--login-muted)]">
              Partners write their own {DESIGN_PARTNER_SUCCESS_CRITERIA_COUNT} criteria. Examples of
              the shape (not results we claim):
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--text-main)]">
              {ILLUSTRATIVE_SUCCESS_CRITERIA.map((criterion) => (
                <li key={criterion}>{criterion}</li>
              ))}
            </ol>
          </div>

          <h4 className="mb-4 text-sm font-semibold tracking-tight text-[var(--text-main)]">
            What the workspace is built to help you defend
          </h4>
          <div className="mb-10 grid gap-4 md:grid-cols-3">
            {COMMITTEE_DEFENSIBLES.map((item) => (
              <article
                key={item.title}
                className="rounded-lg border border-[var(--login-border)] bg-[var(--bg-primary)] p-5"
              >
                <h5 className="mb-2 text-base font-bold text-[var(--text-main)]">{item.title}</h5>
                <p className="text-sm leading-relaxed text-[var(--login-muted)]">{item.desc}</p>
              </article>
            ))}
          </div>

          <div className="flex w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href={SALES_CONTACT_PATH}
              className="inline-flex h-11 w-full touch-manipulation items-center justify-center rounded-lg bg-indigo-600 px-6 font-sans text-sm font-bold tracking-wide text-white uppercase transition-all duration-150 hover:bg-indigo-500 active:scale-[0.98] sm:w-auto"
            >
              Request a {WORKFLOW_REVIEW_CTA_MINUTES} min workflow review
            </Link>
            <Link
              href="/product-demo"
              className="inline-flex h-11 w-full touch-manipulation items-center justify-center rounded-lg border border-slate-600 bg-slate-900/60 px-6 font-sans text-sm font-medium text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-800/80 sm:w-auto"
            >
              Open guided demonstration
            </Link>
          </div>
          <p className="mt-4 max-w-2xl text-xs leading-relaxed text-[var(--login-muted)]">
            Self-serve the sandbox first if you want product proof; use the workflow review to align
            scope and success criteria with your buying group — not a product preview.
          </p>
        </div>
      </section>

      <section
        id="solutions"
        className="mx-auto max-w-6xl px-6 py-12 scroll-mt-24"
        aria-labelledby="solutions-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="solutions-heading"
              className="font-mono text-xs tracking-widest text-[var(--login-accent)] uppercase"
            >
              Baseline solutions
            </h2>
            <p className="mt-2 text-xl font-bold tracking-tight text-[var(--text-main)]">
              Five deep-dives aligned to operational demo baselines.
            </p>
          </div>
          <Link href="/solutions" className="text-sm font-medium text-cyan-300 underline hover:opacity-90">
            View all solutions →
          </Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {SOLUTION_PAGES.map((solution) => (
            <Link
              key={solution.slug}
              href={`/solutions/${solution.slug}`}
              className="rounded-lg border border-[var(--login-border)] bg-[var(--bg-primary)] p-4 transition hover:border-cyan-700/50"
            >
              <h3 className="text-sm font-semibold text-[var(--text-main)]">{solution.eyebrow}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--login-muted)]">{solution.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section
        id="proof"
        className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16"
        aria-labelledby="proof-heading"
      >
        <h2
          id="proof-heading"
          className="mb-2 font-mono text-xs tracking-widest text-[var(--login-accent)] uppercase"
        >
          Proof surfaces
        </h2>
        <h3 className="mb-4 text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-3xl">
          See the product, then talk scope
        </h3>
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Link href="/product-demo" className="block overflow-hidden rounded-lg border border-[var(--login-border)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- static marketing proof captures */}
            <img
              src="/marketing/proof/product-demo.png"
              alt="Screenshot of the Ironframe guided product demonstration"
              className="h-40 w-full object-cover object-top"
            />
            <p className="p-3 text-xs text-[var(--login-muted)]">Guided demo (UI capture)</p>
          </Link>
          <Link href="/marketing" className="block overflow-hidden rounded-lg border border-[var(--login-border)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- static marketing proof captures */}
            <img
              src="/marketing/proof/homepage.png"
              alt="Screenshot of the Ironframe marketing homepage"
              className="h-40 w-full object-cover object-top"
            />
            <p className="p-3 text-xs text-[var(--login-muted)]">Marketing homepage (UI capture)</p>
          </Link>
          <Link href="/trust-center" className="block overflow-hidden rounded-lg border border-[var(--login-border)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- static marketing proof captures */}
            <img
              src="/marketing/proof/trust-center.png"
              alt="Screenshot of the Ironframe public Trust Center"
              className="h-40 w-full object-cover object-top"
            />
            <p className="p-3 text-xs text-[var(--login-muted)]">Trust Center (UI capture)</p>
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/product-demo"
            className="rounded-lg border border-[var(--login-border)] p-5 transition hover:border-cyan-700/50"
          >
            <h4 className="font-semibold text-[var(--text-main)]">Guided demonstration</h4>
            <p className="mt-2 text-sm text-[var(--login-muted)]">
              Seven-step sandbox walkthrough with labeled demo data.
            </p>
          </Link>
          <Link
            href="/tools"
            className="rounded-lg border border-[var(--login-border)] p-5 transition hover:border-cyan-700/50"
          >
            <h4 className="font-semibold text-[var(--text-main)]">Free control tools</h4>
            <p className="mt-2 text-sm text-[var(--login-muted)]">
              Ungated worksheets and checklists — templates only, not certifications.
            </p>
          </Link>
          <Link
            href={SALES_CONTACT_PATH}
            className="rounded-lg border border-[var(--login-border)] p-5 transition hover:border-cyan-700/50"
          >
            <h4 className="font-semibold text-[var(--text-main)]">Workflow review</h4>
            <p className="mt-2 text-sm text-[var(--login-muted)]">
              {WORKFLOW_REVIEW_CTA_MINUTES} minutes to map one spreadsheet workflow to Ironframe.
            </p>
          </Link>
        </div>
      </section>

      {publishedBriefingCards.length > 0 ? (
        <aside
          id="further-reading"
          className="border-t border-[var(--login-border)] bg-[var(--bg-secondary)]/40"
          aria-labelledby="further-reading-heading"
        >
          <div className="mx-auto max-w-6xl px-6 py-10">
            <p
              id="further-reading-heading"
              className="font-mono text-[10px] tracking-widest text-[var(--login-muted)] uppercase"
            >
              Further reading
            </p>
            <p className="mt-2 max-w-2xl text-sm text-[var(--login-muted)]">
              Optional context from Governance Frame — separate from this product page. Full archive
              on research.ironframegrc.com.
            </p>
            <div className="mt-5" role="region" aria-label="Further reading briefings">
              <BriefingsArchive cards={publishedBriefingCards} variant="teaser" />
            </div>
          </div>
        </aside>
      ) : null}

      <footer className="w-full border-t border-[var(--login-border)] bg-[var(--bg-primary)] px-6 py-8 text-center font-mono text-xs text-[var(--login-muted)]">
        <p>© 2026 IRONFRAME GRC SYSTEM INC. ALL RIGHTS RESERVED.</p>
        <p className="mt-2">
          <Link href="/trust-center" className="text-[var(--login-accent)] underline hover:opacity-90">
            Trust Center
          </Link>
          {" · "}
          <Link href="/pricing" className="text-[var(--login-accent)] underline hover:opacity-90">
            Pricing
          </Link>
          {" · "}
          <Link href="/resources/briefings" className="text-[var(--login-accent)] underline hover:opacity-90">
            Briefings
          </Link>
          {" · "}
          <Link href="/privacy" className="text-[var(--login-accent)] underline hover:opacity-90">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="text-[var(--login-accent)] underline hover:opacity-90">
            Terms
          </Link>
        </p>
      </footer>
    </main>
  );
}
