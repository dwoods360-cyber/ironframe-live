import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PublicApexNav from "@/app/components/marketing/PublicApexNav";
import {
  getSolutionPage,
  SolutionDetailContent,
  SOLUTION_PAGES,
} from "@/app/components/marketing/SolutionsContent";

type SolutionPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return SOLUTION_PAGES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: SolutionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const solution = getSolutionPage(slug);

  if (!solution) {
    return {};
  }

  return {
    title: `${solution.eyebrow} | Ironframe`,
    description: solution.summary,
  };
}

export default async function SolutionPage({ params }: SolutionPageProps) {
  const { slug } = await params;
  const solution = getSolutionPage(slug);

  if (!solution) {
    notFound();
  }

  return (
    <>
      <PublicApexNav />
      <SolutionDetailContent solution={solution} />
    </>
  );
}
