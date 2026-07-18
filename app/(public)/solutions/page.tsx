import type { Metadata } from "next";

import PublicApexNav from "@/app/components/marketing/PublicApexNav";
import { SolutionsIndexContent } from "@/app/components/marketing/SolutionsContent";

export const metadata: Metadata = {
  title: "GRC solutions | Ironframe",
  description:
    "Focused Ironframe GRC workflows for quantitative cyber risk, audit evidence, multi-entity governance, governed AI, and operational resilience.",
};

export default function SolutionsIndexPage() {
  return (
    <>
      <PublicApexNav />
      <SolutionsIndexContent />
    </>
  );
}
