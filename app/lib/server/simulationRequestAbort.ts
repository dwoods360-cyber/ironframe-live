/**
 * Server-side abort guards for simulation nav (Agents 08 Ironsight, 11 Ironintel).
 * Read-only HITL / audit paths — never touches ALE baseline ledger tables.
 */

export class SimulationRequestAbortError extends Error {
  readonly code = "SIMULATION_REQUEST_ABORTED";

  constructor(message = "Simulation request aborted") {
    super(message);
    this.name = "SimulationRequestAbortError";
  }
}

export function throwIfAborted(signal?: AbortSignal | null): void {
  if (!signal?.aborted) return;
  const reason = signal.reason;
  const detail =
    typeof reason === "string" && reason.length > 0
      ? reason
      : "signal is aborted without reason";
  throw new SimulationRequestAbortError(detail);
}

/**
 * Prisma abortSignal is incompatible with Next.js Route Handler request.signal in dev/prod RPC.
 * Simulation read paths use cooperative `throwIfAborted` at await boundaries instead.
 */
export function prismaAbortOptions(_signal?: AbortSignal | null): { abortSignal?: AbortSignal } {
  void _signal;
  return {};
}

export function isSimulationRequestAbortError(error: unknown): boolean {
  if (error instanceof SimulationRequestAbortError) return true;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error) {
    if (error.name === "AbortError") return true;
    const msg = error.message.toLowerCase();
    // Prisma validation errors mention `abortSignal` — must not classify as nav abort.
    if (msg.includes("abortsignal")) return false;
    return (
      msg.includes("simulation request aborted") ||
      msg.includes("signal is aborted") ||
      msg.includes("simulation-nav-switch")
    );
  }
  return false;
}
