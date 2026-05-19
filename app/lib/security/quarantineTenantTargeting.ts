import "server-only";

import prisma from "@/lib/prisma";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";

function normLedgerKey(raw: string): string {
  return raw.trim().toLowerCase();
}

function parseIpUserFromLedgerKey(identifier: string): { ip: string | null; userId: string | null } {
  const id = normLedgerKey(identifier);
  if (id.startsWith("ip:")) return { ip: id.slice(3), userId: null };
  if (id.startsWith("user:")) return { ip: null, userId: id.slice(5) };
  return { ip: null, userId: null };
}

function modeTenantUuid(candidates: string[]): string | null {
  if (candidates.length === 0) return null;
  const counts = new Map<string, number>();
  for (const c of candidates) {
    const u = c.trim().toLowerCase();
    if (!u) continue;
    counts.set(u, (counts.get(u) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [u, n] of counts) {
    if (n > bestN) {
      bestN = n;
      best = u;
    }
  }
  return best;
}

/**
 * Agent 6 (Ironlock): infer primary tenant victim from the last five AuditLog rows mentioning this ledger key,
 * then IronguardViolation metadata (rolling window).
 */
export async function resolvePrimaryTenantTargetUuidForLedgerKey(identifier: string): Promise<string | null> {
  const id = normLedgerKey(identifier);
  const fromAudit = await prisma.auditLog.findMany({
    where: { justification: { contains: id, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { governance_tenant_uuid: true, tenantId: true },
  });
  const auditUuids: string[] = [];
  for (const row of fromAudit) {
    const g = row.governance_tenant_uuid?.trim();
    if (g) auditUuids.push(g);
    else if (row.tenantId?.trim()) auditUuids.push(row.tenantId.trim());
  }
  const fromAuditMode = modeTenantUuid(auditUuids);
  if (fromAuditMode) return fromAuditMode;

  const { ip, userId } = parseIpUserFromLedgerKey(id);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const violations = await prisma.ironguardViolation.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 800,
    select: { metadata: true, attemptedTenantUuid: true, sessionTenantUuid: true },
  });
  const violUuids: string[] = [];
  for (const v of violations) {
    const m = v.metadata as Record<string, unknown> | null;
    const mIp = typeof m?.clientIp === "string" ? m.clientIp.trim().toLowerCase() : "";
    const mUid = typeof m?.userId === "string" ? m.userId.trim().toLowerCase() : "";
    const matchIp = ip && mIp === ip;
    const matchUser = userId && mUid === userId;
    if (!matchIp && !matchUser) continue;
    const target = v.attemptedTenantUuid?.trim() || v.sessionTenantUuid?.trim();
    if (target) violUuids.push(target);
    if (violUuids.length >= 5) break;
  }
  return modeTenantUuid(violUuids);
}

export async function syncQuarantineLedgerPrimaryTarget(identifier: string): Promise<string | null> {
  const id = normLedgerKey(identifier);
  const primary = await resolvePrimaryTenantTargetUuidForLedgerKey(id);
  await prisma.quarantineLedger.updateMany({
    where: { identifier: id },
    data: { primaryTargetTenantUuid: primary },
  });
  return primary;
}

export async function applyIronlockHardBanTargetedSiege(params: {
  identifier: string;
  primaryTargetTenantUuid: string | null;
}): Promise<void> {
  const tid = params.primaryTargetTenantUuid?.trim();
  if (!tid) return;
  await prisma.tenant.update({
    where: { id: tid },
    data: { isUnderTargetedSiege: true },
  });
  await auditLogCreateLoose({
    data: {
      action: "LEDGER_HARD_BAN_TENANT_SIEGE",
      justification: JSON.stringify({
        identifier: normLedgerKey(params.identifier),
        primaryTargetTenantUuid: tid,
        message: "Ironlock: hard ban correlated to tenant — is_under_targeted_siege armed.",
      }),
      operatorId: "IRONLOCK_AGENT_6",
      threatId: null,
      isSimulation: false,
      governance_tenant_uuid: tid,
    },
  });
}

export async function markTenantChaosForensicHardeningComplete(tenantId: string): Promise<void> {
  const tid = tenantId.trim();
  if (!tid) return;
  await prisma.tenant.update({
    where: { id: tid },
    data: {
      lastChaosForensicHardeningAt: new Date(),
    },
  });
  await reconcileTenantTargetedSiegeFlag(tenantId);
}

const SIEGED_ACTIVITY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Under siege when at least one hard-ban ledger row targets this tenant with recent activity,
 * and chaos forensic hardening has not cleared adversarial pressure since the latest strike.
 */
export async function reconcileTenantTargetedSiegeFlag(tenantId: string): Promise<boolean> {
  const tid = tenantId.trim();
  if (!tid) return false;
  const since = new Date(Date.now() - SIEGED_ACTIVITY_MS);
  const tenant = await prisma.tenant.findUnique({
    where: { id: tid },
    select: { lastChaosForensicHardeningAt: true },
  });
  const ledgers = await prisma.quarantineLedger.findMany({
    where: {
      isHardBan: true,
      primaryTargetTenantUuid: tid,
      lastViolationAt: { gte: since },
    },
    select: { lastViolationAt: true },
  });
  let maxViolationMs = 0;
  for (const l of ledgers) {
    maxViolationMs = Math.max(maxViolationMs, l.lastViolationAt.getTime());
  }
  const chaosAt = tenant?.lastChaosForensicHardeningAt?.getTime() ?? 0;
  const chaosSuppressesSiegeUi = chaosAt > 0 && chaosAt >= maxViolationMs && ledgers.length > 0;
  const sieged = ledgers.length > 0 && !chaosSuppressesSiegeUi;
  await prisma.tenant.update({
    where: { id: tid },
    data: { isUnderTargetedSiege: sieged },
  });
  return sieged;
}
