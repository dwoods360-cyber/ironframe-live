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
    "/operating-outline",
    "/what-governance-frame-is",
    "/sources-and-corrections",
    "/about",
  ] as const;

  return publicRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

/** Charter docs with public pretty routes (not raw `.md` file paths). */
const GOVERNANCE_FRAME_CHARTER_PRETTY: Readonly<Record<string, string>> = {
  "what-governance-frame-is": "/what-governance-frame-is",
  "editorial-standards": "/editorial-standards",
  "operating-outline": "/operating-outline",
};

/**
 * Map legacy `.md` / charter filesystem URLs onto research pretty paths.
 * Returns null when the pathname is already canonical (or not a known alias).
 */
export function governanceFrameCharterRedirectPath(pathname: string): string | null {
  const path = (pathname.split("?")[0] ?? "").replace(/\/+$/, "") || "/";

  const mdBare = path.match(/^\/([a-z0-9-]+)\.md$/i);
  if (mdBare) {
    const pretty = GOVERNANCE_FRAME_CHARTER_PRETTY[mdBare[1].toLowerCase()];
    return pretty ?? null;
  }

  const internalMd = path.match(/^\/gf-research\/([a-z0-9-]+)\.md$/i);
  if (internalMd) {
    const pretty = GOVERNANCE_FRAME_CHARTER_PRETTY[internalMd[1].toLowerCase()];
    return pretty ?? null;
  }

  const charterFs = path.match(
    /^\/(?:docs\/)?governance-frame\/charter\/([a-z0-9-]+)(?:\.md)?$/i,
  );
  if (charterFs) {
    const pretty = GOVERNANCE_FRAME_CHARTER_PRETTY[charterFs[1].toLowerCase()];
    return pretty ?? null;
  }

  return null;
}
