import GovernanceFrameBrandLockup from "@/app/components/governanceFrame/GovernanceFrameBrandLockup";
import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import { fetchPublishedBriefings } from "@/app/lib/governanceFrame/briefingLoader";
import { listResearchPapers, listResearchSeries } from "@/app/lib/governanceFrame/researchCatalog";

export const dynamic = "force-dynamic";

export default async function GovernanceFrameResearchHomePage() {
  const [papers, series, briefings] = await Promise.all([
    Promise.resolve(listResearchPapers()),
    Promise.resolve(listResearchSeries()),
    fetchPublishedBriefings(),
  ]);

  const publicPapers = papers.filter((paper) => paper.isPublic);
  const forthcomingPapers = papers.filter((paper) => !paper.isPublic);
  const recentBriefings = briefings.slice(-5).reverse();

  return (
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
            href="/briefings"
            className="inline-flex items-center rounded-md border-2 border-[var(--gf-accent)] bg-[var(--gf-paper-elevated)] px-4 py-2.5 font-[family-name:var(--font-gf-sans)] text-sm font-semibold text-[var(--gf-accent-deep)] no-underline transition hover:bg-[color-mix(in_srgb,var(--gf-accent)_12%,white)]"
          >
            Briefings
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
        {publicPapers.length === 0 && forthcomingPapers.length === 0 ? (
          <p className="font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-muted)]">
            No research papers registered yet.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--gf-line)] border-y border-[var(--gf-line)]">
            {publicPapers.map((paper) => (
              <li key={paper.slug}>
                <ResearchLink
                  href={`/research-papers/${paper.slug}`}
                  className="block py-5 no-underline transition hover:bg-white/40"
                >
                  <p className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-accent)]">
                    {paper.researchId}
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink)]">
                    {paper.title}
                  </p>
                </ResearchLink>
              </li>
            ))}
            {forthcomingPapers.map((paper) => (
              <li key={paper.slug} className="py-5">
                <p className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-muted)]">
                  {paper.researchId} · Not yet approved
                </p>
                <p className="mt-1 font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink)]">
                  {paper.title}
                </p>
                <p className="mt-1 font-[family-name:var(--font-gf-sans)] text-xs text-[var(--gf-muted)]">
                  Status: {paper.status}
                  {paper.version ? ` · ${paper.version}` : ""} — full text withheld until Approve
                </p>
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
                  <p className="font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink)]">
                    {briefing.title}
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-gf-sans)] text-xs text-[var(--gf-muted)]">
                    {briefing.slug}
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
  );
}
