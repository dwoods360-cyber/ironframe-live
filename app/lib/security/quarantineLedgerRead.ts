import "server-only";

import prisma from "@/lib/prisma";
import { logStructuredEvent } from "@/lib/structuredServerLog";

let missingTableWarned = false;

type PrismaKnownErrorLike = {
  code?: string;
  message?: string;
  meta?: { table?: string; modelName?: string };
};

/** Duck-type P2021 — `instanceof` breaks when Next bundles duplicate `@prisma/client` copies. */
export function isPrismaMissingTableError(err: unknown, tableName?: string): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as PrismaKnownErrorLike;
  if (e.code !== "P2021") return false;
  if (!tableName) return true;
  const hay = `${e.meta?.table ?? ""} ${e.meta?.modelName ?? ""} ${e.message ?? ""}`;
  return hay.includes(tableName);
}

/** Tenant-scoped Gavel hard-ban count for Ironwatch layout / human-ack gates. */
export async function countTenantQuarantineHardBans(
  tenantUuid: string | null | undefined,
): Promise<number> {
  const tenant = tenantUuid?.trim();
  if (!tenant) return 0;
  try {
    return await prisma.quarantineLedger.count({
      where: { isHardBan: true, primaryTargetTenantUuid: tenant },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const missingTable =
      isPrismaMissingTableError(err, "quarantine_ledger") ||
      (msg.includes("quarantine_ledger") && msg.includes("does not exist"));
    if (!missingTable) throw err;
    if (process.env.NODE_ENV !== "production" && !missingTableWarned) {
      missingTableWarned = true;
      logStructuredEvent(
        "quarantine",
        "ledger_table_missing",
        { hint: "Run `npx prisma migrate deploy` to create public.quarantine_ledger." },
        "warn",
      );
    }
    return 0;
  }
}
