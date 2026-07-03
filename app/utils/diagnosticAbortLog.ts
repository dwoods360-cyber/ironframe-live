import { ABORT_REASONS, type AbortReason } from "@/app/utils/abortReasons";
import { isClientDisconnectError } from "@/app/utils/isClientDisconnectError";
import type { DiagnosticAbortInput } from "@/app/lib/opsupport/diagnosticAbortTypes";

const DEDUPE_MS = 5_000;
const recentClientAbortKeys = new Map<string, number>();

const NAMED_ABORT_REASONS = new Set<string>(Object.values(ABORT_REASONS));

export function isCooperativeFetchAbort(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (message.includes("signal is aborted")) return true;
  return [...NAMED_ABORT_REASONS].some((reason) => message.includes(reason));
}

export function inferDiagnosticAbortReason(error: unknown): string | null {
  if (!isCooperativeFetchAbort(error)) return null;
  if (error instanceof DOMException) {
    const message = error.message?.trim();
    return message && message.length > 0 ? message : "abort-error";
  }
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.length > 0) return message;
    if (error.name === "AbortError") return "abort-error";
  }
  return "client-disconnect";
}

function dedupeKey(input: DiagnosticAbortInput): string {
  return `${input.reason}|${input.surface ?? ""}|${input.path ?? ""}|${input.method ?? ""}`;
}

function shouldEmitClientAbort(input: DiagnosticAbortInput): boolean {
  const key = dedupeKey(input);
  const now = Date.now();
  const last = recentClientAbortKeys.get(key);
  if (last != null && now - last < DEDUPE_MS) return false;
  recentClientAbortKeys.set(key, now);
  return true;
}

/** Client telemetry — never throws; deduped POST to OpSupport diagnostic store. */
export function logDiagnosticAbort(input: DiagnosticAbortInput): void {
  if (typeof window === "undefined") return;
  const reason = input.reason.trim();
  if (!reason || !shouldEmitClientAbort({ ...input, reason })) return;

  if (process.env.NODE_ENV !== "production") {
    console.debug("[diagnostic.fetch.abort]", input);
  }

  const path =
    input.path ??
    (typeof window.location?.pathname === "string" ? window.location.pathname : undefined);

  void fetch("/api/opsupport/diagnostic-abort", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reason,
      surface: input.surface,
      path,
      method: input.method,
    }),
    keepalive: true,
  }).catch(() => undefined);
}

export function observeSuppressedFetchAbort(
  error: unknown,
  context: Omit<DiagnosticAbortInput, "reason"> & { reason?: string },
): void {
  const reason = context.reason ?? inferDiagnosticAbortReason(error);
  if (!reason) return;
  logDiagnosticAbort({
    reason,
    surface: context.surface,
    path: context.path,
    method: context.method,
  });
}

export function logExplicitDiagnosticAbort(
  reason: AbortReason | string,
  context: Omit<DiagnosticAbortInput, "reason"> = {},
): void {
  logDiagnosticAbort({ reason, ...context });
}
