import type { Metadata } from "next";

import PublicApexNav from "@/app/components/marketing/PublicApexNav";
import { SolutionsIndexContent } from "@/app/components/marketing/SolutionsContent";

export const metadata: Metadata = {
  title: "GRC solutions | Ironframe",
  description:
    "Sector deep-dives for regulated operators: fintech containment, healthcare perimeter, critical infrastructure, multi-entity rollups, and whole-cent risk engineering — with a 10–15 min workflow review as the next step.",
};

export default function SolutionsIndexPage() {
  return (
    <>
      <PublicApexNav />
      <SolutionsIndexContent />
    </>
  );
}
