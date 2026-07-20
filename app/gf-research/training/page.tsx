import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";

import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import { isGovernanceFramePublicHost } from "@/config/governanceFramePublic";

export const metadata: Metadata = {
  title: "Training · GFP",
  description:
    "Governance Frame Practitioner (GFP) training discovery — Reader, Writer, and Verifier paths. Curriculum and assessments live in Ironframe docs, not on this research publication.",
};

const TRAINING_DOCS_PATH = "/docs/training/governance-frame";

function ironframeProductOrigin(): string {
  return (
    process.env.IRONFRAME_CONTROL_PLANE_URL?.trim().replace(/\/$/, "") ||
    "https://www.ironframegrc.com"
  );
}

export default async function ResearchTrainingPage() {
  const host = (await headers()).get("host");
  const docsHref = isGovernanceFramePublicHost(host)
    ? `${ironframeProductOrigin()}${TRAINING_DOCS_PATH}`
    : TRAINING_DOCS_PATH;
  const docsIsExternal = docsHref.startsWith("http");

  return (
    <section aria-labelledby="training-heading" className="space-y-10">
      <div className="max-w-2xl border-b border-[var(--gf-line)] pb-8">
        <p className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gf-accent)]">
          Path D · Credential stack
        </p>
        <h1
          id="training-heading"
          className="mt-3 font-[family-name:var(--font-gf-serif)] text-3xl text-[var(--gf-ink)] sm:text-4xl"
        >
          Governance Frame Practitioner (GFP)
        </h1>
        <p className="mt-4 font-[family-name:var(--font-gf-serif)] text-lg leading-snug text-[var(--gf-ink-soft)]">
          Learn to read, write, and verify governance research under GF-STANDARDS-001 — separate from
          Ironframe product or Ops/GTM training.
        </p>
      </div>

      <div className="max-w-2xl space-y-4 font-[family-name:var(--font-gf-sans)] text-[15px] leading-relaxed text-[var(--gf-ink-soft)]">
        <p>
          This research site publishes papers, briefings, and editorial standards.{" "}
          <strong className="font-semibold text-[var(--gf-ink)]">
            Quizzes, labs, and certification rubrics are not hosted here
          </strong>
          . They live in the Ironframe documentation library under Path D.
        </p>
        <p>
          GFP is stackable: Reader (L1) → Writer (L2) → Verifier (L3). Completing all three yields the
          GFP credential. It does not replace professional certifications and is not a SOC attestation
          program.
        </p>
      </div>

      <div className="max-w-2xl space-y-3">
        <h2 className="font-[family-name:var(--font-gf-serif)] text-xl text-[var(--gf-ink)]">
          Levels
        </h2>
        <ul className="space-y-2 font-[family-name:var(--font-gf-sans)] text-[15px] text-[var(--gf-ink-soft)]">
          <li>
            <span className="font-semibold text-[var(--gf-ink)]">L1 Reader</span> — read published
            research with evidence discipline
          </li>
          <li>
            <span className="font-semibold text-[var(--gf-ink)]">L2 Writer</span> — draft under
            editorial standards and quarantine rules
          </li>
          <li>
            <span className="font-semibold text-[var(--gf-ink)]">L3 Verifier</span> — challenge claims,
            sources, and product-boundary labels
          </li>
        </ul>
      </div>

      <div className="max-w-2xl rounded-sm border border-[var(--gf-line)] bg-[var(--gf-paper-elevated)] px-5 py-6">
        <p className="font-[family-name:var(--font-gf-sans)] text-sm font-semibold uppercase tracking-[0.12em] text-[var(--gf-accent)]">
          Open curriculum
        </p>
        <p className="mt-2 font-[family-name:var(--font-gf-sans)] text-[15px] leading-relaxed text-[var(--gf-ink-soft)]">
          Indexes, manuals, quizzes, and promote/deny sheets for GFP Path D.
        </p>
        {docsIsExternal ? (
          <a
            href={docsHref}
            className="mt-4 inline-block font-[family-name:var(--font-gf-sans)] text-sm font-semibold text-[var(--gf-accent-deep)] no-underline transition hover:text-[var(--gf-accent)]"
          >
            Go to Path D training docs →
          </a>
        ) : (
          <Link
            href={docsHref}
            className="mt-4 inline-block font-[family-name:var(--font-gf-sans)] text-sm font-semibold text-[var(--gf-accent-deep)] no-underline transition hover:text-[var(--gf-accent)]"
          >
            Go to Path D training docs →
          </Link>
        )}
        <p className="mt-3 font-[family-name:var(--font-gf-sans)] text-xs text-[var(--gf-muted)]">
          {TRAINING_DOCS_PATH}
        </p>
      </div>

      <p className="max-w-2xl font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-muted)]">
        Also see{" "}
        <ResearchLink
          href="/editorial-standards"
          className="font-medium text-[var(--gf-accent)] no-underline hover:underline"
        >
          Editorial standards
        </ResearchLink>
        {" · "}
        <ResearchLink
          href="/about"
          className="font-medium text-[var(--gf-accent)] no-underline hover:underline"
        >
          About
        </ResearchLink>
        .
      </p>
    </section>
  );
}
