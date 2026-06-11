"use client";

import type { PendingThreatResolutionItem } from "@/app/lib/server/ironsightReviewQueueCore";
import type { ResiliencePollRow } from "@/app/lib/server/ironintelResiliencePollCore";
import { isSimulationFetchAborted } from "@/app/utils/simulationNavAbort";

export type IronsightReviewQueueResult =
  | { ok: true; items: PendingThreatResolutionItem[]; tenantId: string | null; aborted?: false }
  | { ok: false; error: string; items: []; tenantId?: null; aborted?: boolean };

const ABORTED_REVIEW_QUEUE: IronsightReviewQueueResult = {
  ok: false,
  error: "",
  items: [],
  aborted: true,
};

/** Agent 08 — HITL review queue (abortable fetch, releases Prisma worker on nav). */
export async function fetchIronsightReviewQueue(
  signal: AbortSignal,
  tenantUuid: string | null,
): Promise<IronsightReviewQueueResult> {
  if (signal.aborted) return ABORTED_REVIEW_QUEUE;
  try {
    const url = new URL("/api/simulation/ironsight-review-queue", window.location.origin);
    if (tenantUuid?.trim()) url.searchParams.set("tenant", tenantUuid.trim());
    const res = await fetch(url, { signal, cache: "no-store" });
    if (res.status === 499 || signal.aborted) return ABORTED_REVIEW_QUEUE;
    const body = (await res.json()) as IronsightReviewQueueResult;
    if (body.aborted) return ABORTED_REVIEW_QUEUE;
    return body;
  } catch (error) {
    if (isSimulationFetchAborted(signal, error)) return ABORTED_REVIEW_QUEUE;
    throw error;
  }
}

/** Agent 11 — resilience intel stream poll (abortable fetch). */
export async function fetchIronintelResilienceLines(
  signal: AbortSignal,
  afterTimeIso: string | null,
  showSimulation: boolean,
): Promise<ResiliencePollRow[]> {
  if (signal.aborted) return [];
  try {
    const url = new URL("/api/simulation/ironintel-resilience", window.location.origin);
    if (afterTimeIso) url.searchParams.set("after", afterTimeIso);
    if (showSimulation) url.searchParams.set("simulation", "1");
    const res = await fetch(url, { signal, cache: "no-store" });
    if (res.status === 499 || signal.aborted) return [];
    const body = (await res.json()) as { rows?: ResiliencePollRow[]; aborted?: boolean };
    if (body.aborted) return [];
    return Array.isArray(body.rows) ? body.rows : [];
  } catch (error) {
    if (isSimulationFetchAborted(signal, error)) return [];
    throw error;
  }
}
