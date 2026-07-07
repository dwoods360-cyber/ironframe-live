/** GLOBAL_ADMIN operations portal — same-origin proxy entry for the :8082 boardroom UI. */
export const IRONBOARD_OPERATIONS_PORTAL_PATH = "/dashboard/operations/ironboard" as const;

export const IRONBOARD_CONSOLE_PROXY_PREFIX =
  "/api/admin/operations-hub/ironboard-console" as const;

export function ironboardConsoleProxyPath(subpath = ""): string {
  const normalized = subpath.replace(/^\//, "");
  return normalized
    ? `${IRONBOARD_CONSOLE_PROXY_PREFIX}/${normalized}`
    : `${IRONBOARD_CONSOLE_PROXY_PREFIX}/`;
}
