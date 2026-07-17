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
    <section aria-labelledby="briefings-index-heading">
      <h2
        id="briefings-index-heading"
        className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500"
      >
        Industry briefings · published ledger
      </h2>
      <p className="mt-4 max-w-2xl text-sm text-slate-400">
        Approved industry briefings promoted from the Governance Frame publication workflow. Draft
        queue files remain quarantined from this reader.
      </p>

      {briefings.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">No published briefings yet.</p>
      ) : (
        <ul className="mt-8 grid gap-4">
          {[...briefings].reverse().map((briefing) => (
            <li key={briefing.slug}>
              <ResearchLink
                href={`/briefings/${briefing.slug}`}
                className="group block rounded-xl border border-slate-800 bg-slate-900/40 p-6 transition hover:border-slate-600 hover:bg-slate-900"
              >
                <time
                  dateTime={briefing.publishedAt}
                  className="font-mono text-[10px] uppercase tracking-widest text-slate-500"
                >
                  {formatPublishedDate(briefing.publishedAt)}
                </time>
                <h3 className="mt-2 font-mono text-base font-bold tracking-tight text-slate-50 group-hover:text-white">
                  {briefing.title}
                </h3>
                {briefing.classification ? (
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
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
