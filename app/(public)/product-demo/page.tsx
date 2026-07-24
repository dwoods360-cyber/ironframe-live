import type { Metadata } from "next";

import GuidedWorkflowDemoClient from "@/app/components/demo/GuidedWorkflowDemoClient";
import PublicApexNav from "@/app/components/marketing/PublicApexNav";

export const metadata: Metadata = {
  title: "Guided product walkthrough | Ironframe",
  description:
    "Control-first governance in action — a guided Ironframe walkthrough with representative benchmark data. Schedule a 10–15 min workflow review when you are ready.",
};

export default function ProductDemoPage() {
  return (
    <>
      <PublicApexNav />
      <GuidedWorkflowDemoClient />
    </>
  );
}
