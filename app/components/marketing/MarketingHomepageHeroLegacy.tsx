import Link from "next/link";

import {
  CUSTOMER_FACING_PATH_B_SKU,
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  WORKFLOW_REVIEW_CTA_MINUTES,
  formatPathBUsd,
} from "@/lib/ironframeProductKnowledge/commercial";
import {
  INBOUND_LEAD_REPLY_SLA_HOURS,
  INBOUND_SLA_WINDOW_COPY,
} from "@/config/commercialGates";
import { SALES_CONTACT_PATH } from "@/config/registration";

import MarketingAnimatedLogo from "./MarketingAnimatedLogo";
import MarketingCityCycleSubtitle from "./MarketingCityCycleSubtitle";

/**
 * Pre-2026-08-11 marketing hero — preserved for revert.
 * Restore by setting MARKETING_HERO_VARIANT = "legacy" in marketingHeroVariant.ts.
 */
export default function MarketingHomepageHeroLegacy() {
  return (
    <>
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
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-[var(--login-accent)]"
            aria-hidden="true"
          />
          <span>For MSSPs, vCISOs, and multi-entity CISOs</span>
        </div>
        <h1
          id="homepage-hero-title"
          className="mx-auto max-w-4xl text-4xl leading-tight font-bold tracking-tight text-[var(--text-main)] sm:text-5xl lg:text-6xl"
        >
          Control-first GRC for MSSPs, vCISOs &amp; multi-entity CISOs
        </h1>
        <p className="mx-auto max-w-2xl text-xl font-medium leading-snug text-[var(--text-main)] sm:text-2xl">
          Defend dollar risk in whole cents — with hard tenant walls that keep entities and clients
          from bleeding into one register.
        </p>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-[var(--login-muted)] sm:text-lg">
          Put estimated exposure, connected evidence, and board-ready output under zero-trust
          isolation — so color charts are context, not the capital conversation.
        </p>
        <div className="flex w-full flex-col items-stretch justify-center gap-4 pt-6 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href={SALES_CONTACT_PATH}
            className="inline-flex h-11 w-full touch-manipulation items-center justify-center rounded-lg bg-teal-600 px-6 font-sans text-sm font-bold tracking-wide text-white uppercase transition-all duration-150 hover:bg-teal-500 active:scale-[0.98] sm:w-auto"
          >
            Schedule {WORKFLOW_REVIEW_CTA_MINUTES} min workflow review
          </Link>
          <Link
            href="/product-demo"
            className="inline-flex h-11 w-full touch-manipulation items-center justify-center rounded-lg border border-slate-600 bg-slate-900/60 px-6 font-sans text-sm font-medium text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-800/80 sm:w-auto"
          >
            Open guided demonstration
          </Link>
        </div>
        <p className="mx-auto max-w-xl text-xs leading-relaxed text-[var(--login-muted)]">
          Primary next step is a workflow review — not a free trial. {CUSTOMER_FACING_PATH_B_SKU}:{" "}
          {formatPathBUsd()} · {DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day paid design engagement.
        </p>
        <p className="mx-auto max-w-xl text-xs leading-relaxed text-[var(--login-muted)]">
          An operator typically replies within {INBOUND_LEAD_REPLY_SLA_HOURS} business hour (
          {INBOUND_SLA_WINDOW_COPY}).
        </p>
      </header>
    </>
  );
}
