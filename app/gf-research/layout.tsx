import type { Metadata } from "next";
import { headers } from "next/headers";

import ResearchSiteChrome from "@/app/components/governanceFrame/ResearchSiteChrome";
import { gfSans, gfSerif } from "@/app/gf-research/researchFonts";
import {
  GOVERNANCE_FRAME_RESEARCH_INTERNAL_PREFIX,
  isGovernanceFramePublicHost,
} from "@/config/governanceFramePublic";

export const metadata: Metadata = {
  title: {
    default: "Governance Frame Research",
    template: "%s · Governance Frame",
  },
  description:
    "Independent research on governance, risk, compliance, operational resilience, cybersecurity, and AI governance. Published by Governance Frame Research.",
  robots: {
    index: true,
    follow: true,
  },
};

export default async function GovernanceFrameResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const host = (await headers()).get("host");
  const basePath = isGovernanceFramePublicHost(host)
    ? ""
    : GOVERNANCE_FRAME_RESEARCH_INTERNAL_PREFIX;

  return (
    <div className={`${gfSans.variable} ${gfSerif.variable}`}>
      <ResearchSiteChrome basePath={basePath}>{children}</ResearchSiteChrome>
    </div>
  );
}
