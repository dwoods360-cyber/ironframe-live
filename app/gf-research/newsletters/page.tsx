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
    <section aria-labelledby="newsletters-heading">
      <h2
        id="newsletters-heading"
        className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500"
      >
        Newsletters
      </h2>
      <p className="mt-4 max-w-2xl text-sm text-slate-400">
        Periodic industry editions from the published ledger. Canonical newsletter packages under{" "}
        <code className="text-slate-300">docs/governance-frame/newsletters/</code> appear here when
        present.
      </p>

      {editions.length === 0 && placeholders.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">
          No newsletter editions are published yet. Quarantined drafts remain off this surface.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {editions.map((edition) => (
            <li key={edition.slug}>
              <ResearchLink
                href={`/briefings/${edition.slug}`}
                className="block rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4 hover:border-slate-600"
              >
                <p className="font-mono text-sm font-bold text-slate-50">{edition.title}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  {edition.slug}
                </p>
              </ResearchLink>
            </li>
          ))}
          {placeholders.map((name) => (
            <li
              key={name}
              className="rounded-xl border border-slate-800/80 px-5 py-4 font-mono text-sm text-slate-400"
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
