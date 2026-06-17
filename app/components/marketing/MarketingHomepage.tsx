import Link from "next/link";
import { SALES_CONTACT_PATH } from "@/config/registration";

const REGULATORY_BRIEFS = [
  {
    id: "dora-2026",
    tag: "DORA",
    title: "Financial Entity Operational Resilience Enforcement Phase II",
    risk: "HIGH" as const,
  },
  {
    id: "eu-ai-act",
    tag: "EU AI Act",
    title: "Prohibited Practices and Mandatory Documentation Cut-Offs",
    risk: "CRITICAL" as const,
  },
  {
    id: "nis2-compliance",
    tag: "NIS2",
    title: "Critical Infrastructure Supply-Chain Dependency Audits",
    risk: "HIGH" as const,
  },
  {
    id: "cmmc-rev2",
    tag: "CMMC",
    title: "Defense Industrial Base Level 3 Control Alignment and Evidence Cadence",
    risk: "HIGH" as const,
  },
];

const SECTOR_CUES = ["Finance", "Healthcare", "Utilities", "Defense"] as const;

export default function MarketingHomepage() {
  return (
    <main
      className="ironframe-public-landing min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)] transition-colors duration-200"
      data-ironframe-surface="public-landing"
      aria-labelledby="homepage-hero-title"
    >
      <nav
        className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-[var(--login-border)] bg-[var(--bg-primary)] px-6 py-4"
        aria-label="Global execution navigation"
      >
        <p className="font-mono text-xl font-bold tracking-tight" aria-label="Ironframe Governance Risk and Compliance">
          <span aria-hidden="true">
            IRONFRAME<span className="ml-1 text-xs text-[var(--login-accent)]">GRC</span>
          </span>
        </p>
        <div className="hidden space-x-8 text-sm font-medium text-[var(--login-muted)] md:ml-auto md:flex" role="list">
          <a href="#problem" className="transition-colors hover:text-[var(--text-main)]" role="listitem">
            The Problem
          </a>
          <a href="#solution" className="transition-colors hover:text-[var(--text-main)]" role="listitem">
            The Solution
          </a>
          <a href="#pulse" className="transition-colors hover:text-[var(--text-main)]" role="listitem">
            GRC Pulse
          </a>
          <a href="#workforce" className="transition-colors hover:text-[var(--text-main)]" role="listitem">
            19-Agent Grid
          </a>
        </div>
      </nav>

      <header className="mx-auto max-w-6xl space-y-6 px-6 pt-20 pb-16 text-center">
        <div
          className="inline-flex items-center space-x-2 rounded-full border border-[var(--login-accent)]/20 bg-[var(--login-accent)]/10 px-3 py-1 font-mono text-xs text-[var(--login-accent)]"
          role="status"
          aria-live="polite"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--login-accent)]" aria-hidden="true" />
          <span>One engine · isolated tenant enclaves · continuous integrity</span>
        </div>
        <h1
          id="homepage-hero-title"
          className="mx-auto max-w-4xl text-4xl leading-tight font-bold tracking-tight text-[var(--text-main)] sm:text-5xl lg:text-6xl"
        >
          Ironframe: The Immutable Standard for AI-Driven GRC
        </h1>
        <p className="mx-auto max-w-3xl text-lg leading-relaxed text-[var(--login-muted)] sm:text-xl">
          The multi-tenant command post for regulated enterprises and MSSP operators — deterministic
          compliance from threat intake through audit ledger to board-ready reporting.
        </p>
        <p className="mx-auto max-w-2xl font-mono text-xs tracking-wide text-[var(--login-muted)] sm:text-sm">
          {SECTOR_CUES.join(" · ")} — each workspace ring-fenced at{" "}
          <span className="text-[var(--login-accent)]">tenant.ironframegrc.com</span>
        </p>
        <div className="flex flex-col items-center justify-center gap-4 pt-6 sm:flex-row">
          <Link
            href={SALES_CONTACT_PATH}
            className="w-full rounded-md bg-[var(--login-accent)] px-8 py-3 text-center font-mono text-sm font-bold text-[var(--bg-primary)] transition-all hover:opacity-90 sm:w-auto"
          >
            Request demo: Contact sales
          </Link>
          <a
            href="#pulse"
            className="w-full rounded-md border border-[var(--login-border)] px-8 py-3 text-center font-mono text-sm font-medium text-[var(--text-main)] transition-all hover:opacity-90 sm:w-auto"
          >
            Explore the GRC Pulse
          </a>
        </div>
      </header>

      <hr className="my-4 border-[var(--login-border)]" aria-hidden="true" />

      <section
        id="problem"
        className="mx-auto max-w-6xl px-6 py-16"
        aria-labelledby="problem-heading"
      >
        <h2
          id="problem-heading"
          className="mb-2 font-mono text-xs tracking-widest text-[var(--login-accent)] uppercase"
        >
          The Structural Conflict
        </h2>
        <h3 className="mb-4 text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-3xl">
          Why Regulated Operators Still Lose the GRC Loop
        </h3>
        <p className="mb-8 max-w-3xl text-sm leading-relaxed text-[var(--login-muted)] sm:text-base">
          Healthcare, finance, utilities, and defense teams run the same failure mode: threats arrive in
          one console, controls live in another, audit evidence decays in spreadsheets, and the board
          sees a snapshot — not a deterministic chain of custody.
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Broken Threat-to-Risk Chain",
              desc: "Irongate-sanitized intake, Ironwatch telemetry, and quarantine playbooks sit disconnected from the active risk register — masking systemic exposure across tenant boundaries.",
            },
            {
              title: "Manual Spreadsheet Labor",
              desc: "Analysts re-key live logs into stale workbooks the moment an engineer saves them — eroding HITL attestations and BIGINT financial locks before auditors arrive.",
            },
            {
              title: "Retroactive Board Narratives",
              desc: "Critical assessments assembled after the fact instead of streaming maturity scores, ALE baselines, and Ironbloom ESG signals directly to executives.",
            },
          ].map((item, index) => (
            <article
              key={item.title}
              className="rounded-lg border border-[var(--login-border)] bg-[var(--bg-primary)] p-6"
            >
              <p className="mb-3 font-mono text-xs text-[var(--login-muted)]">CRITICAL ERR_0{index + 1}</p>
              <h4 className="mb-2 text-lg font-bold text-[var(--text-main)]">{item.title}</h4>
              <p className="text-sm leading-relaxed text-[var(--login-muted)]">{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="workforce"
        className="border-y border-[var(--login-border)] bg-[var(--bg-secondary)] py-16"
        aria-labelledby="workforce-heading"
      >
        <div className="mx-auto max-w-6xl px-6">
          <h2
            id="workforce-heading"
            className="mb-2 font-mono text-xs tracking-widest text-[var(--login-accent)] uppercase"
          >
            The Defensive Architecture
          </h2>
          <h3
            id="solution"
            className="mb-4 text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-3xl"
          >
            One Engine. Many Enclaves. Full GRC Loop.
          </h3>
          <p className="mb-10 max-w-3xl text-sm leading-relaxed text-[var(--login-muted)] sm:text-base">
            Ironframe runs a 19-agent workforce behind a single immutable core — each customer workspace
            isolated by subdomain, row-level security, and tenant-scoped vaults from threat pipeline through
            audit export.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                core: "19-Agent Workforce",
                highlight:
                  "Ironwatch, Irongate, Ironlock, and Ironbloom orchestrate intake, quarantine, HITL gates, and ESG pulse — checkpointed, never silent.",
              },
              {
                core: "Immutable Audit Ledger",
                highlight:
                  "Tamper-proof Audit Intelligence with cryptographic export hashes on every configuration and attestation change.",
              },
              {
                core: "BIGINT Financial Lock",
                highlight:
                  "ALE exposure, insurance posture, and mitigation value in integer cents exclusively — zero float drift across tenants.",
              },
              {
                core: "Tenant-Scoped Enclaves",
                highlight:
                  "Dedicated subdomains (e.g. vaultbank.ironframegrc.com) with strict RLS — no cross-company memory bleed at the edge.",
              },
            ].map((feature) => (
              <article
                key={feature.core}
                className="rounded-lg border border-[var(--login-border)] bg-[var(--bg-primary)] p-6"
              >
                <h4 className="mb-2 font-mono text-base font-bold text-[var(--text-main)]">{feature.core}</h4>
                <p className="text-xs leading-relaxed text-[var(--login-muted)]">{feature.highlight}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pulse" className="mx-auto max-w-6xl px-6 py-16" aria-labelledby="pulse-heading">
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <h2
              id="pulse-heading"
              className="font-mono text-xs tracking-widest text-[var(--login-accent)] uppercase"
            >
              Live Global Framework Matrix
            </h2>
            <h3 className="text-2xl font-bold tracking-tight text-[var(--text-main)] sm:text-3xl">
              Active Regulatory Horizons
            </h3>
            <div role="region" aria-live="polite" aria-label="Regulatory updates" className="space-y-4">
              {REGULATORY_BRIEFS.map((brief) => (
                <article
                  key={brief.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-[var(--login-border)] bg-[var(--bg-primary)] p-4"
                >
                  <div>
                    <span className="mb-1 inline-block rounded bg-[var(--bg-secondary)] px-2 py-0.5 font-mono text-[10px] text-[var(--login-muted)]">
                      {brief.tag}
                    </span>
                    <h4 className="text-sm font-medium text-[var(--text-main)]">{brief.title}</h4>
                  </div>
                  <span
                    className="rounded border px-2 py-0.5 font-mono text-[10px] font-bold"
                    style={{
                      color: brief.risk === "CRITICAL" ? "var(--login-error)" : "var(--login-warning)",
                      borderColor:
                        brief.risk === "CRITICAL"
                          ? "color-mix(in srgb, var(--login-error) 20%, transparent)"
                          : "color-mix(in srgb, var(--login-warning) 20%, transparent)",
                      backgroundColor:
                        brief.risk === "CRITICAL"
                          ? "color-mix(in srgb, var(--login-error) 10%, transparent)"
                          : "color-mix(in srgb, var(--login-warning) 10%, transparent)",
                    }}
                  >
                    {brief.risk}
                  </span>
                </article>
              ))}
            </div>
          </div>

          <aside
            className="space-y-6 rounded-xl border border-[var(--login-border)] bg-[var(--bg-secondary)] p-6"
            aria-labelledby="pulse-sidebar-heading"
          >
            <h4 id="pulse-sidebar-heading" className="sr-only">
              System telemetry sidebar
            </h4>
            <div>
              <h5 className="mb-3 font-mono text-xs tracking-wider text-[var(--login-muted)] uppercase">
                System Synchronicity
              </h5>
              <dl className="space-y-2 font-mono text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--login-muted)]">Global node base</dt>
                  <dd className="font-medium text-[var(--text-main)]">UTC / ZULU</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--login-muted)]">EU regulatory target</dt>
                  <dd className="font-medium text-[var(--text-main)]">Brussels (CEST)</dd>
                </div>
              </dl>
            </div>
            <hr className="border-[var(--login-border)]" aria-hidden="true" />
            <div>
              <h5 className="mb-3 font-mono text-xs tracking-wider text-[var(--login-muted)] uppercase">
                Operational Telemetry
              </h5>
              <dl className="space-y-2 font-mono text-xs text-[var(--text-main)]">
                <div className="flex justify-between gap-4">
                  <dt>Ironwatch integrity</dt>
                  <dd className="font-bold text-[var(--login-accent)]">Live / checkpointed</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Ironbloom carbon pulse</dt>
                  <dd className="font-bold text-[var(--login-accent)]">ESG differentiated</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Threat pipeline</dt>
                  <dd className="font-bold text-[var(--login-accent)]">Intake → active risk</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </section>

      <footer className="w-full border-t border-[var(--login-border)] bg-[var(--bg-primary)] px-6 py-8 text-center font-mono text-xs text-[var(--login-muted)]">
        <p>© 2026 IRONFRAME GRC SYSTEM INC. ALL RIGHTS RESERVED.</p>
        <p className="mt-2">
          Operating under constitutional framework{" "}
          <Link href="/docs/hub" className="text-[var(--login-accent)] underline hover:opacity-90">
            TAS documentation
          </Link>
          . Adhering to zero-trust data ingress policy.
        </p>
      </footer>
    </main>
  );
}
