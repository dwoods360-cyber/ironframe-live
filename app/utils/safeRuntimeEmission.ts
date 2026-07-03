import { isClientDisconnectError } from "@/app/utils/isClientDisconnectError";
import { ABORT_REASONS } from "@/app/utils/abortReasons";
import type { DiagnosticAbortInput } from "@/app/lib/opsupport/diagnosticAbortTypes";
import { observeSuppressedFetchAbort } from "@/app/utils/diagnosticAbortLog";
import type { LocalizedAuditResult } from "@/app/utils/workforceAgentPillPipeline";

const BENIGN_ABORT_REASONS = new Set<string>(Object.values(ABORT_REASONS));

function isExplicitAbortReason(error: unknown): boolean {
  if (error == null) return false;
  const reason =
    typeof error === "string"
      ? error
      : typeof error === "object" && "reason" in error
        ? String((error as { reason?: unknown }).reason ?? "")
        : error instanceof Error
          ? error.message
          : "";
  return BENIGN_ABORT_REASONS.has(reason.trim());
}

/** Benign client/runtime errors that must not surface as crash screens during pill inspect. */
export function isBenignRuntimeEmissionError(error: unknown): boolean {
  if (isClientDisconnectError(error)) return true;
  if (isExplicitAbortReason(error)) return true;
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("signal is aborted") ||
    message.includes("networkerror when attempting to fetch") ||
    message.includes("load failed") ||
    message.includes("dashboard-fetch-timeout") ||
    message.includes("dashboard-nav-cleanup") ||
    message.includes("simulation-nav-switch")
  );
}

/**
 * Map an error to operator-facing copy, or `null` when the failure was a cancelled/stale fetch
 * and the UI should stay on the last good state without showing an error banner.
 */
export function resolveClientFacingError(
  error: unknown,
  fallback: string,
  diagnosticContext?: Omit<DiagnosticAbortInput, "reason">,
): string | null {
  if (isBenignRuntimeEmissionError(error)) {
    observeSuppressedFetchAbort(error, diagnosticContext ?? {});
    return null;
  }
  if (error instanceof Error) {
    const message = error.message.trim();
    return message.length > 0 ? message : fallback;
  }
  if (typeof error === "string") {
    const message = error.trim();
    return message.length > 0 ? message : fallback;
  }
  return fallback;
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
  diagnosticContext?: Omit<DiagnosticAbortInput, "reason">,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isBenignRuntimeEmissionError(error)) {
      observeSuppressedFetchAbort(error, diagnosticContext ?? {});
      return fallback;
    }
    throw error;
  }
}
