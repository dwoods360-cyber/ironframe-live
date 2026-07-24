import Link from "next/link";
import type { Metadata } from "next";

import { SALES_CONTACT_PATH } from "@/config/registration";
import { resolveStripeCommandTierCheckoutUrl } from "@/config/stripe";
import {
  CUSTOMER_FACING_PATH_B_SKU,
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  WORKFLOW_REVIEW_CTA_MINUTES,
  formatPathBUsd,
  formatPlannedGaCommandUsd,
} from "@/lib/ironframeProductKnowledge/commercial";

export const metadata: Metadata = {
  title: "Pricing | Ironframe",
  description: `Ironframe ${CUSTOMER_FACING_PATH_B_SKU}: ${formatPathBUsd()} for a ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day paid design engagement. Ironframe Command planned GA ~${formatPlannedGaCommandUsd()}/yr — not a free pilot.`,
  robots: {
    index: false,
    follow: false,
  },
};

const COMMAND_FEATURES = [
  "Multi-tenant command post with strict workspace isolation (zero cross-tenant data bleed)",
  "Whole-cent financial exposure — replaces qualitative heatmap-only risk registers",
  "Zero-trust ingestion: evidence sanitized before it becomes trusted state",
  "Connected control ↔ evidence ↔ remediation chain with audit-ready exports",
  "Sales-assisted onboarding — workspace invite after agreement, not a self-serve free trial",
] as const;

export default function PricingPage() {
  const checkoutUrl = resolveStripeCommandTierCheckoutUrl();

  return (
    <main className="ironframe-public-funnel min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)]">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--login-accent)]">
          Commercial packaging
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          {CUSTOMER_FACING_PATH_B_SKU}. Zero free pilots.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--login-muted)]">
          For MSSPs, vCISOs, and multi-entity CISOs who need whole-cent exposure and strict
          multi-tenant isolation — not spreadsheet GRC or an open-ended PoC.
        </p>

        <div className="mt-16 grid gap-8 lg:grid-cols-1">
          <article className="relative overflow-hidden rounded-2xl border border-[var(--login-border)] bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)] p-8 shadow-xl shadow-black/20 sm:p-10">
            <div className="absolute right-6 top-6 rounded-full border border-[var(--login-accent)]/30 bg-[var(--login-accent)]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-[var(--login-accent)]">
              Design engagement
            </div>
            <h2 className="text-2xl font-semibold">{CUSTOMER_FACING_PATH_B_SKU}</h2>
            <p className="mt-2 text-sm text-[var(--login-muted)]">
              {DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day paid co-builder cohort with 2–3 written success
              metrics. Convert within the window and the fee credits Year-1 Ironframe Command
              (~{formatPlannedGaCommandUsd()}/yr, planned GA).
            </p>
            <p className="mt-8 font-mono text-3xl font-bold tracking-tight text-[var(--text-main)]">
              {formatPathBUsd()}
            </p>
            <p className="mt-1 text-xs text-[var(--login-muted)]">
              Flat platform fee · no per-seat licensing
              {checkoutUrl ? " · Stripe-hosted checkout after agreement" : ""}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-[var(--login-muted)]">
              Existing pending workspaces activate via a tenant-scoped invitation link from
              onboarding — never a second generic public checkout as a free trial substitute.
            </p>
            <ul className="mt-8 space-y-3 border-t border-[var(--login-border)] pt-8">
              {COMMAND_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-[var(--login-muted)]">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--login-accent)]"
                    aria-hidden
                  />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href={SALES_CONTACT_PATH}
                className="rounded-md bg-[var(--login-accent)] px-8 py-3 text-center font-mono text-sm font-bold text-[var(--bg-primary)] transition hover:opacity-90"
              >
                Schedule {WORKFLOW_REVIEW_CTA_MINUTES} min workflow review
              </Link>
              {checkoutUrl ? (
                <a
                  href={checkoutUrl}
                  rel="noopener noreferrer"
                  className="rounded-md border border-[var(--login-border)] px-8 py-3 text-center font-mono text-sm text-[var(--text-main)] transition hover:border-[var(--login-muted)]"
                >
                  Activate after agreement — Stripe
                </a>
              ) : null}
              <Link
                href="/trust-center"
                className="rounded-md border border-[var(--login-border)] px-8 py-3 text-center font-mono text-sm text-[var(--text-main)] transition hover:border-[var(--login-muted)]"
              >
                Trust Center
              </Link>
            </div>
          </article>
        </div>

        <p className="mt-12 text-center text-xs text-[var(--login-muted)]">
          Ironframe Command planned GA ~{formatPlannedGaCommandUsd()}/yr. Governance+, Sustainability,
          Vault, and MSSP Platform modules available as add-ons.{" "}
          <Link href="/terms" className="text-[var(--login-accent)] hover:underline">
            Terms
          </Link>
          {" · "}
          <Link href="/privacy" className="text-[var(--login-accent)] hover:underline">
            Privacy
          </Link>
        </p>
      </div>
    </main>
  );
}
