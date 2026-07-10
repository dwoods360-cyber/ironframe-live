import "server-only";

import type { Prisma } from "@prisma/client";
import { buildWormAuditedBypassLabel } from "@/app/lib/evidence/threatEventWormGuardPolicy";
import { runWithThreatEventWormBypassScope } from "@/app/lib/evidence/threatEventWormGuardScope.server";
import prisma from "@/lib/prisma";

export type AuditedThreatEventWormBypassRequest<T> = {
  threatId: string;
  eventType: string;
  actorUserId?: string;
  detail?: string;
  existingTx?: Prisma.TransactionClient;
  execute: (tx: Prisma.TransactionClient) => Promise<T>;
};

/** Transaction-scoped Postgres + Prisma bypass for seed scripts and controlled maintenance. */
export async function withThreatEventWormBypass<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return runWithThreatEventWormBypassScope(async () =>
    prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.worm_threat_event_bypass', '1', true)`;
      return fn(tx);
    }),
  );
}

async function runAuditedThreatEventWormBypassCore<T>(
  auditLabel: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  existingTx?: Prisma.TransactionClient,
): Promise<T> {
  const invoke = (tx: Prisma.TransactionClient) => {
    console.info(auditLabel);
    return fn(tx);
  };

  if (existingTx) {
    return runWithThreatEventWormBypassScope(async () => {
      await existingTx.$executeRaw`SELECT set_config('app.worm_threat_event_bypass', '1', true)`;
      return invoke(existingTx);
    });
  }

  return withThreatEventWormBypass(invoke);
}

/**
 * Opens a tightly scoped, audited WORM bypass for legitimate ThreatEvent lifecycle writes.
 * Direct unwrapped `threatEvent.update*` calls continue to throw under enforcement.
 */
export async function runAuditedThreatEventWormBypass<T>(
  request: AuditedThreatEventWormBypassRequest<T>,
): Promise<T>;
export async function runAuditedThreatEventWormBypass<T>(
  auditLabel: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  existingTx?: Prisma.TransactionClient,
): Promise<T>;
export async function runAuditedThreatEventWormBypass<T>(
  labelOrRequest: string | AuditedThreatEventWormBypassRequest<T>,
  fn?: (tx: Prisma.TransactionClient) => Promise<T>,
  existingTx?: Prisma.TransactionClient,
): Promise<T> {
  if (typeof labelOrRequest === "object") {
    const request = labelOrRequest;
    const detail =
      request.detail ??
      (request.actorUserId ? `actor=${request.actorUserId}` : undefined);
    const auditLabel = buildWormAuditedBypassLabel(
      request.threatId,
      request.eventType,
      detail,
    );
    return runAuditedThreatEventWormBypassCore(auditLabel, request.execute, request.existingTx);
  }
  return runAuditedThreatEventWormBypassCore(labelOrRequest, fn!, existingTx);
}
