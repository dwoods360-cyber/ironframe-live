"use server";

import prisma from "@/lib/prisma";
import type { SentinelAutomationOutbox } from "@prisma/client";

const JOB_KIND = "AGENT17_SENTINEL_SWEEP";

export type ClaimedSentinelJob = SentinelAutomationOutbox;

/**
 * Claim pending outbox rows (SKIP LOCKED) for Agent 17 workers — safe under concurrent HTTP cron + pg_cron inserts.
 */
export async function claimSentinelAutomationJobs(limit = 5): Promise<ClaimedSentinelJob[]> {
  const cap = Math.min(Math.max(limit, 1), 25);
  return prisma.$transaction(async (tx) => {
    const pending = await tx.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM sentinel_automation_outbox
      WHERE status = 'PENDING'
        AND run_after <= now()
      ORDER BY run_after ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${cap}
    `;
    if (pending.length === 0) return [];

    const ids = pending.map((p) => p.id);
    await tx.sentinelAutomationOutbox.updateMany({
      where: { id: { in: ids } },
      data: {
        status: "CLAIMED",
        claimedAt: new Date(),
      },
    });
    return tx.sentinelAutomationOutbox.findMany({ where: { id: { in: ids } } });
  });
}

export async function completeSentinelAutomationJob(
  id: string,
  outcome: { ok: true } | { ok: false; error: string },
): Promise<void> {
  const jid = id?.trim();
  if (!jid) return;

  await prisma.sentinelAutomationOutbox.update({
    where: { id: jid },
    data: outcome.ok
      ? { status: "DONE", completedAt: new Date(), lastError: null }
      : { status: "FAILED", completedAt: new Date(), lastError: outcome.error.slice(0, 4000) },
  });
}

/**
 * Placeholder sweep: enqueue evidence refresh / hybrid corpus maintenance hooks here (per-tenant or global).
 * Wire to Sentinel ingestion when product rules are finalized.
 */
export async function runAgent17SentinelSweepPlaceholder(job: ClaimedSentinelJob): Promise<void> {
  void job;
  // Intentionally minimal: drain queue without long-running work so cron + HTTP paths stay safe to deploy.
}

export async function processAgent17OutboxBatch(limit?: number): Promise<{
  claimed: number;
  processed: number;
  errors: number;
}> {
  const jobs = await claimSentinelAutomationJobs(limit);
  let processed = 0;
  let errors = 0;
  for (const job of jobs) {
    if (job.jobKind !== JOB_KIND) {
      await completeSentinelAutomationJob(job.id, { ok: false, error: `Unsupported job_kind: ${job.jobKind}` });
      errors += 1;
      continue;
    }
    try {
      await runAgent17SentinelSweepPlaceholder(job);
      await completeSentinelAutomationJob(job.id, { ok: true });
      processed += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await completeSentinelAutomationJob(job.id, { ok: false, error: msg });
      errors += 1;
    }
  }
  return { claimed: jobs.length, processed, errors };
}
