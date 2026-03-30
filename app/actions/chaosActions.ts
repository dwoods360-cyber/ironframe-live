"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { recordResilienceIntelStreamLine } from "@/app/actions/resilienceIntelStreamActions";
import { executeWithRetry } from "@/app/utils/irontechResilience";
import { logIronwatch } from "@/app/utils/ironwatchLog";
import { IRONCHAOS_INTEL_STREAM_LINE } from "@/app/utils/dmzIngressRealtime";

const GLOBAL_ID = "global";
/** AgentOperation row for Irontech resilience (must match executeWithRetry). */
const IRONTECH_CHAOS_AGENT = "Irontech";

export async function getChaosConfig() {
  return prisma.chaosConfig.upsert({
    where: { id: GLOBAL_ID },
    create: {
      id: GLOBAL_ID,
      isActive: false,
      failureRate: 0.35,
    },
    update: {},
  });
}

export async function setIronchaosActive(isActive: boolean) {
  await prisma.chaosConfig.upsert({
    where: { id: GLOBAL_ID },
    create: {
      id: GLOBAL_ID,
      isActive,
      failureRate: 0.35,
    },
    update: { isActive },
  });
  revalidatePath("/");
  return { success: true as const, isActive };
}

/**
 * Active chaos drill: creates a poisoned ThreatEvent, runs full Retry-3 + Phone Home via Irontech.
 * Metadata: `ingestionDetails.isChaosTest` + `chaosIngressId`.
 */
export async function injectChaosThreatAction(): Promise<
  | { ok: true; threatId: string; tenantCompanyId: string }
  | { ok: false; error: string }
> {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) {
    return { ok: false, error: "No active tenant." };
  }

  try {
    let company = await prisma.company.findFirst({
      where: { tenantId },
    });

    if (!company) {
      await prisma.tenant.upsert({
        where: { id: tenantId },
        create: {
          id: tenantId,
          name: "Ironchaos Bootstrap Tenant",
          slug: `chaos-${tenantId}`,
          industry: "Secure Enclave",
        },
        update: {},
      });
      company = await prisma.company.create({
        data: {
          name: "Chaos Lab Co",
          sector: "Technology",
          tenantId,
          isTestRecord: true,
        },
      });
    }

    const chaosIngressId = crypto.randomUUID();
    const mockPayload = {
      isChaosTest: true,
      chaosIngressId,
      vector: "CHAOS_POISON",
      injectedAt: new Date().toISOString(),
      note: "Irontech resilience drill — forced CHAOS_INTERRUPTED ×3",
    };

    const threat = await prisma.threatEvent.create({
      data: {
        tenantCompanyId: company.id,
        status: ThreatState.PIPELINE,
        sourceAgent: "IRONCHAOS",
        score: 10,
        title: "Poisoned Chaos Threat — Irontech resilience drill",
        targetEntity: "ChaosLab",
        financialRisk_cents: 0n,
        ttlSeconds: 259200,
        ingestionDetails: JSON.stringify(mockPayload),
        aiReport:
          "IRONCHAOS: Controlled chaos ingress. Monitoring Irontech Retry-3 and Phone Home.",
      },
    });

    console.log(IRONCHAOS_INTEL_STREAM_LINE);
    await recordResilienceIntelStreamLine(IRONCHAOS_INTEL_STREAM_LINE, threat.id);

    revalidatePath("/");
    revalidatePath("/admin/clearance");

    const threatId = threat.id;
    after(async () => {
      try {
        await executeWithRetry(IRONTECH_CHAOS_AGENT, threatId, async () => {
          // Mitigation hook — chaos-test threats never reach success in the first 3 attempts.
        });
        await logIronwatch({
          event_type: "IRONCHAOS_DRILL_COMPLETE",
          actor_id: tenantId,
          detail: JSON.stringify({ threatId, chaosIngressId }),
          severity: "INFO",
        });
      } catch (loopErr) {
        const detail = loopErr instanceof Error ? loopErr.message : String(loopErr);
        await logIronwatch({
          event_type: "IRONCHAOS_DRILL_FAILED",
          actor_id: tenantId,
          detail,
          severity: "ERROR",
        });
      }
    });

    return { ok: true, threatId, tenantCompanyId: company.id.toString() };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logIronwatch({
      event_type: "IRONCHAOS_DRILL_FAILED",
      actor_id: tenantId,
      detail: message,
      severity: "ERROR",
    });
    return { ok: false, error: message };
  }
}
