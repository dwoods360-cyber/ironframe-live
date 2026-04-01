"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { resolveIntegrityLedgerAuthorizedLabel } from "@/app/utils/serverAuth";
import type { ChaosClientAttribution } from "@/app/utils/chaosClientAttribution";
import {
  resumeIsolatedRemoteSupportDrill,
  runIsolatedCascadeDrill,
  runIsolatedEscalationDrill,
  runIsolatedHomeServerDrill,
  runIsolatedInternalDrill,
  runIsolatedRemoteSupportDrill,
  type IntegrityForensicAttribution,
} from "@/app/utils/irontechResilience";

/** Human-triggered chaos: prefer client-captured Supabase / cookie id; else same-request server session. */
async function resolveChaosInjectAttribution(
  client: ChaosClientAttribution | null | undefined,
): Promise<IntegrityForensicAttribution> {
  if (client?.userId?.trim()) {
    const uid = client.userId.trim();
    return {
      userId: uid,
      displayName: client.displayName?.trim() || uid,
    };
  }
  return resolveIntegrityLedgerAuthorizedLabel();
}

const GLOBAL_ID = "global";
export type ChaosScenario =
  | "INTERNAL"
  | "HOME_SERVER"
  | "REMOTE_SUPPORT"
  | "CASCADING_FAILURE"
  | "CLOUD_EXFIL";

function normalizeScenario(scenario: ChaosScenario): ChaosScenario {
  if (
    scenario === "INTERNAL" ||
    scenario === "HOME_SERVER" ||
    scenario === "REMOTE_SUPPORT" ||
    scenario === "CASCADING_FAILURE" ||
    scenario === "CLOUD_EXFIL"
  ) {
    return scenario;
  }
  return "INTERNAL";
}

/** GRC panel reads `ingestionDetails.grcJustification` (no top-level `justification` on ThreatEvent). */
function chaosDrillGrcJustificationForScenario(scenario: ChaosScenario): string {
  if (scenario === "HOME_SERVER") {
    return "SYSTEM TEST: Home Server Chaos Drill. Validating Irontech multi-attempt remote recovery.";
  }
  if (scenario === "CLOUD_EXFIL") {
    return "SYSTEM TEST: Cloud Exfiltration Drill. Validating Ironlock hard quarantine and escalation.";
  }
  if (scenario === "REMOTE_SUPPORT") {
    return "SYSTEM TEST: Remote Support Drill. Validating secure diagnostic tunnel hand-off for complex internal faults.";
  }
  if (scenario === "CASCADING_FAILURE") {
    return "SYSTEM TEST: Cascading Failure Drill. Validating Irongate lockdown and Ironcast mass alerting.";
  }
  return "SYSTEM TEST: Internal Chaos Drill. Validating Irontech autonomous recovery.";
}

/** Birth-only: shared DB row for all chaos scenarios (ACTIVE threat + scenario metadata). */
async function createChaosThreatBase(
  tenantCompanyId: bigint,
  scenario: ChaosScenario,
) {
  const scenarioNorm = normalizeScenario(scenario);
  const ingestionDetails = JSON.stringify({
    isChaosTest: true,
    chaosScenario: scenarioNorm,
    grcJustification: chaosDrillGrcJustificationForScenario(scenarioNorm),
  });

  return prisma.threatEvent.create({
    data: {
      tenantCompanyId,
      status: ThreatState.ACTIVE,
      sourceAgent: "IRONCHAOS",
      score: 10,
      title: "Poisoned Chaos Threat — Irontech resilience drill",
      targetEntity: "ChaosLab",
      financialRisk_cents: 0n,
      ttlSeconds: 259200,
      /** Canonical assignee for accessible lower-severity matrix; must match UI check in ActiveRisksClient. */
      assigneeId: "user_00",
      ingestionDetails,
      aiReport: "IRONCHAOS: Controlled chaos ingress.",
    },
  });
}

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

export async function injectChaosThreatAction(
  scenario: ChaosScenario = "INTERNAL",
  clientAttribution?: ChaosClientAttribution | null,
): Promise<
  | { ok: true; threatId: string; tenantCompanyId: string }
  | { ok: false; error: string }
> {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) {
    return { ok: false, error: "No active tenant." };
  }

  const scenarioNorm = normalizeScenario(scenario);

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

    let threat;
    try {
      threat = await createChaosThreatBase(company.id, scenarioNorm);
    } catch (error) {
      console.error("CREATE THREAT FAILED:", error);
      console.error("GRC PERSISTENCE ERROR:", error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    const threatId = threat.id;
    const ledgerAttribution = await resolveChaosInjectAttribution(clientAttribution);

    let drillResult;
    if (scenarioNorm === "INTERNAL") {
      drillResult = await runIsolatedInternalDrill(threatId, ledgerAttribution);
    } else if (scenarioNorm === "HOME_SERVER") {
      drillResult = await runIsolatedHomeServerDrill(threatId, ledgerAttribution);
    } else if (scenarioNorm === "CLOUD_EXFIL") {
      drillResult = await runIsolatedEscalationDrill(threatId, ledgerAttribution);
    } else if (scenarioNorm === "REMOTE_SUPPORT") {
      drillResult = await runIsolatedRemoteSupportDrill(threatId, ledgerAttribution);
    } else if (scenarioNorm === "CASCADING_FAILURE") {
      drillResult = await runIsolatedCascadeDrill(threatId, ledgerAttribution);
    } else {
      drillResult = await runIsolatedInternalDrill(threatId, ledgerAttribution);
    }

    if (!drillResult.success) {
      return { ok: false, error: drillResult.error };
    }

    revalidatePath("/", "layout");
    revalidatePath("/admin/clearance");
    revalidatePath("/integrity");

    return { ok: true, threatId, tenantCompanyId: company.id.toString() };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/** Scenario 4 JIT gate — user grants diagnostic access; resumes drill and resolves after simulated engineer window. */
export async function grantRemoteAccessAction(
  threatId: string,
  clientAttribution?: ChaosClientAttribution | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = threatId?.trim();
  if (!id) {
    return { ok: false, error: "Missing threat id." };
  }

  const row = await prisma.threatEvent.findUnique({
    where: { id },
    select: { status: true, ingestionDetails: true },
  });
  if (!row) {
    return { ok: false, error: "Threat not found." };
  }
  if (row.status !== ThreatState.PENDING_REMOTE_INTERVENTION) {
    return { ok: false, error: "Threat is not awaiting remote authorization." };
  }

  let chaosScenario: string | null = null;
  try {
    const parsed = JSON.parse(row.ingestionDetails ?? "{}") as { chaosScenario?: unknown };
    const v =
      typeof parsed.chaosScenario === "string" ? parsed.chaosScenario.trim().toUpperCase() : "";
    chaosScenario = v || null;
  } catch {
    chaosScenario = null;
  }
  if (chaosScenario !== "REMOTE_SUPPORT") {
    return {
      ok: false,
      error: "Only Scenario 4 (Remote Support) chaos drills use this grant action.",
    };
  }

  console.log(
    "[S4] User granted JIT access — human engineer on Sidecar; hotfix + forensic probe teardown…",
  );
  try {
    const ledgerAttribution = await resolveChaosInjectAttribution(clientAttribution);
    const resumeResult = await resumeIsolatedRemoteSupportDrill(id, ledgerAttribution);
    if (!resumeResult.success) {
      return { ok: false, error: resumeResult.error };
    }
    revalidatePath("/", "layout");
    revalidatePath("/integrity");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[S4] grantRemoteAccessAction failed:", e);
    return { ok: false, error: message };
  }
}
