/**
 * Ironcast Dispatch Schema
 * Governs the egress of all notification telemetry (Epic 7 source of truth).
 */
export interface IroncastDispatchPayload {
  /** MUST match the active tenant session */
  tenant_id: string;

  /** Proof that Irongate (Agent 14) has scrubbed this data */
  sanitization_status: "CLEANED" | "VERIFIED_SYSTEM_GENERATED";
  irongate_trace_id: string;

  /** Routing data */
  recipient: {
    email: string;
    role: "SECURITY_OFFICER" | "SYSTEM_ADMIN" | "PRODUCT_OWNER";
  };

  /** Content (must be sanitized before reaching this interface) */
  notification: {
    priority: "URGENT" | "HIGH" | "NOTICE";
    subject: string;
    body_summary: string;
    /** Optional link to a specific Risk record */
    risk_id?: string;
  };

  /** BigInt Unix timestamp for audit trails */
  timestamp: bigint;
}
