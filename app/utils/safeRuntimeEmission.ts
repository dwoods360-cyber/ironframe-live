import { isClientDisconnectError } from "@/app/utils/isClientDisconnectError";
import type { LocalizedAuditResult } from "@/app/utils/workforceAgentPillPipeline";

/** Benign client/runtime errors that must not surface as crash screens during pill inspect. */
export function isBenignRuntimeEmissionError(error: unknown): boolean {
  if (isClientDisconnectError(error)) return true;
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("signal is aborted without reason") ||
    message.includes("networkerror when attempting to fetch") ||
    message.includes("load failed")
  );
}

export const AGENT_INSPECT_EMISSION_FALLBACK: LocalizedAuditResult = {
  pass: false,
  inlineLabel: "FAIL",
  streamMessage: "> [AUDIT] Diagnostic channel interrupted — inspect UI retained, retry when stable.",
};

/** Swallow abort / dropped-fetch noise from inspect emission paths. */
export function safeAgentInspectEmission(fn: () => LocalizedAuditResult): LocalizedAuditResult {
  try {
    return fn();
  } catch (error) {
    if (isBenignRuntimeEmissionError(error)) {
      return AGENT_INSPECT_EMISSION_FALLBACK;
    }
    throw error;
  }
}

/** Promise variant for Control Room / plane data hydration. */
export async function safeRuntimeAsyncEmission<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isBenignRuntimeEmissionError(error)) {
      return fallback;
    }
    throw error;
  }
}
