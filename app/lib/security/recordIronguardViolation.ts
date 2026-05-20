import "server-only";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { bumpLedgerFromIronguardMetadata } from "@/app/lib/security/quarantineLedgerGuard";

export type RecordIronguardViolationInput = {
  sessionTenantUuid?: string | null;
  attemptedTenantUuid?: string | null;
  errorCode: string;
  path?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** Persist Ironguard denial for Ironwatch circuit breaker + Ironscribe daily synthesis. */
export async function recordIronguardViolation(input: RecordIronguardViolationInput): Promise<void> {
  const code = input.errorCode?.trim() || "UNKNOWN";
  const path = input.path?.trim() ? input.path.trim().slice(0, 1024) : null;
  await prisma.ironguardViolation.create({
    data: {
      sessionTenantUuid: input.sessionTenantUuid?.trim() || null,
      attemptedTenantUuid: input.attemptedTenantUuid?.trim() || null,
      errorCode: code.slice(0, 256),
      path,
      metadata:
        input.metadata === undefined || input.metadata === null
          ? undefined
          : (input.metadata as Prisma.InputJsonValue),
    },
  });
  const meta =
    input.metadata && typeof input.metadata === "object"
      ? (input.metadata as Record<string, unknown>)
      : null;
  await bumpLedgerFromIronguardMetadata(meta);
}
