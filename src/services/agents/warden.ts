import { SovereignGraphState } from '../orchestration/state';

/**
 * AGENT 12 (THE WARDEN) - MATHEMATICAL GUARDRAIL
 * Mandate: Zero-Trust validation of LLM output.
 * Prevents floating-point errors and schema drift.
 */
export class TheWarden {
  static async validate(state: typeof SovereignGraphState.State): Promise<Partial<typeof SovereignGraphState.State>> {
    const payload = state.raw_payload;
    const logs: string[] = [];
    let status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'QUARANTINED' = "PROCESSING";
    let nextAgent = "IRONTRUST";

    // 1. Integer Check (Prevent Floating Point Hallucinations)
    const isInteger = Number.isInteger(payload?.amount_cents);
    const isPositive = (payload?.amount_cents || 0) >= 0;

    if (!isInteger || !isPositive) {
      status = "QUARANTINED";
      nextAgent = "END";
      logs.push(`WARDEN ALERT: Invalid Financial Format. Cents must be positive integers. Found: ${payload?.amount_cents}`);
    } else {
      logs.push("WARDEN: Mathematical integrity verified (Integer Cents).");
    }

    // 2. Tenant UUID Check
    if (!payload?.vendor_id || payload.vendor_id.length < 36) {
      status = "QUARANTINED";
      nextAgent = "END";
      logs.push("WARDEN ALERT: Malformed Vendor UUID detected.");
    }

    return {
      current_agent: nextAgent,
      status: status,
      agent_logs: logs
    };
  }
}
