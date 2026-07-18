import type { Metadata } from "next";

import PublicApexNav from "@/app/components/marketing/PublicApexNav";
import PublicTrustArtifact from "@/app/components/trust/PublicTrustArtifact";
import { DATA_RESIDENCY_SECTIONS } from "@/app/lib/legal/procurement";

export const metadata: Metadata = {
  title: "Data Residency | Ironframe Trust Center",
  description: "Single-region data residency and tenant isolation posture for Ironframe.",
};

export default function TrustCenterDataResidencyPage() {
  return (
    <>
      <PublicApexNav />
      <PublicTrustArtifact
        title="Single-Region Data Residency & Infrastructure Sovereignty"
        subtitle="Single-region Supabase anchor, tenant enclave isolation, and current release boundaries."
        sections={DATA_RESIDENCY_SECTIONS}
        artifactLabel="data-residency"
      />
    </>
  );
}
