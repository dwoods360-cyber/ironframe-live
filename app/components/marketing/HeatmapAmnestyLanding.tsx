import Link from "next/link";

import {
  CUSTOMER_FACING_PATH_B_SKU,
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  WORKFLOW_REVIEW_CTA_MINUTES,
  formatPathBUsd,
} from "@/lib/ironframeProductKnowledge/commercial";
import { SALES_CONTACT_PATH } from "@/config/registration";
import PublicApexNav from "@/app/components/marketing/PublicApexNav";

/**
 * Heatmap Amnesty — Priority-1 Path B landing for CISO / CFO buyers.
 * Copy locks: docs/sales/heatmap-amnesty-campaign.md + control-to-capital-market-narrative.md
 */
export default function HeatmapAmnestyLanding() {
  return (
    <main
      className="ironframe-public-landing relative min-h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-main)]"
      data-ironframe-surface="heatmap-amnesty"
      aria-labelledby="amnesty-hero-title"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in srgb, var(--login-accent) 28%, transparent), transparent 55%), repeating-linear-gradient(0deg, transparent, transparent 47px, color-mix(in srgb, var(--login-border) 55%, transparent) 48px), repeating-linear-gradient(90deg, transparent, transparent 47px, color-mix(in srgb, var(--login-border) 35%, transparent) 48px)",
        }}
      />

      <PublicApexNav />

      <section className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-center px-6 py-16 text-center sm:py-20">
        <p className="animate-fadeIn font-mono text-[11px] font-bold tracking-[0.35em] text-[var(--login-accent)] uppercase">
          Heatmap Amnesty
        </p>
        <p
          className="animate-fadeIn mt-5 font-mono text-sm font-black tracking-[0.4em] text-[var(--text-main)] sm:text-base"
          style={{ animationDelay: "80ms" }}
        >
          IRONFRAME
        </p>
        <h1
          id="amnesty-hero-title"
          className="animate-fadeIn mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-[var(--text-main)] sm:text-5xl lg:text-6xl"
          style={{ animationDelay: "140ms" }}
        >
          Amnesty for color-coded guesswork
        </h1>
        <p
          className="animate-fadeIn mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--login-muted)] sm:text-xl"
          style={{ animationDelay: "220ms" }}
        >
          Keep the heatmap if you must. Make estimated dollar exposure — in whole cents — the layer
          your board uses to allocate capital.
        </p>
        <div
          className="animate-fadeIn mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
          style={{ animationDelay: "320ms" }}
        >
          <Link
            href={SALES_CONTACT_PATH}
            className="inline-flex h-12 touch-manipulation items-center justify-center rounded-lg bg-teal-600 px-7 font-sans text-sm font-bold tracking-wide text-white uppercase transition hover:bg-teal-500 active:scale-[0.98]"
          >
            Schedule {WORKFLOW_REVIEW_CTA_MINUTES} min workflow review
          </Link>
          <Link
            href="/marketing"
            className="inline-flex h-12 touch-manipulation items-center justify-center rounded-lg border border-[var(--login-border)] bg-transparent px-7 font-sans text-sm font-medium text-[var(--text-main)] transition hover:border-[var(--login-accent)]/50"
          >
            Back to Command overview
          </Link>
        </div>
        <p className="mx-auto mt-6 max-w-md text-xs leading-relaxed text-[var(--login-muted)]">
          {CUSTOMER_FACING_PATH_B_SKU}: {formatPathBUsd()} · {DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}
          -day co-builder window — not a free pilot.
        </p>
      </section>

      <section
        className="relative border-t border-[var(--login-border)] bg-[var(--bg-secondary)] py-16"
        aria-labelledby="decision-gap-heading"
      >
        <div className="mx-auto max-w-3xl px-6">
          <h2
            id="decision-gap-heading"
            className="font-mono text-xs tracking-widest text-[var(--login-accent)] uppercase"
          >
            The decision gap
          </h2>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-[var(--text-main)] sm:text-3xl">
            Stoplight tiles don’t survive a CFO conversation
          </p>
          <p className="mt-4 text-base leading-relaxed text-[var(--login-muted)]">
            Finance already speaks in probability and dollars. When cyber walks in with Red / Yellow /
            Green as the decision layer, the room is speaking two languages. Estimated loss exposure —
            with assumptions visible — is how you join the capital conversation. Heatmaps can remain
            context; they should not be the only answer.
          </p>
        </div>
      </section>

      <section className="relative mx-auto max-w-5xl px-6 py-16" aria-labelledby="loop-heading">
        <h2
          id="loop-heading"
          className="text-center font-mono text-xs tracking-widest text-[var(--login-accent)] uppercase"
        >
          Control-to-capital loop
        </h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Estimate exposure",
              body: "Whole-cent estimated loss exposure and ranges — not float theater, not a single ‘true ALE’ fantasy number.",
            },
            {
              step: "02",
              title: "Link the chain",
              body: "Controls, evidence, owners, and remediation stay connected so the board pack isn’t a ticket dump.",
            },
            {
              step: "03",
              title: "Keep walls hard",
              body: "Subsidiaries and clients stay isolated at the platform boundary — with a command view that doesn’t bleed registers.",
            },
          ].map((item) => (
            <li key={item.step} className="text-left">
              <p className="font-mono text-xs text-[var(--login-accent)]">{item.step}</p>
              <h3 className="mt-2 text-lg font-semibold text-[var(--text-main)]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--login-muted)]">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="relative border-t border-[var(--login-border)] py-16"
        aria-labelledby="amnesty-close-heading"
      >
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2
            id="amnesty-close-heading"
            className="text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-3xl"
          >
            Grant yourself amnesty
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--login-muted)]">
            A short workflow review maps how your board or examiner pack is built today — peer
            diligence, not a demo circus. If it fits, Command Design Partner is a capped co-builder
            seat with written success criteria.
          </p>
          <Link
            href={SALES_CONTACT_PATH}
            className="mt-8 inline-flex h-12 touch-manipulation items-center justify-center rounded-lg bg-teal-600 px-8 font-sans text-sm font-bold tracking-wide text-white uppercase transition hover:bg-teal-500"
          >
            Book the workflow review
          </Link>
        </div>
      </section>
    </main>
  );
}
