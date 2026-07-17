import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";

import BriefingFrameContent from "@/app/components/governanceFrame/BriefingFrameContent";
import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import { briefingBodyMarkdown, fetchBriefingBySlug } from "@/app/lib/governanceFrame/briefingLoader";
import { PUBLISHED_BRIEFING_SLUG_REDIRECTS } from "@/app/lib/governanceFrame/publishedBriefingSlugRedirects";
import { researchHref } from "@/app/lib/governanceFrame/researchLinks";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const briefing = await fetchBriefingBySlug(slug);
  if (!briefing) return { title: "Briefing" };
  return { title: briefing.title };
}

export default async function ResearchBriefingPage({ params }: PageProps) {
  const { slug } = await params;
  const normalized = slug.trim().toLowerCase();
  const redirectTarget = PUBLISHED_BRIEFING_SLUG_REDIRECTS[normalized];
  if (redirectTarget) {
    permanentRedirect(await researchHref(`/briefings/${encodeURIComponent(redirectTarget)}`));
  }

  const briefing = await fetchBriefingBySlug(slug);
  if (!briefing) notFound();

  return (
    <article>
      <ResearchLink
        href="/briefings"
        className="font-mono text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-300"
      >
        ← All briefings
      </ResearchLink>

      <header className="mt-6 mb-10 border-b border-slate-800 pb-8">
        <time
          dateTime={briefing.publishedAt}
          className="font-mono text-[10px] uppercase tracking-widest text-slate-500"
        >
          {formatPublishedDate(briefing.publishedAt)}
        </time>
        <h1 className="mt-3 font-mono text-3xl font-bold tracking-tight text-slate-50">
          {briefing.title}
        </h1>
        {(briefing.author || briefing.classification) && (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            {[briefing.classification, briefing.author].filter(Boolean).join(" · ")}
          </p>
        )}
      </header>

      <div className="prose-governance-frame">
        <BriefingFrameContent
          markdown={briefingBodyMarkdown(briefing.markdown, briefing.title)}
        />
      </div>
    </article>
  );
}
