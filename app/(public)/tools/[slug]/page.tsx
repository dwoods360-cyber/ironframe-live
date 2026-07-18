import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ControlToolPage from "@/app/components/marketing/ControlToolPage";
import { CONTROL_TOOLS, getControlTool } from "@/app/lib/marketing/controlTools";

type ControlToolRouteProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return CONTROL_TOOLS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ControlToolRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getControlTool(slug);

  if (!tool) {
    return {};
  }

  return {
    title: `${tool.title} | Ironframe`,
    description: tool.summary,
  };
}

export default async function ControlToolRoute({ params }: ControlToolRouteProps) {
  const { slug } = await params;
  const tool = getControlTool(slug);

  if (!tool) {
    notFound();
  }

  return <ControlToolPage tool={tool} />;
}
