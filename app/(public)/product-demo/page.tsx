import type { Metadata } from "next";

import GuidedWorkflowDemoClient from "@/app/components/demo/GuidedWorkflowDemoClient";
import PublicApexNav from "@/app/components/marketing/PublicApexNav";

export const metadata: Metadata = {
  title: "Product demonstration | Ironframe",
  description:
    "Guided demonstration of Ironframe’s control-first GRC workflow using labeled sandbox data — not live customer records.",
};

export default function ProductDemoPage() {
  return (
    <>
      <PublicApexNav />
      <GuidedWorkflowDemoClient />
    </>
  );
}
