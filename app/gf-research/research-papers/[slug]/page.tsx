import { notFound } from "next/navigation";
import type { Metadata } from "next";

import BriefingMarkdown from "@/app/components/governanceFrame/BriefingMarkdown";
import { ResearchLink } from "@/app/components/governanceFrame/ResearchBasePath";
import {
  getResearchPaperManuscript,
  listPublicResearchPapers,
} from "@/app/lib/governanceFrame/researchCatalog";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return listPublicResearchPapers().map((paper) => ({ slug: paper.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const paper = listPublicResearchPapers().find((entry) => entry.slug === slug);
  if (!paper) return { title: "Research paper" };
  return {
    title: paper.title,
    description: paper.subtitle ?? undefined,
  };
}

export default async function ResearchPaperPage({ params }: PageProps) {
  const { slug } = await params;
  const manuscript = getResearchPaperManuscript(slug);
  if (!manuscript) notFound();

  const { listing: paper, bodyMarkdown } = manuscript;

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
      <BriefingMarkdown markdown={bodyMarkdown} tone="institute" />
    </article>
  );
}
