import "server-only";

import type { DiagnosticAbortInput } from "@/app/lib/opsupport/diagnosticAbortTypes";
import { persistDiagnosticAbortLog } from "@/app/lib/server/persistDiagnosticAbortLog";

/** Structured server-side witness for HTTP 499 / cooperative disconnect (Vercel logs + SystemHealthLog). */
export function logServerRequestAbort(input: DiagnosticAbortInput): void {
  console.info("[diagnostic.fetch.abort]", JSON.stringify(input));
  void persistDiagnosticAbortLog(input).catch((error) => {
    console.error("[diagnostic.fetch.abort] persist failed", error);
  });
}
