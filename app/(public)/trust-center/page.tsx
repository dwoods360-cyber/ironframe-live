import type { Metadata } from "next";

import PublicApexNav from "@/app/components/marketing/PublicApexNav";
import PublicTrustCenter from "@/app/components/trust/PublicTrustCenter";

export const metadata: Metadata = {
  title: "Trust Center | Ironframe",
  description:
    "Ironframe security posture, subprocessors, data residency, and accurate certification status for design-partner diligence.",
};

export default function TrustCenterPublicPage() {
  return (
    <>
      <PublicApexNav />
      <PublicTrustCenter />
    </>
  );
}
