import "server-only";

import type { Prisma } from "@prisma/client";

import {
  applyOperatorHoldToMetadata,
  buildOperatorHoldRecord,
  clearOperatorHoldFromMetadata,
  OPERATOR_HOLD_META_KEY,
  resolveOperatorHold,
} from "@/app/lib/server/ironleadsOperatorHoldCore";
import prisma from "@/lib/prisma";

/** Active SUSPECT review batch size for Path B directory work. */
export const IRONLEADS_ACTIVE_BATCH_SIZE = 20;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

export function isPendingBatchHold(metadata: unknown): boolean {
  return resolveOperatorHold(metadata)?.classification === "pending_batch";
}

async function loadSuspectContacts(take: number) {
  return prisma.ironboardCrmContact.findMany({
    where: { primaryDeals: { some: { stage: "SUSPECT" } } },
    orderBy: [{ createdAt: "desc" }, { priorityScore: "desc" }],
    take,
    select: { id: true, createdAt: true, metadata: true },
  });
}

/** How many SUSPECTs are in the active review queue (not HOLD / pending). */
export async function countActiveSuspects(): Promise<number> {
  const rows = await loadSuspectContacts(500);
  return rows.filter((row) => !resolveOperatorHold(row.metadata)).length;
}

/**
 * After directory import: leave room for up to ACTIVE_BATCH_SIZE active SUSPECTs;
 * park the rest of this import into the pending pool (FIFO pull later).
 */
export async function parkImportedOverflow(contactIds: string[]): Promise<{
  keptActive: number;
  parkedPending: number;
  activeCap: number;
}> {
  const uniqueIds = [...new Set(contactIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return {
      keptActive: 0,
      parkedPending: 0,
      activeCap: IRONLEADS_ACTIVE_BATCH_SIZE,
    };
  }

  const activeCount = await countActiveSuspects();
  // Count only non-held among the imported set that are already active.
  const imported = await prisma.ironboardCrmContact.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, createdAt: true, metadata: true },
  });
  const importedActive = imported.filter((row) => !resolveOperatorHold(row.metadata));
  // Slots already consumed by other actives (not in this import).
  const otherActive = Math.max(0, activeCount - importedActive.length);
  let slots = Math.max(0, IRONLEADS_ACTIVE_BATCH_SIZE - otherActive);

  // Newest imports stay active first.
  const ordered = [...importedActive].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  let keptActive = 0;
  let parkedPending = 0;
  const hold = buildOperatorHoldRecord({
    classification: "pending_batch",
    reason: "Pending pool — pull into active batch of 20 when ready.",
  });

  for (const row of ordered) {
    if (slots > 0) {
      slots -= 1;
      keptActive += 1;
      continue;
    }
    const nextMeta = applyOperatorHoldToMetadata(asRecord(row.metadata), hold);
    await prisma.ironboardCrmContact.update({
      where: { id: row.id },
      data: { metadata: nextMeta as Prisma.InputJsonValue },
    });
    parkedPending += 1;
  }

  return {
    keptActive,
    parkedPending,
    activeCap: IRONLEADS_ACTIVE_BATCH_SIZE,
  };
}

/**
 * Park active SUSPECTs beyond the batch cap into pending (keeps newest N active).
 * Use once after a large import that filled the active queue.
 */
export async function parkExcessActiveToPending(): Promise<{
  keptActive: number;
  parkedPending: number;
  activeCap: number;
}> {
  const rows = await loadSuspectContacts(500);
  const active = rows.filter((row) => !resolveOperatorHold(row.metadata));
  // Newest first already from query order.
  const keep = active.slice(0, IRONLEADS_ACTIVE_BATCH_SIZE);
  const park = active.slice(IRONLEADS_ACTIVE_BATCH_SIZE);
  const hold = buildOperatorHoldRecord({
    classification: "pending_batch",
    reason: "Pending pool — excess active trimmed to batch of 20.",
  });

  for (const row of park) {
    const nextMeta = applyOperatorHoldToMetadata(asRecord(row.metadata), hold);
    await prisma.ironboardCrmContact.update({
      where: { id: row.id },
      data: { metadata: nextMeta as Prisma.InputJsonValue },
    });
  }

  return {
    keptActive: keep.length,
    parkedPending: park.length,
    activeCap: IRONLEADS_ACTIVE_BATCH_SIZE,
  };
}

/**
 * Restore up to `limit` pending_batch SUSPECTs into the active queue
 * (fills until active count reaches ACTIVE_BATCH_SIZE).
 */
export async function pullPendingSuspectBatch(
  limit = IRONLEADS_ACTIVE_BATCH_SIZE,
): Promise<{
  pulled: number;
  remainingPending: number;
  activeCount: number;
  activeCap: number;
  contactIds: string[];
}> {
  const pullLimit = Math.min(
    Math.max(1, Math.floor(limit) || IRONLEADS_ACTIVE_BATCH_SIZE),
    IRONLEADS_ACTIVE_BATCH_SIZE,
  );
  const activeCount = await countActiveSuspects();
  const need = Math.max(0, IRONLEADS_ACTIVE_BATCH_SIZE - activeCount);
  const toPull = Math.min(need, pullLimit);

  if (toPull === 0) {
    const remaining = await countPendingBatch();
    return {
      pulled: 0,
      remainingPending: remaining,
      activeCount,
      activeCap: IRONLEADS_ACTIVE_BATCH_SIZE,
      contactIds: [],
    };
  }

  const candidates = await loadSuspectContacts(500);
  // FIFO: oldest pending first so the operator walks the directory list in order.
  const pending = candidates
    .filter((row) => isPendingBatchHold(row.metadata))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, toPull);

  const contactIds: string[] = [];
  for (const row of pending) {
    const cleared = clearOperatorHoldFromMetadata(asRecord(row.metadata));
    delete cleared[OPERATOR_HOLD_META_KEY];
    await prisma.ironboardCrmContact.update({
      where: { id: row.id },
      data: { metadata: cleared as Prisma.InputJsonValue },
    });
    contactIds.push(row.id);
  }

  const remainingPending = await countPendingBatch();
  const nextActive = await countActiveSuspects();
  return {
    pulled: contactIds.length,
    remainingPending,
    activeCount: nextActive,
    activeCap: IRONLEADS_ACTIVE_BATCH_SIZE,
    contactIds,
  };
}

export async function countPendingBatch(): Promise<number> {
  const rows = await loadSuspectContacts(500);
  return rows.filter((row) => isPendingBatchHold(row.metadata)).length;
}
