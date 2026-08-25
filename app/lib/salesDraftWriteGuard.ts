/**
 * Hard lock: never overwrite a Sales CRM row that already left the wire
 * (`[DISPATCHED SALES COURIER]`). Prep / rewrite / polish scripts must use
 * `assertPendingSalesDraftWritable` (or `updatePendingSalesDraftOnly`) before
 * mutating summary bodies.
 *
 * Root cause this guards: human-voice rewrite by fixed ID after HITL DISPATCH
 * reset DISPATCHED → PENDING and enabled duplicate Resend sends (2026-08-25).
 */

export const DISPATCHED_SALES_COURIER_TAG = "[DISPATCHED SALES COURIER]";
export const PENDING_SALES_DRAFT_APPROVAL_TAG = "[PENDING SALES DRAFT APPROVAL]";

export type SalesDraftWriteBlockReason =
  | "NOT_FOUND"
  | "DISPATCHED_LOCKED"
  | "NOT_PENDING";

export type SalesDraftWriteGate =
  | { ok: true; id: string; summary: string }
  | { ok: false; id: string; reason: SalesDraftWriteBlockReason };

export function isDispatchedSalesDraftSummary(
  summary: string | null | undefined,
): boolean {
  return String(summary ?? "").includes(DISPATCHED_SALES_COURIER_TAG);
}

export function isPendingSalesDraftSummary(
  summary: string | null | undefined,
): boolean {
  const s = String(summary ?? "");
  return (
    s.includes(PENDING_SALES_DRAFT_APPROVAL_TAG) &&
    !s.includes(DISPATCHED_SALES_COURIER_TAG)
  );
}

/** Pure gate from a loaded summary (scripts + server). */
export function gateSalesDraftWrite(input: {
  id: string;
  summary: string | null | undefined;
  /** When true, only DISPATCHED blocks (HOLD/PURGED may still be edited). Default: require PENDING. */
  requirePending?: boolean;
}): SalesDraftWriteGate {
  const requirePending = input.requirePending !== false;
  const summary = input.summary ?? "";
  if (!summary && requirePending) {
    return { ok: false, id: input.id, reason: "NOT_FOUND" };
  }
  if (isDispatchedSalesDraftSummary(summary)) {
    return { ok: false, id: input.id, reason: "DISPATCHED_LOCKED" };
  }
  if (requirePending && !isPendingSalesDraftSummary(summary)) {
    return { ok: false, id: input.id, reason: "NOT_PENDING" };
  }
  return { ok: true, id: input.id, summary };
}

type PrismaLike = {
  ironboardCrmInteraction: {
    findUnique: (args: {
      where: { id: string };
      select: { id: true; summary: true };
    }) => Promise<{ id: string; summary: string | null } | null>;
    update: (args: {
      where: { id: string };
      data: { summary: string; occurredAt?: Date };
    }) => Promise<unknown>;
  };
};

/**
 * Load + gate + update. Never writes when DISPATCHED.
 * Returns gate failure without throwing so batch scripts can continue.
 */
export async function updatePendingSalesDraftOnly(
  prisma: PrismaLike,
  input: {
    id: string;
    summary: string;
    occurredAt?: Date;
    requirePending?: boolean;
  },
): Promise<SalesDraftWriteGate & { updated?: boolean }> {
  const row = await prisma.ironboardCrmInteraction.findUnique({
    where: { id: input.id },
    select: { id: true, summary: true },
  });
  if (!row) {
    return { ok: false, id: input.id, reason: "NOT_FOUND" };
  }
  const gate = gateSalesDraftWrite({
    id: input.id,
    summary: row.summary,
    requirePending: input.requirePending,
  });
  if (!gate.ok) return gate;

  await prisma.ironboardCrmInteraction.update({
    where: { id: input.id },
    data: {
      summary: input.summary.slice(0, 12_000),
      ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
    },
  });
  return { ...gate, updated: true };
}
