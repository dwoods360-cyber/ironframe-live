/** Academic sandbox seat length — scarce enough to feel intentional; writing window, not lab duration. */
export const FELLOWS_SANDBOX_TTL_DAYS = 60;

export function fellowsSandboxExpiryFrom(now = new Date()): Date {
  return new Date(now.getTime() + FELLOWS_SANDBOX_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** Extend seat from now when the fellow is active in the lab. */
export function extendFellowsSandboxExpiry(now = new Date()): Date {
  return fellowsSandboxExpiryFrom(now);
}

export function isFellowsSandboxExpired(expiresAt: Date | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() < now.getTime();
}
