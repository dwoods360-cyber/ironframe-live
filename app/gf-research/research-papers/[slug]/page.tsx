import { notFound } from "next/navigation";
import type { Metadata } from "next";

import BriefingMarkdown from "@/app/components/governanceFrame/BriefingMarkdown";
import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import {
  getResearchPaperManuscript,
  listResearchPapers,
} from "@/app/lib/governanceFrame/researchCatalog";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return listResearchPapers().map((paper) => ({ slug: paper.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const paper = listResearchPapers().find((entry) => entry.slug === slug);
  if (!paper) return { title: "Research paper" };
  return {
    title: paper.title,
    description: paper.subtitle ?? undefined,
  };
}

export default async function ResearchPaperPage({ params }: PageProps) {
  const { slug } = await params;
  const paper = listResearchPapers().find((entry) => entry.slug === slug);
  if (!paper) notFound();

  if (!paper.isPublic) {
    return (
      <article className="max-w-3xl">
        <ResearchLink
          href="/research-papers"
          className="font-[family-name:var(--font-gf-sans)] text-sm font-medium text-[var(--gf-accent)] no-underline hover:underline"
        >
          ← Research papers
        </ResearchLink>
        <header className="mt-6 mb-8 border-b border-[var(--gf-line)] pb-8">
          <p className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-muted)]">
            {paper.researchId} · Forthcoming
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-gf-serif)] text-3xl font-semibold tracking-tight text-[var(--gf-ink)] sm:text-4xl">
            {paper.title}
          </h1>
          {paper.subtitle ? (
            <p className="mt-3 font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink-soft)]">
              {paper.subtitle}
            </p>
          ) : null}
        </header>
        <p className="font-[family-name:var(--font-gf-sans)] text-[15px] leading-relaxed text-[var(--gf-muted)]">
          This manuscript is still in editorial review ({paper.status}
          {paper.version ? `, ${paper.version}` : ""}). The public reader publishes full text only
          after Governance Frame approval and publication.
        </p>
      </article>
    );
  }

  const manuscript = getResearchPaperManuscript(slug);
  if (!manuscript) notFound();

  return (
    <article className="max-w-3xl">
      <ResearchLink
        href="/research-papers"
        className="font-[family-name:var(--font-gf-sans)] text-sm font-medium text-[var(--gf-accent)] no-underline hover:underline"
      >
        ← Research papers
      </ResearchLink>
      <header className="mt-6 mb-10 border-b border-[var(--gf-line)] pb-8">
        <p className="font-[family-name:var(--font-gf-sans)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gf-accent)]">
          {paper.researchId}
          {paper.version ? ` · ${paper.version}` : ""}
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-gf-serif)] text-3xl font-semibold tracking-tight text-[var(--gf-ink)] sm:text-4xl">
          {paper.title}
        </h1>
        {paper.subtitle ? (
          <p className="mt-3 font-[family-name:var(--font-gf-serif)] text-lg text-[var(--gf-ink-soft)]">
            {paper.subtitle}
          </p>
        ) : null}
        {paper.publisher ? (
          <p className="mt-4 font-[family-name:var(--font-gf-sans)] text-xs uppercase tracking-[0.12em] text-[var(--gf-muted)]">
            {paper.publisher}
          </p>
        ) : null}
      </header>
      <BriefingMarkdown markdown={manuscript.bodyMarkdown} tone="institute" />
    </article>
  );
}
