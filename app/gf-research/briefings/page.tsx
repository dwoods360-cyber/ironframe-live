import type { Metadata } from "next";

import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import { fetchPublishedBriefings } from "@/app/lib/governanceFrame/briefingLoader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Briefings",
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

export default async function ResearchBriefingsIndexPage() {
  const briefings = await fetchPublishedBriefings();

  return (
    <section aria-labelledby="briefings-index-heading" className="max-w-3xl">
      <h1
        id="briefings-index-heading"
        className="font-[family-name:var(--font-gf-serif)] text-3xl text-[var(--gf-ink)] sm:text-4xl"
      >
        Industry briefings
      </h1>
      <p className="mt-4 max-w-2xl font-[family-name:var(--font-gf-sans)] text-[15px] leading-relaxed text-[var(--gf-ink-soft)]">
        Approved briefings from the published ledger. Quarantined drafts do not appear here.
      </p>

      {briefings.length === 0 ? (
        <p className="mt-8 font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-muted)]">
          No published briefings yet.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-[var(--gf-line)] border-y border-[var(--gf-line)]">
          {[...briefings].reverse().map((briefing) => (
            <li key={briefing.slug}>
              <ResearchLink
                href={`/briefings/${briefing.slug}`}
                className="block py-5 no-underline transition hover:bg-white/40"
              >
                <time
                  dateTime={briefing.publishedAt}
                  className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-muted)]"
                >
                  {formatPublishedDate(briefing.publishedAt)}
                </time>
                <h2 className="mt-1 font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink)]">
                  {briefing.title}
                </h2>
                {briefing.classification ? (
                  <p className="mt-1 font-[family-name:var(--font-gf-sans)] text-xs text-[var(--gf-muted)]">
                    {briefing.classification}
                  </p>
                ) : null}
              </ResearchLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
