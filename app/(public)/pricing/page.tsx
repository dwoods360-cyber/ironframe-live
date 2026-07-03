import Link from "next/link";

import { SALES_CONTACT_PATH } from "@/config/registration";
import { resolveStripeCommandTierCheckoutUrl } from "@/config/stripe";

const COMMAND_FEATURES = [
  "Multi-tenant Command Post with sovereign workspace isolation",
  "BigInt-cent ALE baselines and governed liability math",
  "Irongate-sanitized threat pipeline and audit trail exports",
  "Role-gated operator access with Supabase invite-only onboarding",
  "Instant activation via Stripe — no self-serve database forms on our origin",
] as const;

export default function PricingPage() {
  const checkoutUrl = resolveStripeCommandTierCheckoutUrl();

  return (
    <main className="ironframe-public-funnel min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)]">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--login-accent)]">
          Enterprise packaging
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          One premium tier. Zero spreadsheet GRC.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--login-muted)]">
          Ironframe Command Tier delivers the full multi-tenant command post for regulated operators
          who require deterministic financial integrity and isolated tenant enclaves. Checkout runs
          entirely on Stripe-hosted pages — our application stays closed until your workspace is
          provisioned.
        </p>

        <div className="mt-16 grid gap-8 lg:grid-cols-1">
          <article className="relative overflow-hidden rounded-2xl border border-[var(--login-border)] bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)] p-8 shadow-xl shadow-black/20 sm:p-10">
            <div className="absolute right-6 top-6 rounded-full border border-[var(--login-accent)]/30 bg-[var(--login-accent)]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-[var(--login-accent)]">
              Command Tier
            </div>
            <h2 className="text-2xl font-semibold">The Command Tier</h2>
            <p className="mt-2 text-sm text-[var(--login-muted)]">
              Single-tenant enterprise GRC — dashboard, active risks, threat pipeline, baseline
              exports. Payment clears → tenant enclave queues → secure email invite within seconds.
            </p>
            <p className="mt-8 font-mono text-3xl font-bold tracking-tight text-[var(--text-main)]">
              {checkoutUrl ? "Buy now" : "Contact sales"}
            </p>
            <p className="mt-1 text-xs text-[var(--login-muted)]">
              {checkoutUrl
                ? "Stripe-hosted checkout · metadata-driven async provisioning"
                : "Set NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL for instant buy"}
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
              {checkoutUrl ? (
                <a
                  href={checkoutUrl}
                  rel="noopener noreferrer"
                  className="rounded-md bg-[var(--login-accent)] px-8 py-3 text-center font-mono text-sm font-bold text-[var(--bg-primary)] transition hover:opacity-90"
                >
                  Buy now — Stripe Checkout
                </a>
              ) : null}
              <Link
                href={SALES_CONTACT_PATH}
                className="rounded-md border border-[var(--login-border)] px-8 py-3 text-center font-mono text-sm text-[var(--text-main)] transition hover:border-[var(--login-muted)]"
              >
                Contact sales
              </Link>
              <Link
                href="/docs"
                className="rounded-md border border-[var(--login-border)] px-8 py-3 text-center font-mono text-sm text-[var(--text-main)] transition hover:border-[var(--login-muted)]"
              >
                Review documentation
              </Link>
            </div>
          </article>
        </div>

        <p className="mt-12 text-center text-xs text-[var(--login-muted)]">
          Governance+, Sustainability, Vault, and MSSP Platform modules available as add-ons.{" "}
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
