import { ABORT_REASONS } from "@/app/utils/abortReasons";
import { isBenignRuntimeEmissionError } from "@/app/utils/safeRuntimeEmission";
import { logExplicitDiagnosticAbort } from "@/app/utils/diagnosticAbortLog";

export const SIM_NAV_ABORT_EVENT = "ironframe:sim-nav-abort" as const;

let activeSimulationAbort: AbortController | null = null;

/** Kill in-flight simulation fetches before the next navigation-bound request. */
export function abortActiveSimulationFetches(reason = ABORT_REASONS.simulationNavSwitch): void {
  if (activeSimulationAbort) {
    logExplicitDiagnosticAbort(reason, {
      surface: "simulationNavAbort",
      method: "GET",
    });
    try {
      activeSimulationAbort.abort(reason);
    } catch {
      /* already aborted */
    }
    activeSimulationAbort = null;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SIM_NAV_ABORT_EVENT, { detail: { reason } }));
  }
}

/** Register a controller aborted on the next sim-nav transition or explicit abort. */
export function armSimulationFetchController(): AbortController {
  abortActiveSimulationFetches();
  const controller = new AbortController();
  activeSimulationAbort = controller;
  return controller;
}

export function subscribeSimulationNavAbort(onAbort: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => onAbort();
  window.addEventListener(SIM_NAV_ABORT_EVENT, handler);
  return () => window.removeEventListener(SIM_NAV_ABORT_EVENT, handler);
}

export function isSimulationFetchAborted(signal: AbortSignal, error?: unknown): boolean {
  if (signal.aborted) return true;
  if (error != null && isBenignRuntimeEmissionError(error)) return true;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return (
    message.includes("simulation-nav-switch") ||
    message.toLowerCase().includes("aborted")
  );
}

export async function runSimulationGuardedAsync<T>(
  signal: AbortSignal,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    const result = await fn();
    return signal.aborted ? fallback : result;
  } catch (error) {
    if (isSimulationFetchAborted(signal, error)) return fallback;
    throw error;
  }
}
