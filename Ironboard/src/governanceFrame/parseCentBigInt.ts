export function parseCentBigInt(raw: string): string {
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");
  if (!trimmed) return "0";
  if (/[eE]/.test(trimmed) || trimmed.includes(".")) {
    throw new Error(`Governance Frame cent register must be a whole integer, got: ${raw}`);
  }
  if (!/^-?\d+$/.test(trimmed)) {
    throw new Error(`Governance Frame cent register must be numeric, got: ${raw}`);
  }
  return BigInt(trimmed).toString();
}

export function parseCentBigIntSafe(raw: string): string {
  try {
    return parseCentBigInt(raw);
  } catch {
    return "0";
  }
}

export const QUARANTINE_AUDIT_PREFIX =
  "[SECURITY AUDIT] Unauthorized compilation attempt blocked for unvetted draft:";

export function quarantineAuditMessage(filename: string): string {
  return `${QUARANTINE_AUDIT_PREFIX} ${filename}`;
}
