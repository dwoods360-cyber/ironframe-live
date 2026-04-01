/**
 * Ironlock authority lane — priority interrupt / quarantine (Epic 6).
 * Preserves BigInt financial fields through hard kill (no Number coercion).
 */

export type QuarantineFinancialPayload = {
  ale_impact: bigint;
};

export type IronlockQuarantineState = {
  status: "QUARANTINED";
  interrupt_reason: "TTL_EXCEEDED";
  ale_impact: bigint;
};

export const IronlockAuthority = {
  async quarantineProcess(
    riskId: string,
    tenantId: string,
    payload: QuarantineFinancialPayload,
  ): Promise<IronlockQuarantineState> {
    void riskId;
    void tenantId;
    return {
      status: "QUARANTINED",
      interrupt_reason: "TTL_EXCEEDED",
      ale_impact: payload.ale_impact,
    };
  },
};
