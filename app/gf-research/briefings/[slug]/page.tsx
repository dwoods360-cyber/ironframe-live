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
    <article className="max-w-3xl">
      <ResearchLink
        href="/briefings"
        className="font-[family-name:var(--font-gf-sans)] text-sm font-medium text-[var(--gf-accent)] no-underline hover:underline"
      >
        ← All briefings
      </ResearchLink>

      <header className="mt-6 mb-10 border-b border-[var(--gf-line)] pb-8">
        <time
          dateTime={briefing.publishedAt}
          className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-muted)]"
        >
          {formatPublishedDate(briefing.publishedAt)}
        </time>
        <h1 className="mt-3 font-[family-name:var(--font-gf-serif)] text-3xl font-semibold tracking-tight text-[var(--gf-ink)] sm:text-4xl">
          {briefing.title}
        </h1>
        {(briefing.author || briefing.classification) && (
          <p className="mt-3 font-[family-name:var(--font-gf-sans)] text-xs uppercase tracking-[0.12em] text-[var(--gf-muted)]">
            {[briefing.classification, briefing.author].filter(Boolean).join(" · ")}
          </p>
        )}
      </header>

      {/* Specialized briefing triad layout remains dark for scanability on the light institute shell. */}
      <div className="prose-governance-frame overflow-hidden rounded-xl border border-[var(--gf-line)] bg-slate-950 px-5 py-8 sm:px-8">
        <BriefingFrameContent
          markdown={briefingBodyMarkdown(briefing.markdown, briefing.title)}
        />
      </div>
    </article>
  );
}
