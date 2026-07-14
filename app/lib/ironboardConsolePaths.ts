/** GLOBAL_ADMIN operations portal — same-origin proxy entry for the :8082 boardroom UI. */
export const IRONBOARD_OPERATIONS_PORTAL_PATH = "/dashboard/operations/ironboard" as const;

export const IRONBOARD_CONSOLE_PROXY_PREFIX =
  "/api/admin/operations-hub/ironboard-console" as const;

/**
 * Same-origin iframe / fetch path for the boardroom console.
 * Root must NOT end with `/` — Next/Vercel 308-redirects trailing-slash URLs to the
 * non-slash form, which races the iframe load and can strand `document.baseURI`.
 */
export function ironboardConsoleProxyPath(subpath = ""): string {
  const normalized = subpath.replace(/^\//, "");
  return normalized
    ? `${IRONBOARD_CONSOLE_PROXY_PREFIX}/${normalized}`
    : IRONBOARD_CONSOLE_PROXY_PREFIX;
}

/** Directory-form base href so relative `api/...` resolves under the console proxy. */
export function ironboardConsoleBaseHref(): string {
  return `${IRONBOARD_CONSOLE_PROXY_PREFIX}/`;
}

/**
 * Prefer a public HTTPS engine URL for the ops iframe so Query SSE hits Cloud Run
 * directly (avoids Vercel proxy buffering / trailing-slash baseURI traps).
 * Fall back to the same-origin console proxy for local/private upstreams.
 */
export function resolveBoardroomEmbedUrl(upstreamBase: string, reachable: boolean): string {
  if (reachable && /^https:\/\//i.test(upstreamBase.trim())) {
    return `${upstreamBase.trim().replace(/\/$/, "")}/`;
  }
  return ironboardConsoleProxyPath();
}
