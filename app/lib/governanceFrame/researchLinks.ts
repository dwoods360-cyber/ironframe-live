import { headers } from "next/headers";

import {
  GOVERNANCE_FRAME_RESEARCH_INTERNAL_PREFIX,
  isGovernanceFramePublicHost,
} from "@/config/governanceFramePublic";

/** Resolve research-site hrefs for both public hosts and `/gf-research` preview. */
export async function researchBasePath(): Promise<string> {
  const host = (await headers()).get("host");
  return isGovernanceFramePublicHost(host) ? "" : GOVERNANCE_FRAME_RESEARCH_INTERNAL_PREFIX;
}

export async function researchHref(path: string): Promise<string> {
  const base = await researchBasePath();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
