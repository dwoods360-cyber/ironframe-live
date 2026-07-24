/** Middleware-safe demo constants (no server-only imports). */

export const DEMO_SESSION_STORAGE_KEY = "ironframe-demo-session";
export const DEMO_SESSION_COOKIE = "ironframe-demo-session-payload";
export const DEMO_ACTIVE_COOKIE = "ironframe-demo-active";

export const DEMO_ORG_NAME = "Acme Corporation (Enterprise Demo)";
export const DEMO_WORKSPACE_SLUG = "acorp-sandbox";

export const DEMO_ENCLAVE_UUID = "00000000-0000-4000-8000-000000000001";

export const DEMO_INDUSTRY_UUIDS = {
  medshield: "00000000-0000-4000-8000-000000000011",
  vaultbank: "00000000-0000-4000-8000-000000000012",
  gridcore: "00000000-0000-4000-8000-000000000013",
} as const;

/** Irontrust ALE architecture anchors — whole USD cents (unrounded BigInt). */
export const DEMO_ALE_BASELINE_CENTS = {
  medshield: 1_110_000_000n,
  vaultbank: 590_000_000n,
  gridcore: 470_000_000n,
} as const;

export const DEMO_ALE_BASELINE_DISPLAY = {
  medshield: "$11,100,000.00",
  vaultbank: "$5,900,000.00",
  gridcore: "$4,700,000.00",
} as const;

export function isDemoPath(pathname: string): boolean {
  return pathname === "/demo" || pathname.startsWith("/demo/");
}

export function isDemoRegistrationPath(pathname: string): boolean {
  return pathname === "/register/demo";
}

export function isDemoPublicPath(pathname: string): boolean {
  return isDemoPath(pathname) || isDemoRegistrationPath(pathname);
}

export function isDemoSandboxSlug(slug: string | null | undefined): boolean {
  return slug?.trim().toLowerCase() === DEMO_WORKSPACE_SLUG;
}
