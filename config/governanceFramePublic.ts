/** Public Governance Frame research publication origin. */

export const GOVERNANCE_FRAME_LEGACY_BRIEF_ORIGIN = "https://brief.ironframegrc.com";

export const GOVERNANCE_FRAME_PUBLIC_ORIGIN =
  process.env.GOVERNANCE_FRAME_PUBLIC_FEED_ORIGIN?.trim().replace(/\/$/, "") ||
  "https://research.ironframegrc.com";

const DEFAULT_PUBLIC_HOSTS = new Set([
  "research.ironframegrc.com",
  "brief.ironframegrc.com",
  "research.localhost",
  "brief.localhost",
]);

function hostnameFromHostHeader(host: string | null | undefined): string {
  return (host ?? "").split(":")[0]?.trim().toLowerCase() ?? "";
}

/** Hosts that serve the Governance Frame research publication (not tenant workspaces). */
export function isGovernanceFramePublicHost(host: string | null | undefined): boolean {
  const hostname = hostnameFromHostHeader(host);
  if (!hostname) return false;
  if (DEFAULT_PUBLIC_HOSTS.has(hostname)) return true;

  const extra = process.env.GOVERNANCE_FRAME_PUBLIC_HOSTS?.trim();
  if (!extra) return false;
  return extra
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .includes(hostname);
}

/** Canonical public article path on the research publication. */
export function governanceFrameBriefingPath(slug: string): string {
  return `/briefings/${encodeURIComponent(slug)}`;
}

export function governanceFrameBriefingUrl(slug: string): string {
  return `${GOVERNANCE_FRAME_PUBLIC_ORIGIN}${governanceFrameBriefingPath(slug)}`;
}

/** Internal App Router prefix rewritten from research/brief public hosts. */
export const GOVERNANCE_FRAME_RESEARCH_INTERNAL_PREFIX = "/gf-research" as const;

export function isGovernanceFrameResearchInternalPath(pathname: string): boolean {
  return (
    pathname === GOVERNANCE_FRAME_RESEARCH_INTERNAL_PREFIX ||
    pathname.startsWith(`${GOVERNANCE_FRAME_RESEARCH_INTERNAL_PREFIX}/`)
  );
}

export function isGovernanceFramePublicPath(pathname: string): boolean {
  if (isGovernanceFrameResearchInternalPath(pathname)) return true;
  if (pathname === "/governance-frame" || pathname.startsWith("/governance-frame/")) return true;

  const publicRoots = [
    "/research-papers",
    "/briefings",
    "/newsletters",
    "/series",
    "/methodology",
    "/editorial-standards",
    "/sources-and-corrections",
    "/about",
  ] as const;

  return publicRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}
