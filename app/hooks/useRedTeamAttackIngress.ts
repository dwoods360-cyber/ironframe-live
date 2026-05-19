"use client";

import { logRedTeamActionTracker } from "@/app/lib/redTeamActionTracker";
import { useAttackDeckStore } from "@/app/store/attackDeckStore";
import type { AttackRiskCardProcessedData } from "@/app/types/attackRiskCard";

export type RedTeamAttackInput = AttackRiskCardProcessedData;

function newAttackId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `atk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Instant deck registration (PROCESSING) before async attack logic — card never blocks on network.
 */
export function registerRedTeamAttack(input: RedTeamAttackInput): string {
  const id = newAttackId();
  const registeredAt = new Date().toISOString();
  useAttackDeckStore.getState().pushProcessingCard({
    id,
    registeredAt,
    processedData: input,
    phase: "PROCESSING",
  });
  logRedTeamActionTracker("REGISTERED", input);
  return id;
}

export function resolveRedTeamAttack(
  id: string,
  input: RedTeamAttackInput,
  threatId?: string,
): void {
  useAttackDeckStore.getState().updateCard(id, {
    phase: "ACTIVE",
    processedData: input,
    threatId,
  });
  logRedTeamActionTracker("RESOLVED", input, threatId ? `threatId=${threatId}` : undefined);
}

export function failRedTeamAttack(id: string, input: RedTeamAttackInput, reason: string): void {
  useAttackDeckStore.getState().updateCard(id, {
    phase: "FAILED",
    processedData: {
      ...input,
      payloadDetails: `${input.payloadDetails} · ${reason}`.slice(0, 500),
    },
  });
  logRedTeamActionTracker("FAILED", input, reason);
}

/**
 * Register card immediately, run async work, then promote to ACTIVE or FAILED.
 */
export async function executeRedTeamAttackWithIngress<T>(
  input: RedTeamAttackInput,
  work: () => Promise<T>,
  mapResult?: (result: T) => { processedData?: Partial<RedTeamAttackInput>; threatId?: string },
): Promise<T> {
  const id = registerRedTeamAttack(input);
  try {
    const result = await work();
    const mapped = mapResult?.(result);
    resolveRedTeamAttack(
      id,
      { ...input, ...mapped?.processedData },
      mapped?.threatId,
    );
    return result;
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Attack resolution failed";
    failRedTeamAttack(id, input, reason);
    throw err;
  }
}
