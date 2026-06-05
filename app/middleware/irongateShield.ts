/**
 * Irongate zero-trust ingress boundary — rejects chaos/simulation writes without an active tenant scope.
 */
export function validateIngressContext(tenantId: string | undefined | null) {
  const trimmed = tenantId?.trim();
  if (!trimmed) {
    throw new Error("IRONGATE_SHIELD: Zero-trust ingestion rejected missing tenant ID.");
  }
  return { sanitized: true as const, tenantId: trimmed };
}
