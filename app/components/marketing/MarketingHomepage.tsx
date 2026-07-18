import Link from "next/link";

import type { PublishedBriefingCard } from "@/app/lib/governanceFrame/publishedBriefingLedgerCards";
import {
  DESIGN_PARTNER_WINDOW_DAYS,
  WORKFLOW_REVIEW_CTA_MINUTES,
  formatPathBUsd,
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

const OUTCOMES = [
  {
    title: "Quantitative risk, not color codes alone",
    desc: "Documented financial exposure in integer cents — assumptions and baselines operators can defend.",
  },
  {
    title: "Audit-ready evidence chain",
    desc: "Controls, evidence, owners, review history, and remediation stay connected in one workspace.",
  },
  {
    title: "Multi-entity separation with oversight",
    desc: "Subsidiaries, clients, and departments governed in isolated enclaves without losing the command view.",
  },
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
          Outcomes
        </a>
        <Link href="/product-demo" className="inline-flex min-h-[44px] shrink-0 items-center transition-colors hover:text-[var(--text-main)]">
          Guided demo
        </Link>
        <Link href="/trust-center" className="inline-flex min-h-[44px] shrink-0 items-center transition-colors hover:text-[var(--text-main)]">
          Trust Center
        </Link>
        <Link href="/pricing" className="inline-flex min-h-[44px] shrink-0 items-center transition-colors hover:text-[var(--text-main)]">
          Pricing
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
          Path B design-partner on-ramp {formatPathBUsd()} · {DESIGN_PARTNER_WINDOW_DAYS} day scoped engagement
        </p>
      </header>

      <hr className="my-4 border-[var(--login-border)]" aria-hidden="true" />

      <section
        id="workflow"
        className="mx-auto max-w-6xl px-6 py-16"
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
          demonstration data — not a live customer record.
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
        className="border-y border-[var(--login-border)] bg-[var(--bg-secondary)] py-16"
        aria-labelledby="outcomes-heading"
      >
        <div className="mx-auto max-w-6xl px-6">
          <h2
            id="outcomes-heading"
            className="mb-2 font-mono text-xs tracking-widest text-[var(--login-accent)] uppercase"
          >
            Business outcomes
          </h2>
          <h3 className="mb-4 text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-3xl">
            Administrative relief for regulated operators
          </h3>
          <p className="mb-10 max-w-3xl text-sm leading-relaxed text-[var(--login-muted)] sm:text-base">
            Mid-market buyers do not buy feature lists — they buy fewer handoffs, fewer unsupported
            risk assertions, and faster audit preparation.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {OUTCOMES.map((item) => (
              <article
                key={item.title}
                className="rounded-lg border border-[var(--login-border)] bg-[var(--bg-primary)] p-6"
              >
                <h4 className="mb-2 text-lg font-bold text-[var(--text-main)]">{item.title}</h4>
                <p className="text-sm leading-relaxed text-[var(--login-muted)]">{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12" aria-labelledby="solutions-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="solutions-heading"
              className="font-mono text-xs tracking-widest text-[var(--login-accent)] uppercase"
            >
              Focused solutions
            </h2>
            <p className="mt-2 text-xl font-bold tracking-tight text-[var(--text-main)]">
              Start with the workflow that needs attention.
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

      <section className="mx-auto max-w-6xl px-6 py-16" aria-labelledby="proof-heading">
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
          <a href="/product-demo" className="block overflow-hidden rounded-lg border border-[var(--login-border)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- static marketing proof captures */}
            <img
              src="/marketing/proof/product-demo.png"
              alt="Screenshot of the Ironframe guided product demonstration"
              className="h-40 w-full object-cover object-top"
            />
            <p className="p-3 text-xs text-[var(--login-muted)]">Guided demo (live capture)</p>
          </a>
          <a href="#workflow" className="block overflow-hidden rounded-lg border border-[var(--login-border)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- static marketing proof captures */}
            <img
              src="/marketing/proof/homepage.png"
              alt="Screenshot of the Ironframe product homepage"
              className="h-40 w-full object-cover object-top"
            />
            <p className="p-3 text-xs text-[var(--login-muted)]">Product homepage (live capture)</p>
          </a>
          <a href="/trust-center" className="block overflow-hidden rounded-lg border border-[var(--login-border)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- static marketing proof captures */}
            <img
              src="/marketing/proof/trust-center.png"
              alt="Screenshot of the Ironframe public Trust Center"
              className="h-40 w-full object-cover object-top"
            />
            <p className="p-3 text-xs text-[var(--login-muted)]">Trust Center (live capture)</p>
          </a>
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
        <section id="research" className="mx-auto max-w-6xl px-6 pb-16" aria-labelledby="research-heading">
          <h2
            id="research-heading"
            className="mb-2 font-mono text-xs tracking-widest text-[var(--login-accent)] uppercase"
          >
            Governance Frame research
          </h2>
          <h3 className="mb-3 text-xl font-bold tracking-tight text-[var(--text-main)]">
            Authority lives here — product conversion lives above
          </h3>
          <p className="mb-6 max-w-2xl text-sm text-[var(--login-muted)]">
            Institutional briefings are published separately from Ironframe product pages. Cards below
            project the published ledger only.
          </p>
          <div role="region" aria-live="polite" aria-label="Published briefings">
            <BriefingsArchive cards={publishedBriefingCards} variant="teaser" />
          </div>
          <Link
            href="/resources/briefings"
            className="mt-4 inline-flex text-sm text-cyan-300 underline hover:opacity-90"
          >
            Briefings archive →
          </Link>
        </section>
      ) : null}

      <footer className="w-full border-t border-[var(--login-border)] bg-[var(--bg-primary)] px-6 py-8 text-center font-mono text-xs text-[var(--login-muted)]">
        <p>© 2026 IRONFRAME GRC SYSTEM INC. ALL RIGHTS RESERVED.</p>
        <p className="mt-2">
          <Link href="/trust-center" className="text-[var(--login-accent)] underline hover:opacity-90">
            Trust Center
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
