import { ABORT_REASONS } from "@/app/utils/abortReasons";
import { logExplicitDiagnosticAbort } from "@/app/utils/diagnosticAbortLog";

/**
 * Single flight for `GET /api/threats/active` — rapid Chaos / board sync calls supersede prior requests
 * so the browser aborts cleanly instead of stacking connections (ECONNRESET under load).
 */
let currentActiveThreatsBoardFetch: AbortController | null = null;

export function supersedeActiveThreatsBoardFetch(): AbortController {
  if (currentActiveThreatsBoardFetch) {
    logExplicitDiagnosticAbort(ABORT_REASONS.activeThreatsBoardSuperseded, {
      surface: "activeThreatsBoardFetchCoop",
      path: "/api/threats/active",
      method: "GET",
    });
    currentActiveThreatsBoardFetch.abort(ABORT_REASONS.activeThreatsBoardSuperseded);
  }
  const next = new AbortController();
  currentActiveThreatsBoardFetch = next;
  return next;
}

export function endActiveThreatsBoardFetchIfCurrent(ctrl: AbortController): void {
  if (currentActiveThreatsBoardFetch === ctrl) {
    currentActiveThreatsBoardFetch = null;
  }
}
