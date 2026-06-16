import Link from "next/link";

import EarlyEnclaveCta from "@/app/components/governanceFrame/EarlyEnclaveCta";
import {
  briefingBodyMarkdown,
  loadPublishedBriefings,
} from "@/app/lib/governanceFrame/briefingLoader";
import {
  parseBriefingSections,
  parseImpactMetrics,
} from "@/app/lib/governanceFrame/parseBriefingSections";

export const dynamic = "force-dynamic";

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

function primaryCentMetric(markdown: string, title: string): string | null {
  const body = briefingBodyMarkdown(markdown, title);
  const impact = parseBriefingSections(body).find((section) => section.id === "impact");
  if (!impact) return null;
  const rows = parseImpactMetrics(impact.body);
  const centRow = rows.find((row) => /\(¢\)/i.test(row.label));
  return centRow?.cents ?? rows[0]?.cents ?? null;
}

export default function GovernanceFrameIndexPage() {
  const briefings = loadPublishedBriefings();

  return (
    <>
      <section aria-labelledby="briefing-index-heading">
        <h2
          id="briefing-index-heading"
          className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500"
        >
          Published briefings · chronological
        </h2>

        {briefings.length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">
            No published briefings yet. Promote reviewed markdown to{" "}
            <code className="text-slate-200">docs/published-briefings/</code>.
          </p>
        ) : (
          <ul className="mt-8 grid gap-4">
            {briefings.map((briefing) => {
              const centRegister = primaryCentMetric(briefing.markdown, briefing.title);
              return (
              <li key={briefing.slug}>
                <Link
                  href={`/governance-frame/${briefing.slug}`}
                  className="group block rounded-xl border border-slate-800 bg-slate-900/40 p-6 transition hover:border-slate-600 hover:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <time
                      dateTime={briefing.publishedAt}
                      className="font-mono text-[10px] uppercase tracking-widest text-slate-500"
                    >
                      {formatPublishedDate(briefing.publishedAt)}
                    </time>
                    {centRegister ? (
                      <span className="font-mono text-[10px] font-bold tabular-nums text-slate-300">
                        ¢ {centRegister}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 font-mono text-base font-bold tracking-tight text-slate-50 group-hover:text-white">
                    {briefing.title}
                  </h3>
                  {briefing.classification ? (
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      {briefing.classification}
                      {briefing.author ? ` · ${briefing.author}` : ""}
                    </p>
                  ) : null}
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-slate-600">
                    Read briefing →
                  </p>
                </Link>
              </li>
            );
            })}
          </ul>
        )}
      </section>

      <EarlyEnclaveCta />
    </>
  );
}
