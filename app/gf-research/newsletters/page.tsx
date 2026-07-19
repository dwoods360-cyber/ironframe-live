import type { Metadata } from "next";

import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import { fetchPublishedBriefings } from "@/app/lib/governanceFrame/briefingLoader";
import { parseFrontmatterField } from "@/app/lib/governanceFrame/briefingMarkdown";
import { listNewsletterPlaceholders } from "@/app/lib/governanceFrame/researchCatalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Newsletters",
};

function isNewsletter(markdown: string, slug: string): boolean {
  const category = parseFrontmatterField(markdown, "category")?.toLowerCase() ?? "";
  return category.includes("newsletter") || /newsletter|ironcast/i.test(slug);
}

export default async function ResearchNewslettersPage() {
  const [briefings, placeholders] = await Promise.all([
    fetchPublishedBriefings(),
    Promise.resolve(listNewsletterPlaceholders()),
  ]);
  const editions = briefings.filter((briefing) => isNewsletter(briefing.markdown, briefing.slug));

  return (
    <section aria-labelledby="newsletters-heading" className="max-w-3xl">
      <h1
        id="newsletters-heading"
        className="font-[family-name:var(--font-gf-serif)] text-3xl text-[var(--gf-ink)] sm:text-4xl"
      >
        Newsletters
      </h1>
      <p className="mt-4 max-w-2xl font-[family-name:var(--font-gf-sans)] text-[15px] leading-relaxed text-[var(--gf-ink-soft)]">
        Periodic industry editions from the published ledger. Quarantined drafts do not appear here.
      </p>

      {editions.length === 0 && placeholders.length === 0 ? (
        <p className="mt-8 font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-muted)]">
          No newsletter editions are published yet.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-[var(--gf-line)] border-y border-[var(--gf-line)]">
          {editions.map((edition) => (
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
          {placeholders.map((name) => (
            <li key={name} className="py-5 font-[family-name:var(--font-gf-sans)] text-sm text-[var(--gf-muted)]">
              {name}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
