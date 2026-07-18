import type { Metadata } from "next";

import PublicApexNav from "@/app/components/marketing/PublicApexNav";
import { SolutionsIndexContent } from "@/app/components/marketing/SolutionsContent";

export const metadata: Metadata = {
  title: "GRC solutions | Ironframe",
  description:
    "Baseline-aligned Ironframe deep-dives: fintech containment, healthcare perimeter, critical infrastructure, multi-entity rollups, and BigInt risk engineering — with illustrative demo ALE baselines labeled as non-customer fixtures.",
};

export default function SolutionsIndexPage() {
  return (
    <>
      <PublicApexNav />
      <SolutionsIndexContent />
    </>
  );
}
