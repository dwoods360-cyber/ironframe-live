/** Epic 15 fault-injection hook — test-only downstream abort (production payloads must not set this). */
export const FORENSIC_FAULT_INJECTION_FLAG = "force_downstream_crash";

export const TRANSACTION_ABORTED = "TRANSACTION_ABORTED";

export function sanitizedPayloadRequestsFaultInjection(
  payload: Record<string, unknown> | undefined,
): boolean {
  if (!payload) return false;
  return payload[FORENSIC_FAULT_INJECTION_FLAG] === true;
}

export function throwForensicTransactionAborted(agentLabel: string): never {
  throw new Error(
    `${TRANSACTION_ABORTED}: ${agentLabel} fault injection — downstream persist blocked; zero-bleed rollback required.`,
  );
}
