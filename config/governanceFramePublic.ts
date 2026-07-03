/** Public Governance Frame / GRC Pulse reader origin (external briefing subdomain). */
export const GOVERNANCE_FRAME_PUBLIC_ORIGIN =
  process.env.GOVERNANCE_FRAME_PUBLIC_FEED_ORIGIN?.trim().replace(/\/$/, "") ||
  "https://brief.ironframegrc.com";
