export const LKG_HEALTH_AUDITOR_SUCCESS = 'healthAuditor' as const;

export function fingerprintHealthAuditorSuccess(state: {
  accounts?: unknown[];
  snapshots?: Record<string, unknown>;
}): string | null {
  const accountCount = state.accounts?.length ?? 0;
  const snapshotCount = Object.keys(state.snapshots ?? {}).length;
  if (accountCount === 0) return null;
  return `health-audit:${accountCount}:${snapshotCount}`;
}
