import GovernanceFrameBrandLockup from "@/app/components/governanceFrame/GovernanceFrameBrandLockup";
import BriefingArchiveDirectory from "@/app/components/governanceFrame/BriefingArchiveDirectory";
import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import { listBriefingArchiveEntries, partitionHomeBriefings } from "@/app/lib/governanceFrame/briefingArchiveDirectory";
import { fetchPublishedBriefings } from "@/app/lib/governanceFrame/briefingLoader";
import {
  classifyPublishedLedgerItem,
  isDeskNoteLedgerItem,
} from "@/app/lib/governanceFrame/publishedLedgerKind";
import {
  listPublicResearchPapers,
  listResearchSeries,
} from "@/app/lib/governanceFrame/researchCatalog";

export const dynamic = "force-dynamic";

export default async function GovernanceFrameResearchHomePage() {
  const [papers, series, ledger] = await Promise.all([
    Promise.resolve(listPublicResearchPapers()),
    Promise.resolve(listResearchSeries()),
    fetchPublishedBriefings(),
  ]);

  const industryResearch = ledger.filter(
    (item) => classifyPublishedLedgerItem(item.markdown, item.slug, item.title) === "industry_research",
  );
  const newslettersOnly = ledger.filter(
    (item) => classifyPublishedLedgerItem(item.markdown, item.slug, item.title) === "newsletter",
  );
  const allBriefings = listBriefingArchiveEntries(ledger);
  const { featured: recentBriefings, archive: overflowBriefings } =
    partitionHomeBriefings(allBriefings);

  const recentPapers = [
    ...papers.map((paper) => ({
      key: paper.slug,
      href: `/research-papers/${paper.slug}`,
      eyebrow: paper.researchId,
      title: paper.title,
      meta: null as string | null,
    })),
    ...[...industryResearch].reverse().map((item) => ({
      key: item.slug,
      href: `/briefings/${item.slug}`,
      eyebrow: "Industry research brief",
      title: item.title,
      meta: item.slug,
    })),
  ].slice(0, 5);

  const recentNewsletters = newslettersOnly.slice(-5).reverse();
  const deskNotesOnly = ledger.filter((item) =>
    isDeskNoteLedgerItem(item.markdown, item.slug, item.title),
  );
  const recentDeskNotes = deskNotesOnly.slice(-5).reverse();

  const showArchive = overflowBriefings.length > 0;

  return (
    <div
      className={
        showArchive
          ? "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(15rem,17.5rem)] lg:items-start lg:gap-10 xl:gap-12"
          : undefined
      }
    >
      <div className="space-y-16">
        {/* First viewport: one composition — brand, one line, one sentence, CTAs */}
        <section
          aria-labelledby="gf-home-heading"
          className="gf-rise relative overflow-hidden px-1 py-4 sm:py-6"
        >
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-40"
            style={{
              background: "radial-gradient(circle, var(--gf-accent-glow), transparent 68%)",
            }}
            aria-hidden
          />
          <GovernanceFrameBrandLockup variant="research" size="hero" className="gf-rise relative" />
          <h2 id="gf-home-heading" className="sr-only">
            Governance Frame Research
          </h2>
          <p className="gf-rise-delay relative mt-6 max-w-2xl font-[family-name:var(--font-gf-serif)] text-xl leading-snug text-[var(--gf-ink-soft)] sm:text-2xl">
            Independent research on governance, risk, and compliance.
          </p>
          <p className="gf-rise-delay-2 relative mt-3 max-w-xl font-[family-name:var(--font-gf-sans)] text-base leading-relaxed text-[var(--gf-muted)]">
            Vendor-neutral analysis for executives and practitioners — evidence-led, corrected when
            wrong, never a product brochure.
          </p>
          <div className="gf-rise-delay-2 relative mt-7 flex flex-wrap gap-3">
            <ResearchLink
              href="/research-papers"
              className="inline-flex items-center rounded-md bg-[var(--gf-accent-deep)] px-4 py-2.5 font-[family-name:var(--font-gf-sans)] text-sm font-semibold text-white no-underline transition hover:bg-[var(--gf-accent)]"
            >
              Research papers
            </ResearchLink>
            <ResearchLink
              href="/desk-notes"
              className="inline-flex items-center rounded-md border-2 border-[var(--gf-accent)] bg-[var(--gf-paper-elevated)] px-4 py-2.5 font-[family-name:var(--font-gf-sans)] text-sm font-semibold text-[var(--gf-accent-deep)] no-underline transition hover:bg-[color-mix(in_srgb,var(--gf-accent)_12%,white)]"
            >
              Desk notes
            </ResearchLink>
            <ResearchLink
              href="/briefings"
              className="inline-flex items-center rounded-md border-2 border-[var(--gf-accent)] bg-[var(--gf-paper-elevated)] px-4 py-2.5 font-[family-name:var(--font-gf-sans)] text-sm font-semibold text-[var(--gf-accent-deep)] no-underline transition hover:bg-[color-mix(in_srgb,var(--gf-accent)_12%,white)]"
            >
              Briefings
            </ResearchLink>
            <ResearchLink
              href="/newsletters"
              className="inline-flex items-center rounded-md border-2 border-[var(--gf-accent)] bg-[var(--gf-paper-elevated)] px-4 py-2.5 font-[family-name:var(--font-gf-sans)] text-sm font-semibold text-[var(--gf-accent-deep)] no-underline transition hover:bg-[color-mix(in_srgb,var(--gf-accent)_12%,white)]"
            >
              Newsletters
            </ResearchLink>
            <ResearchLink
              href="/methodology"
              className="inline-flex items-center px-2 py-2.5 font-[family-name:var(--font-gf-sans)] text-sm font-semibold text-[var(--gf-brass)] no-underline hover:underline"
            >
              Methodology →
            </ResearchLink>
          </div>
        </section>

        <section aria-labelledby="gf-papers-heading" className="space-y-5">
          <div className="flex items-baseline justify-between gap-4">
            <h3
              id="gf-papers-heading"
              className="font-[family-name:var(--font-gf-serif)] text-2xl text-[var(--gf-ink)]"
            >
              Research papers
            </h3>
            <ResearchLink
              href="/research-papers"
              className="font-[family-name:var(--font-gf-sans)] text-sm font-medium text-[var(--gf-accent)] no-underline hover:underline"
            >
              View all
            </ResearchLink>
          </div>
          {recentPapers.length === 0 ? (
            <p className="font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-muted)]">
              No published research papers yet. Editorial manuscripts stay private until Approve.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--gf-line)] border-y border-[var(--gf-line)]">
              {recentPapers.map((paper) => (
                <li key={paper.key}>
                  <ResearchLink
                    href={paper.href}
                    className="block py-5 no-underline transition hover:bg-white/40"
                  >
                    <p className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-accent)]">
                      {paper.eyebrow}
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink)]">
                      {paper.title}
                    </p>
                    {paper.meta ? (
                      <p className="mt-1 font-[family-name:var(--font-gf-sans)] text-xs text-[var(--gf-muted)]">
                        {paper.meta}
                      </p>
                    ) : null}
                  </ResearchLink>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="gf-desk-notes-heading" className="space-y-5">
          <div className="flex items-baseline justify-between gap-4">
            <h3
              id="gf-desk-notes-heading"
              className="font-[family-name:var(--font-gf-serif)] text-2xl text-[var(--gf-ink)]"
            >
              Desk notes
            </h3>
            <ResearchLink
              href="/desk-notes"
              className="font-[family-name:var(--font-gf-sans)] text-sm font-medium text-[var(--gf-accent)] no-underline hover:underline"
            >
              View all
            </ResearchLink>
          </div>
          {recentDeskNotes.length === 0 ? (
            <p className="font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-muted)]">
              No published desk notes yet. Weekly signals appear here after Approve.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--gf-line)] border-y border-[var(--gf-line)]">
              {recentDeskNotes.map((note) => (
                <li key={note.slug}>
                  <ResearchLink
                    href={`/briefings/${note.slug}`}
                    className="block py-5 no-underline transition hover:bg-white/40"
                  >
                    <time
                      dateTime={note.publishedAt}
                      className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-muted)]"
                    >
                      {new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium",
                        timeZone: "UTC",
                      }).format(new Date(note.publishedAt))}
                    </time>
                    <p className="mt-1 font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink)]">
                      {note.title}
                    </p>
                  </ResearchLink>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="gf-briefings-heading" className="space-y-5">
          <div className="flex items-baseline justify-between gap-4">
            <h3
              id="gf-briefings-heading"
              className="font-[family-name:var(--font-gf-serif)] text-2xl text-[var(--gf-ink)]"
            >
              Briefings
            </h3>
            <ResearchLink
              href="/briefings"
              className="font-[family-name:var(--font-gf-sans)] text-sm font-medium text-[var(--gf-accent)] no-underline hover:underline"
            >
              View all
            </ResearchLink>
          </div>
          {recentBriefings.length === 0 ? (
            <p className="font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-muted)]">
              No published briefings yet.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--gf-line)] border-y border-[var(--gf-line)]">
              {recentBriefings.map((briefing) => (
                <li key={briefing.slug}>
                  <ResearchLink
                    href={`/briefings/${briefing.slug}`}
                    className="block py-5 no-underline transition hover:bg-white/40"
                  >
                    <time
                      dateTime={briefing.publishedAt}
                      className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-muted)]"
                    >
                      {new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium",
                        timeZone: "UTC",
                      }).format(new Date(briefing.publishedAt))}
                    </time>
                    <p className="mt-1 font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink)]">
                      {briefing.title}
                    </p>
                    <p className="mt-2 font-[family-name:var(--font-gf-sans)] text-sm leading-relaxed text-[var(--gf-ink-soft)]">
                      {briefing.synopsis}
                    </p>
                  </ResearchLink>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="gf-newsletters-heading" className="space-y-5">
          <div className="flex items-baseline justify-between gap-4">
            <h3
              id="gf-newsletters-heading"
              className="font-[family-name:var(--font-gf-serif)] text-2xl text-[var(--gf-ink)]"
            >
              Newsletters
            </h3>
            <ResearchLink
              href="/newsletters"
              className="font-[family-name:var(--font-gf-sans)] text-sm font-medium text-[var(--gf-accent)] no-underline hover:underline"
            >
              View all
            </ResearchLink>
          </div>
          {recentNewsletters.length === 0 ? (
            <p className="font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-muted)]">
              No published newsletter editions yet.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--gf-line)] border-y border-[var(--gf-line)]">
              {recentNewsletters.map((edition) => (
                <li key={edition.slug}>
                  <ResearchLink
                    href={`/briefings/${edition.slug}`}
                    className="block py-5 no-underline transition hover:bg-white/40"
                  >
                    <p className="font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink)]">
                      {edition.title}
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-gf-sans)] text-xs text-[var(--gf-muted)]">
                      {edition.slug}
                    </p>
                  </ResearchLink>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="gf-series-heading" className="space-y-5">
          <div className="flex items-baseline justify-between gap-4">
            <h3
              id="gf-series-heading"
              className="font-[family-name:var(--font-gf-serif)] text-2xl text-[var(--gf-ink)]"
            >
              Series
            </h3>
            <ResearchLink
              href="/series"
              className="font-[family-name:var(--font-gf-sans)] text-sm font-medium text-[var(--gf-accent)] no-underline hover:underline"
            >
              View all
            </ResearchLink>
          </div>
          <ul className="divide-y divide-[var(--gf-line)] border-y border-[var(--gf-line)]">
            {series.map((item) => (
              <li key={item.seriesId}>
                <ResearchLink
                  href={`/series/${item.seriesId}`}
                  className="block py-5 no-underline transition hover:bg-white/40"
                >
                  <p className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-muted)]">
                    {item.seriesId}
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink)]">
                    {item.title}
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-gf-sans)] text-xs text-[var(--gf-muted)]">
                    {item.installments.length} installment
                    {item.installments.length === 1 ? "" : "s"}
                  </p>
                </ResearchLink>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {showArchive ? (
        <div className="mt-14 border-t border-[var(--gf-line)] pt-8 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-4">
          <BriefingArchiveDirectory entries={overflowBriefings} />
        </div>
      ) : null}
    </div>
  );
}
