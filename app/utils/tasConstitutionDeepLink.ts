/**
 * Deep links into `docs/TAS.md` — browser route in production, `vscode://file/…:line` on localhost
 * when `NEXT_PUBLIC_PROJECT_ROOT` is set (Cursor / VS Code exclusive local workflow).
 */

export const TAS_CONSTITUTION_WEB_PATH = "/constitution/tas" as const;

function sanitizeAnchorId(anchorId: string): string {
  return anchorId.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function isBrowserLocalDevHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/**
 * @param anchorId TAS fragment (e.g. `agent-14`) — appended for web builds
 * @param tasLine 1-based line in `docs/TAS.md` for `vscode://file/…:line`
 */
export function resolveTasConstitutionHref(anchorId: string, tasLine: number): string {
  const safe = sanitizeAnchorId(anchorId);
  const hash = safe ? `#${safe}` : "";
  if (typeof window !== "undefined") {
    const root = process.env.NEXT_PUBLIC_PROJECT_ROOT?.trim().replace(/\\/g, "/");
    if (root && isBrowserLocalDevHost(window.location.hostname)) {
      const clean = root.replace(/\/$/, "");
      const rel = `docs/TAS.md`;
      const joined = `${clean}/${rel}`.replace(/\/+/g, "/");
      const pathForUri = joined.startsWith("/") ? `/${joined}` : joined;
      return `vscode://file/${pathForUri}:${tasLine}`;
    }
    return `${TAS_CONSTITUTION_WEB_PATH}${hash}`;
  }
  return `${TAS_CONSTITUTION_WEB_PATH}${hash}`;
}
