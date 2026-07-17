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
      <article>
        <ResearchLink
          href="/research-papers"
          className="font-mono text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-300"
        >
          ← Research papers
        </ResearchLink>
        <header className="mt-6 mb-8 border-b border-slate-800 pb-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            {paper.researchId} · Forthcoming
          </p>
          <h1 className="mt-3 font-mono text-3xl font-bold tracking-tight text-slate-50">
            {paper.title}
          </h1>
          {paper.subtitle ? <p className="mt-3 text-slate-400">{paper.subtitle}</p> : null}
        </header>
        <p className="text-sm text-slate-400">
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
    <article>
      <ResearchLink
        href="/research-papers"
        className="font-mono text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-300"
      >
        ← Research papers
      </ResearchLink>
      <header className="mt-6 mb-8 border-b border-slate-800 pb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          {paper.researchId}
          {paper.version ? ` · ${paper.version}` : ""}
        </p>
        <h1 className="mt-3 font-mono text-3xl font-bold tracking-tight text-slate-50">
          {paper.title}
        </h1>
        {paper.subtitle ? <p className="mt-3 text-slate-400">{paper.subtitle}</p> : null}
        {paper.publisher ? (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            {paper.publisher}
          </p>
        ) : null}
      </header>
      <BriefingMarkdown markdown={manuscript.bodyMarkdown} />
    </article>
  );
}
