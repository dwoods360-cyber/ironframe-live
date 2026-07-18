import Link from "next/link";

import { TRUST_CENTER_ARTIFACTS } from "@/app/lib/legal/procurement";
import { SALES_CONTACT_PATH } from "@/config/registration";
import {
  WORKFLOW_REVIEW_CTA_MINUTES,
} from "@/lib/ironframeProductKnowledge/commercial";

const PUBLIC_ARTIFACTS = TRUST_CENTER_ARTIFACTS.map((artifact) => ({
  ...artifact,
  href: `/trust-center/${artifact.slug}`,
}));

export default function PublicTrustCenter() {
  return (
    <main className="ironframe-public-funnel mx-auto min-h-screen max-w-4xl px-6 py-10 text-[var(--text-main)]">
      <p className="font-mono text-xs uppercase tracking-widest text-teal-400/90">
        Public Trust Center
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Trust &amp; security posture</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--login-muted)]">
        Ironframe is a governance product, so its own control environment is documented here for
        prospect diligence. This is design-partner diligence material — not legal advice and not a
        substitute for an executed DPA.
      </p>

      <section
        className="mt-8 rounded-lg border border-amber-500/35 bg-amber-950/25 p-5"
        aria-labelledby="cert-status-heading"
      >
        <h2 id="cert-status-heading" className="text-base font-semibold text-amber-100">
          Certification status (accurate)
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-amber-50/90">
          Ironframe is <strong className="font-semibold">not currently represented as SOC 2 certified</strong>.
          Diligence materials include SOC 2-aligned control narratives, technical measures, and
          architecture boundaries documented for design-partner review. Do not infer completed
          external attestation from marketing language.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="artifacts-heading">
        <h2 id="artifacts-heading" className="text-lg font-semibold">
          Published diligence artifacts
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {PUBLIC_ARTIFACTS.map((artifact) => (
            <li key={artifact.slug}>
              <Link
                href={artifact.href}
                className="block h-full rounded border border-[var(--login-border)] bg-[var(--bg-secondary)] p-5 transition hover:border-teal-700/60"
              >
                <h3 className="text-sm font-semibold text-teal-300">{artifact.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[var(--login-muted)]">
                  {artifact.summary}
                </p>
                <span className="mt-4 inline-block font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  View artifact →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded border border-[var(--login-border)] p-5" aria-labelledby="ai-policy-heading">
        <h2 id="ai-policy-heading" className="text-base font-semibold">
          AI-use boundary
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--login-muted)]">
          Where model inference is used (documented subprocessor: Google Gemini), prompts are scoped
          to de-classified telemetry for narrative synthesis. Human review and approval remain part of
          operator workflows. AI output is not a substitute for attested control evidence.
        </p>
      </section>

      <section className="mt-8 rounded border border-[var(--login-border)] p-5" aria-labelledby="product-claims-heading">
        <h2 id="product-claims-heading" className="text-base font-semibold">
          Product-claim boundaries
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--login-muted)]">
          <li>No invented customer logos or implied customer endorsements.</li>
          <li>Demo tenants (including Medshield, Vaultbank, Gridcore labels) are internal/sandbox fixtures — not customers.</li>
          <li>Certification and assurance status is stated only when earned; roadmap items are labeled as roadmap.</li>
        </ul>
      </section>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          href={SALES_CONTACT_PATH}
          className="inline-flex h-11 items-center justify-center rounded-md bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Request a {WORKFLOW_REVIEW_CTA_MINUTES} min workflow review
        </Link>
        <Link
          href="/privacy"
          className="inline-flex h-11 items-center justify-center rounded-md border border-slate-700 px-5 text-sm text-slate-200 hover:border-slate-500"
        >
          Privacy notice
        </Link>
        <Link
          href="/terms"
          className="inline-flex h-11 items-center justify-center rounded-md border border-slate-700 px-5 text-sm text-slate-200 hover:border-slate-500"
        >
          Terms of service
        </Link>
      </div>
    </main>
  );
}
