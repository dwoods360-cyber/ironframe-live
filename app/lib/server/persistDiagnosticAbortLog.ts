import "server-only";

import prisma from "@/lib/prisma";
import {
  DIAGNOSTIC_FETCH_ABORT_SERVICE_KEY,
  type DiagnosticAbortInput,
} from "@/app/lib/opsupport/diagnosticAbortTypes";

export async function persistDiagnosticAbortLog(input: DiagnosticAbortInput): Promise<void> {
  const reason = input.reason.trim().slice(0, 512);
  if (!reason) return;

  const surface = input.surface?.trim().slice(0, 256) ?? null;
  const path = input.path?.trim().slice(0, 1024) ?? null;
  const method = input.method?.trim().toUpperCase().slice(0, 16) ?? null;

  const detail = [
    reason,
    surface ? `surface=${surface}` : null,
    path ? `path=${path}` : null,
    method ? `method=${method}` : null,
  ]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 4000);

  await prisma.systemHealthLog.create({
    data: {
      serviceKey: DIAGNOSTIC_FETCH_ABORT_SERVICE_KEY,
      ok: false,
      httpStatus: 499,
      latencyMs: 0,
      detail,
      meta: {
        cooperativeAbort: true,
        reason,
        ...(surface ? { surface } : {}),
        ...(path ? { path } : {}),
        ...(method ? { method } : {}),
      },
    },
  });
}
