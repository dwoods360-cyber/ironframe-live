import type { Metadata } from "next";

import PublicApexNav from "@/app/components/marketing/PublicApexNav";
import PublicTrustArtifact from "@/app/components/trust/PublicTrustArtifact";
import { DPA_FRAMEWORK_SECTIONS } from "@/app/lib/legal/procurement";

export const metadata: Metadata = {
  title: "DPA Framework | Ironframe Trust Center",
  description: "Data Processing Addendum framework for Ironframe design-partner diligence.",
};

export default function TrustCenterDpaPage() {
  return (
    <>
      <PublicApexNav />
      <PublicTrustArtifact
        title="Data Processing Addendum (DPA) Framework"
        subtitle="Processor obligations, technical measures, and cooperation terms for Ironframe GRC Command Tier workspaces."
        sections={DPA_FRAMEWORK_SECTIONS}
        artifactLabel="dpa-framework"
      />
    </>
  );
}
