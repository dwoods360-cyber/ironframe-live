import type { Metadata } from "next";

import BriefingsArchive from "@/app/components/marketing/BriefingsArchive";
import PublicApexNav from "@/app/components/marketing/PublicApexNav";
import { listPublishedBriefingCards } from "@/app/lib/governanceFrame/publishedBriefingLedgerCards";
import { GOVERNANCE_FRAME_PUBLIC_ORIGIN } from "@/config/governanceFramePublic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Governance Briefings Archive | Ironframe",
  description:
    "Public archive of published institutional governance briefings and Ironcast editions — linked to the Governance Frame ledger.",
  robots: { index: true, follow: true },
};

/**
 * Marketing archive — read-only projection of the published ledger.
 * Full articles live on Governance Frame; this page never reads briefing-queue.
 */
export default function ResourcesBriefingsPage() {
  const cards = listPublishedBriefingCards();

  return (
    <main
      className="ironframe-public-landing min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)]"
      data-ironframe-surface="marketing-briefings-archive"
    >
      <PublicApexNav />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-10 space-y-3 border-b border-[var(--login-border)] pb-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--login-accent)]">
            Resources · Published ledger
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-main)] sm:text-4xl">
            Governance briefings archive
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--login-muted)] sm:text-base">
            Industry-facing editions promoted from the published ledger. Each card links to the
            canonical article on the Governance Frame — not a separate marketing copy of the body.
          </p>
          <p className="font-mono text-[10px] text-[var(--login-muted)]">
            Canonical reader:{" "}
            <a
              href={GOVERNANCE_FRAME_PUBLIC_ORIGIN}
              className="text-[var(--login-accent)] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {GOVERNANCE_FRAME_PUBLIC_ORIGIN}
            </a>
          </p>
        </header>
        <BriefingsArchive cards={cards} variant="archive" />
      </div>
    </main>
  );
}
