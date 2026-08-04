import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import type { BriefingArchiveEntry } from "@/app/lib/governanceFrame/briefingArchiveDirectory";

function formatArchiveDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type BriefingArchiveDirectoryProps = {
  entries: BriefingArchiveEntry[];
  /** When set, highlights the open briefing in the directory. */
  activeSlug?: string;
};

/**
 * Vertical briefing archive — title, date, synopsis — for the right column.
 */
export default function BriefingArchiveDirectory({
  entries,
  activeSlug,
}: BriefingArchiveDirectoryProps) {
  return (
    <aside
      aria-labelledby="briefing-archive-heading"
      className="lg:sticky lg:top-6 lg:self-start"
    >
      <h2
        id="briefing-archive-heading"
        className="font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink)]"
      >
        Archive
      </h2>
      <p className="mt-1 font-[family-name:var(--font-gf-sans)] text-xs leading-relaxed text-[var(--gf-muted)]">
        All published briefings — title, date, and synopsis.
      </p>

      {entries.length === 0 ? (
        <p className="mt-4 font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-muted)]">
          No briefings in the archive yet.
        </p>
      ) : (
        <nav aria-label="Briefing archive" className="mt-4">
          <ol className="relative space-y-0 border-l border-[var(--gf-line)]">
            {entries.map((entry) => {
              const isActive = activeSlug === entry.slug;
              return (
                <li key={entry.slug} className="relative pl-4">
                  <span
                    className={[
                      "absolute -left-[4px] top-2 h-2 w-2 rounded-full",
                      isActive
                        ? "bg-[var(--gf-accent-deep)]"
                        : "bg-[var(--gf-line)]",
                    ].join(" ")}
                    aria-hidden
                  />
                  <ResearchLink
                    href={`/briefings/${entry.slug}`}
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "block border-b border-[var(--gf-line)]/70 py-3 no-underline transition last:border-b-0",
                      isActive
                        ? "bg-[color-mix(in_srgb,var(--gf-accent)_8%,transparent)]"
                        : "hover:bg-white/35",
                    ].join(" ")}
                  >
                    <time
                      dateTime={entry.publishedAt}
                      className="font-[family-name:var(--font-gf-sans)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--gf-muted)]"
                    >
                      {formatArchiveDate(entry.publishedAt)}
                    </time>
                    <p
                      className={[
                        "mt-1 font-[family-name:var(--font-gf-serif)] text-[15px] leading-snug",
                        isActive ? "text-[var(--gf-accent-deep)]" : "text-[var(--gf-ink)]",
                      ].join(" ")}
                    >
                      {entry.title}
                    </p>
                    <p className="mt-1.5 font-[family-name:var(--font-gf-sans)] text-[12px] leading-relaxed text-[var(--gf-ink-soft)]">
                      {entry.synopsis}
                    </p>
                  </ResearchLink>
                </li>
              );
            })}
          </ol>
        </nav>
      )}
    </aside>
  );
}
