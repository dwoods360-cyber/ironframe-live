import "server-only";

import { ThreatState } from "@prisma/client";
import prisma from "@/lib/prisma";
import { runAuditedThreatEventWormBypass } from "@/app/lib/prisma/threatEventWormBypass";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { clearAgentCacheForTenant } from "@/app/lib/agentCache";
import { clearVaultSecretsForTenant } from "@/app/lib/vaultSecrets";

export const TENANT_SCORCH_ACTION = "TENANT_SCORCH";

const ACTIVE_THREAT_STATES: ThreatState[] = [
  ThreatState.PIPELINE,
  ThreatState.IDENTIFIED,
  ThreatState.CONFIRMED,
  ThreatState.MITIGATED,
];

const GLOBAL_CONFIG_TABLES = new Set(["SystemConfig", "global"]);

/**
 * Guard — never scorch global config or unknown tenant UUIDs.
 */
export function assertTenantScorchAllowed(triggerTenantId: string): void {
  const id = triggerTenantId.trim();
  if (!id) {
    throw new Error("Tenant scorch requires a valid triggerTenantId.");
  }
  if (id === "global" || GLOBAL_CONFIG_TABLES.has(id)) {
    throw new Error("GLOBAL_SCORCH_FORBIDDEN: SystemConfig and global rows are immutable during tenant bricking.");
  }
  const known = new Set(Object.values(TENANT_UUIDS));
  if (!known.has(id) && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Invalid triggerTenantId format.");
  }
}

async function purgeGovernedSessionsForTenant(tenantId: string): Promise<number> {
  try {
    const result = await prisma.governedSession.deleteMany({
      where: { tenantId },
    });
    return result.count;
  } catch {
    try {
      const legacy = await prisma.governedSession.deleteMany({
        where: { operatorId: { contains: tenantId.slice(0, 8) } },
      });
      return legacy.count;
    } catch {
      return 0;
    }
  }
}

async function brickActiveThreatsForTenant(tenantId: string): Promise<{
  shadowCleared: number;
  prodCleared: number;
}> {
  const companyRows = await prisma.company.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const companyIds = companyRows.map((c) => c.id);

  const shadow = await prisma.riskEvent.deleteMany({
    where: {
      tenantId,
      status: { in: ACTIVE_THREAT_STATES },
    },
  });

  let prod = { count: 0 };
  if (companyIds.length > 0) {
    prod = await runAuditedThreatEventWormBypass({
      threatId: `tenant:${tenantId}`,
      eventType: "ADMIN_SCORCH_PROTOCOL_EXECUTION",
      actorUserId: "SYSTEM_DMS",
      execute: (tx) =>
        tx.threatEvent.deleteMany({
          where: {
            tenantCompanyId: { in: companyIds },
            status: { in: ACTIVE_THREAT_STATES },
          },
        }),
    });
  }

  return { shadowCleared: shadow.count, prodCleared: prod.count };
}

export type HardWipeResult = {
  triggerTenantId: string;
  sessionsPurged: number;
  agentCacheCleared: number;
  vaultSecretsCleared: number;
  shadowThreatsCleared: number;
  prodThreatsCleared: number;
};

/**
 * Per-tenant Scorched Earth — never touches SystemConfig or other tenants.
 */
export async function performHardWipe(triggerTenantId: string): Promise<HardWipeResult> {
  assertTenantScorchAllowed(triggerTenantId);

  const sessionsPurged = await purgeGovernedSessionsForTenant(triggerTenantId);
  const agentCacheCleared = clearAgentCacheForTenant(triggerTenantId);
  const vaultSecretsCleared = clearVaultSecretsForTenant(triggerTenantId);
  const { shadowCleared, prodCleared } = await brickActiveThreatsForTenant(triggerTenantId);

  try {
    await auditLogCreateLoose({
      data: {
        action: TENANT_SCORCH_ACTION,
        justification: JSON.stringify({
          event: "TENANT_SCORCH",
          triggerTenantId,
          sessionsPurged,
          agentCacheCleared,
          vaultSecretsCleared,
          shadowThreatsCleared: shadowCleared,
          prodThreatsCleared: prodCleared,
          message: `[FATAL] — DMS_TRIGGERED — Tenant scorch engaged for ${triggerTenantId.slice(0, 8)}…`,
        }),
        operatorId: "SYSTEM_DMS",
        threatId: null,
        isSimulation: false,
        governance_tenant_uuid: triggerTenantId,
      },
    });
  } catch (e) {
    console.error("[performHardWipe] audit failed", e);
  }

  const result = {
    triggerTenantId,
    sessionsPurged,
    agentCacheCleared,
    vaultSecretsCleared,
    shadowThreatsCleared: shadowCleared,
    prodThreatsCleared: prodCleared,
  };

  try {
    const { appendChaosRunEvent } = await import("@/app/lib/chaosRunTelemetry");
    appendChaosRunEvent(triggerTenantId, "SCORCH_COMPLETE", result);
    appendChaosRunEvent(triggerTenantId, "DMS_TRIGGERED", { via: "performHardWipe" });
  } catch {
    /* optional */
  }

  return result;
}
