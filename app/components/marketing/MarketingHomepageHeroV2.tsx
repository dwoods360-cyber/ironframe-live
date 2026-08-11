import Link from "next/link";

import { WORKFLOW_REVIEW_CTA_MINUTES } from "@/lib/ironframeProductKnowledge/commercial";
import { SALES_CONTACT_PATH } from "@/config/registration";

import MarketingAnimatedLogo from "./MarketingAnimatedLogo";
import MarketingCityCycleSubtitle from "./MarketingCityCycleSubtitle";

/**
 * Cleaned marketing hero (2026-08-11): brand-first, one H1, one support, primary CTA.
 * Path B packaging + SLA live under Design Partner — not in the first viewport.
 * Revert: MARKETING_HERO_VARIANT = "legacy" in marketingHeroVariant.ts.
 */
export default function MarketingHomepageHeroV2() {
  return (
    <header className="mx-auto max-w-6xl px-6 pt-10 pb-16 text-center sm:pt-12 sm:pb-20">
      <div className="flex flex-col items-center">
        <MarketingAnimatedLogo className="h-32 w-32 sm:h-40 sm:w-40" />
        <p className="mt-5 font-mono text-3xl font-black tracking-[0.28em] text-[var(--text-main)] sm:text-4xl sm:tracking-[0.32em] lg:text-5xl">
          IRONFRAME
        </p>
        <div className="mt-3 opacity-80">
          <MarketingCityCycleSubtitle />
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-2xl font-mono text-xs tracking-[0.18em] text-[var(--login-muted)] uppercase sm:text-[13px]">
        For MSSPs, vCISOs, and multi-entity CISOs
      </p>

      <h1
        id="homepage-hero-title"
        className="mx-auto mt-4 max-w-3xl text-3xl leading-tight font-bold tracking-tight text-[var(--text-main)] sm:text-4xl lg:text-5xl"
      >
        Defend dollar risk in whole cents.
      </h1>

      <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--login-muted)] sm:text-lg">
        Hard tenant walls keep entities and clients from bleeding into one register. Estimated
        exposure, connected evidence, and board-ready output stay under zero-trust isolation — so
        color charts are context, not the capital conversation.
      </p>

      <div className="mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:items-center">
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
    </header>
  );
}
