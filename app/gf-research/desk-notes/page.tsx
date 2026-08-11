import type { Metadata } from "next";

import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import {
  briefingSynopsisFromMarkdown,
} from "@/app/lib/governanceFrame/briefingArchiveDirectory";
import { fetchPublishedBriefings } from "@/app/lib/governanceFrame/briefingLoader";
import { isDeskNoteLedgerItem } from "@/app/lib/governanceFrame/publishedLedgerKind";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Desk notes",
};

function formatPublishedDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * Weekly GF desk notes — short, dated signals on one live development.
 * Quarantined drafts do not appear here.
 */
export default async function ResearchDeskNotesPage() {
  const ledger = await fetchPublishedBriefings();
  const notes = ledger
    .filter((item) => isDeskNoteLedgerItem(item.markdown, item.slug, item.title))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  return (
    <section aria-labelledby="desk-notes-heading" className="max-w-3xl">
      <h1
        id="desk-notes-heading"
        className="font-[family-name:var(--font-gf-serif)] text-3xl text-[var(--gf-ink)] sm:text-4xl"
      >
        Desk notes
      </h1>
      <p className="mt-4 max-w-2xl font-[family-name:var(--font-gf-sans)] text-[15px] leading-relaxed text-[var(--gf-ink-soft)]">
        Short, dated Governance Frame signals on one live development. Weekly or event-driven —
        not a substitute for monthly briefings or newsletters. Quarantined drafts do not appear
        here.
      </p>

      {notes.length === 0 ? (
        <p className="mt-8 font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-muted)]">
          No published desk notes yet.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-[var(--gf-line)] border-y border-[var(--gf-line)]">
          {notes.map((note) => (
            <li key={note.slug}>
              <ResearchLink
                href={`/briefings/${note.slug}`}
                className="block py-5 no-underline transition hover:bg-white/40"
              >
                <time
                  dateTime={note.publishedAt}
                  className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-muted)]"
                >
                  {formatPublishedDate(note.publishedAt)}
                </time>
                <h2 className="mt-1 font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink)]">
                  {note.title}
                </h2>
                <p className="mt-2 font-[family-name:var(--font-gf-sans)] text-sm leading-relaxed text-[var(--gf-ink-soft)]">
                  {briefingSynopsisFromMarkdown(note.markdown)}
                </p>
              </ResearchLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
