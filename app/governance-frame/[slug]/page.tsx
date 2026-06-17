import Link from "next/link";
import { notFound } from "next/navigation";

import BriefingFrameContent from "@/app/components/governanceFrame/BriefingFrameContent";
import EarlyEnclaveCta from "@/app/components/governanceFrame/EarlyEnclaveCta";
import { briefingBodyMarkdown, fetchBriefingBySlug, fetchPublishedBriefings } from "@/app/lib/governanceFrame/briefingLoader";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const briefings = await fetchPublishedBriefings();
  return briefings.map((b) => ({ slug: b.slug }));
}

function formatPublishedDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function GovernanceFrameBriefingPage({ params }: PageProps) {
  const { slug } = await params;
  const briefing = await fetchBriefingBySlug(slug);
  if (!briefing) notFound();

  return (
    <article>
      <Link
        href="/governance-frame"
        className="font-mono text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-300"
      >
        ← All briefings
      </Link>

      <header className="mt-6 mb-10 border-b border-slate-800 pb-8">
        <time
          dateTime={briefing.publishedAt}
          className="font-mono text-[10px] uppercase tracking-widest text-slate-500"
        >
          {formatPublishedDate(briefing.publishedAt)}
        </time>
        <h1 className="mt-3 font-mono text-3xl font-bold tracking-tight text-slate-50">{briefing.title}</h1>
        {(briefing.author || briefing.classification) && (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            {[briefing.classification, briefing.author].filter(Boolean).join(" · ")}
          </p>
        )}
      </header>

      <div className="prose-governance-frame">
        <BriefingFrameContent markdown={briefingBodyMarkdown(briefing.markdown, briefing.title)} />
      </div>

      <EarlyEnclaveCta />
    </article>
  );
}
