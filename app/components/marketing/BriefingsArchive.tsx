import Link from "next/link";

import type { PublishedBriefingCard } from "@/app/lib/governanceFrame/publishedBriefingLedgerCards";

function formatPublishedDate(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(ms));
}

type BriefingsArchiveProps = {
  cards: PublishedBriefingCard[];
  /** Homepage pulse teaser vs full archive page. */
  variant?: "archive" | "teaser";
};

/**
 * Industry-voice-neutral cards. No Path B / sales CTAs — link only to Governance Frame.
 */
export default function BriefingsArchive({ cards, variant = "archive" }: BriefingsArchiveProps) {
  if (cards.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--login-border)] bg-[var(--bg-primary)] p-6 text-sm text-[var(--login-muted)]">
        No published briefings in the public ledger yet. Institutional editions appear here after
        Ops Hub Approve promotes them to the published ledger.
      </p>
    );
  }

  return (
    <ul className="space-y-4" role="list">
      {cards.map((card) => (
        <li key={card.slug}>
          <article className="rounded-lg border border-[var(--login-border)] bg-[var(--bg-primary)] p-4 transition-colors hover:border-[var(--login-accent)]/40 sm:p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--login-muted)]">
              <span className="rounded bg-[var(--bg-secondary)] px-2 py-0.5 text-[var(--login-accent)]">
                {card.kind === "newsletter" ? "Ironcast" : "Briefing"}
              </span>
              <time dateTime={card.publishedAt}>{formatPublishedDate(card.publishedAt)}</time>
            </div>
            <h3 className="text-base font-semibold text-[var(--text-main)] sm:text-lg">
              <a
                href={card.canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--login-accent)]"
              >
                {card.title}
              </a>
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--login-muted)]">{card.oneLiner}</p>
            <a
              href={card.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center font-mono text-xs font-bold tracking-wide text-[var(--login-accent)] hover:underline"
            >
              Read on Governance Frame →
            </a>
          </article>
        </li>
      ))}
      {variant === "teaser" ? (
        <li className="pt-2">
          <Link
            href="/resources/briefings"
            className="inline-flex min-h-11 items-center font-mono text-xs font-bold tracking-wide text-[var(--login-accent)] hover:underline"
          >
            View full briefings archive →
          </Link>
        </li>
      ) : null}
    </ul>
  );
}
