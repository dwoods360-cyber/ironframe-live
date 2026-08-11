import Link from "next/link";

import {
  CUSTOMER_FACING_PATH_B_SKU,
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  WORKFLOW_REVIEW_CTA_MINUTES,
  formatPathBUsd,
} from "@/lib/ironframeProductKnowledge/commercial";
import { SALES_CONTACT_PATH } from "@/config/registration";

import MarketingAnimatedLogo from "./MarketingAnimatedLogo";
import MarketingCityCycleSubtitle from "./MarketingCityCycleSubtitle";

/**
 * Polished marketing hero (2026-08): brand-first hierarchy, approved copy,
 * primary CTA + guided demo as secondary text link.
 * Revert: MARKETING_HERO_VARIANT = "legacy" in marketingHeroVariant.ts.
 */
export default function MarketingHomepageHeroV2() {
  return (
    <>
      <div className="flex flex-col items-center px-4 pt-8 sm:px-6">
        <MarketingAnimatedLogo className="h-32 w-32 sm:h-40 sm:w-40" />
        <p className="mt-5 font-mono text-3xl font-black tracking-[0.28em] text-[var(--text-main)] sm:text-4xl sm:tracking-[0.32em] lg:text-5xl">
          IRONFRAME
        </p>
        <MarketingCityCycleSubtitle className="mt-3 mb-1 min-h-[1.5rem] text-center font-mono text-sm uppercase tracking-[0.2em] text-slate-400/90 sm:min-h-[1.75rem] sm:text-base sm:tracking-[0.22em]" />
      </div>

      <header className="mx-auto max-w-6xl space-y-5 px-6 pt-8 pb-16 text-center sm:space-y-6">
        <h1
          id="homepage-hero-title"
          className="mx-auto max-w-3xl text-2xl leading-tight font-bold tracking-tight text-[var(--text-main)] sm:text-3xl lg:text-4xl"
        >
          Control-first GRC for MSSPs, vCISOs &amp; multi-entity CISOs
        </h1>
        <p className="mx-auto max-w-2xl text-lg font-medium leading-snug text-[var(--text-main)] sm:text-xl">
          Defend dollar risk in whole cents — with hard tenant walls that keep entities and clients
          from bleeding into one register.
        </p>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-[var(--login-muted)] sm:text-lg">
          Put estimated exposure, connected evidence, and board-ready output under zero-trust
          isolation — so color charts are context, not the capital conversation.
        </p>
        <div className="flex w-full flex-col items-stretch justify-center gap-3 pt-4 sm:items-center">
          <Link
            href={SALES_CONTACT_PATH}
            className="inline-flex h-12 w-full touch-manipulation items-center justify-center rounded-lg bg-teal-600 px-8 font-sans text-sm font-bold tracking-wide text-white uppercase transition-all duration-150 hover:bg-teal-500 active:scale-[0.98] sm:w-auto"
          >
            Schedule {WORKFLOW_REVIEW_CTA_MINUTES} min workflow review
          </Link>
          <Link
            href="/product-demo"
            className="inline-flex min-h-[44px] items-center justify-center text-sm font-medium text-[var(--login-muted)] underline decoration-[var(--login-border)] underline-offset-4 transition-colors hover:text-[var(--text-main)]"
          >
            Open guided demonstration
          </Link>
        </div>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-[var(--login-muted)] sm:text-base">
          Primary next step: {WORKFLOW_REVIEW_CTA_MINUTES} min workflow review (by application) —
          not a free trial.
        </p>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-[var(--login-muted)] sm:text-base">
          {CUSTOMER_FACING_PATH_B_SKU}: {formatPathBUsd()} / {DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}
          -day engagement. Operator replies within 1 business day (Mon–Fri, 9 AM–5 PM CT).
        </p>
      </header>
    </>
  );
}
