import type { Metadata } from "next";

import GuidedWorkflowDemoClient from "@/app/components/demo/GuidedWorkflowDemoClient";
import PublicApexNav from "@/app/components/marketing/PublicApexNav";

export const metadata: Metadata = {
  title: "Product demonstration | Ironframe",
  description:
    "Guided tour of Ironframe’s control-first GRC workflow using sample demonstration data — not live customer records. Next step: a 10–15 min workflow review.",
};

export default function ProductDemoPage() {
  return (
    <>
      <PublicApexNav />
      <GuidedWorkflowDemoClient />
    </>
  );
}
