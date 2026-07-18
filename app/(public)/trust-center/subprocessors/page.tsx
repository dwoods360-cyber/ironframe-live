import type { Metadata } from "next";

import PublicApexNav from "@/app/components/marketing/PublicApexNav";
import PublicTrustArtifact from "@/app/components/trust/PublicTrustArtifact";
import { SUBPROCESSOR_LIST_SECTIONS } from "@/app/lib/legal/procurement";

export const metadata: Metadata = {
  title: "Subprocessors | Ironframe Trust Center",
  description: "Corporate subprocessor list for Ironframe GRC.",
};

export default function TrustCenterSubprocessorsPage() {
  return (
    <>
      <PublicApexNav />
      <PublicTrustArtifact
        title="Corporate Subprocessor List"
        subtitle="Current subprocessors authorized for Command Tier delivery — purpose and data categories."
        sections={SUBPROCESSOR_LIST_SECTIONS}
        artifactLabel="subprocessor-list"
      />
    </>
  );
}
