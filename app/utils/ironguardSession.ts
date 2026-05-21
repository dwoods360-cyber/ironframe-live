/**
 * Ironguard — effective Command Center / path / dev-override tenant for client fetches.
 * Kept in a module (not React state) so global fetch instrumentation can read it.
 */
let effectiveTenantUuid: string | null = null;

export function setIronguardEffectiveTenant(uuid: string | null) {
  const t = uuid?.trim();
  effectiveTenantUuid = t && t.length > 0 ? t.toLowerCase() : null;
}

export function getIronguardEffectiveTenant(): string | null {
  return effectiveTenantUuid;
}
