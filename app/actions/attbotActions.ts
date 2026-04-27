"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ingressGateway } from "@/app/lib/security/ingressGateway";
import { ATTACK_SOURCE, ATTACK_THREAT_TITLE_PREFIX } from "@/app/config/agents";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { ThreatState } from "@prisma/client";
import { logIronwatch } from "@/app/utils/ironwatchLog";
import {
  effectiveVulnerabilityForPhishSuccess,
  evaluatePhishbotHookSucceeded,
} from "@/lib/simulation/phishbotAttackModel";
import { calculateOutOfPocketExposure } from "@/lib/reporting/riskMetrics";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { clearSimulationStandDown } from "@/app/lib/simulationStandDown";
import {
  findThreatIntelById,
  industryDisplayFromThreatEnum,
  threatImpactToLossM,
  type StrategicThreatRoute,
} from "@/lib/simulation/threatLibrary";
import { transitionThreatStatus } from "@/src/services/threatStateService";

export type StrategicIntelLureType = "FINANCIAL" | "CREDENTIAL" | "MALWARE";

function attbotDevLog(message: string, extra?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  if (extra) {
    console.info(`[ATTBOT] ${message}`, extra);
  } else {
    console.info(`[ATTBOT] ${message}`);
  }
}

/** Log-only: masks user:password@ in postgres URLs (Supabase-safe). */
function maskDatabaseUrlForLog(raw: string | undefined): string {
  if (raw == null || raw.trim() === "") return "(not set)";
  return raw.replace(/:\/\/([^:/?#]+):([^@/?#]+)@/, "://$1:****@");
}

const CENTS_PER_MILLION = 100_000_000;

type SyntheticTarget = {
  id: string;
  name: string;
  email: string;
  role: string;
  clearanceLevel: number;
  vulnerabilityScore: number;
  isHardened: boolean;
  monetaryValue: bigint;
};

type SimulatorProfile = "ATTBOT" | "PHISHBOT" | "INFILBOT";

async function selectSyntheticTarget(profile: SimulatorProfile): Promise<SyntheticTarget | null> {
  if (profile === "PHISHBOT") {
    return prisma.syntheticEmployee.findFirst({
      orderBy: { vulnerabilityScore: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        clearanceLevel: true,
        vulnerabilityScore: true,
        isHardened: true,
        monetaryValue: true,
      },
    });
  }
  if (profile === "INFILBOT") {
    return prisma.syntheticEmployee.findFirst({
      where: { clearanceLevel: { gte: 3 } },
      orderBy: [{ clearanceLevel: "desc" }, { vulnerabilityScore: "desc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        clearanceLevel: true,
        vulnerabilityScore: true,
        isHardened: true,
        monetaryValue: true,
      },
    });
  }
  return prisma.syntheticEmployee.findFirst({
    orderBy: [{ vulnerabilityScore: "desc" }, { clearanceLevel: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      clearanceLevel: true,
      vulnerabilityScore: true,
      isHardened: true,
      monetaryValue: true,
    },
  });
}

async function applyHeistRetentionForSuccessfulPhish(opts: {
  target: SyntheticTarget;
}): Promise<{
  breachLossCents: bigint;
  deductibleCents: bigint;
  insuranceRecoveryCents: bigint;
}> {
  const breachLossCents = opts.target.monetaryValue / 5n;
  const deductible = calculateOutOfPocketExposure(breachLossCents);
  let deductibleCents = deductible.outOfPocketExposureCents;
  if (deductibleCents > breachLossCents) deductibleCents = breachLossCents;
  const insuranceRecoveryCents =
    breachLossCents > deductibleCents ? breachLossCents - deductibleCents : 0n;

  await prisma.$transaction(async (tx) => {
    const medshield = await tx.tenant.findUnique({
      where: { id: TENANT_UUIDS.medshield },
      select: { ale_baseline: true },
    });
    const appliedDeductible =
      medshield == null
        ? 0n
        : medshield.ale_baseline >= deductibleCents
          ? deductibleCents
          : medshield.ale_baseline;
    if (medshield != null && appliedDeductible > 0n) {
      await tx.tenant.update({
        where: { id: TENANT_UUIDS.medshield },
        data: { ale_baseline: medshield.ale_baseline - appliedDeductible },
      });
    }

    await tx.syntheticEmployee.update({
      where: { id: opts.target.id },
      data: {
        lastAttackedAt: new Date(),
        totalLossIncurred: { increment: deductibleCents },
      },
    });
  });

  return {
    breachLossCents,
    deductibleCents,
    insuranceRecoveryCents,
  };
}

function lossMillionsToCents(m: number): bigint {
  return BigInt(Math.round(Math.max(0, m) * Number(CENTS_PER_MILLION)));
}

function ironsightStrategicAssets(industry: string): string[] {
  switch (industry) {
    case "Finance":
      return ["Treasury wire gateway", "SWIFT correlate DB", "Customer MFA broker"];
    case "Technology":
      return ["CI release orchestrator", "Secrets vault tier", "Customer data plane"];
    case "Defense":
      return ["Program collaboration island", "Cross-domain guard", "PKI subordinate CA"];
    case "Energy":
      return ["OT historian cluster", "EMS remote session GW", "Vendor jump tier"];
    default:
      return ["EHR continuity cluster", "Imaging archive", "Clinical IdP"];
  }
}

function ironsightStrategicTags(industry: string): string[] {
  switch (industry) {
    case "Finance":
      return ["FFIEC", "SOX ITGC", "PCI-DSS"];
    case "Technology":
      return ["SOC 2", "ISO 27001", "CSA CCM"];
    case "Defense":
      return ["CMMC", "DFARS", "NIST 800-171"];
    case "Energy":
      return ["NERC CIP", "IEC 62443", "TSA cyber"];
    default:
      return ["HIPAA", "HITECH", "OCR"];
  }
}

function buildStrategicIronsightAiTrace(opts: { industry: string; displayTitle: string }) {
  const { industry, displayTitle } = opts;
  const report = [
    `IRONSIGHT (Agent 03) synthetic blast-radius drill for ${industry}: ${displayTitle}.`,
    `Dependency mapping shows pressure on tier-0 recovery, identity brokers, and privileged break-glass paths used during crisis response.`,
    `Containment checklist: isolate backup control plane interfaces, force privileged session review, and open an incident bridge before broad restore.`,
    `Strategic Intel simulation only — no automated enforcement was taken.`,
  ].join(" ");

  return {
    status: "COMPLETED" as const,
    report,
    actions: [
      { label: "SEGMENT BACKUP CONTROL PLANE", actionId: "iron-bak-1" },
      { label: "FORCE PRIV SESSION REVIEW", actionId: "iron-priv-1" },
    ],
    impactedAssets: ironsightStrategicAssets(industry),
    complianceTags: ironsightStrategicTags(industry),
    generatedAt: new Date().toISOString(),
  };
}

async function resolveActiveTenantCompany(): Promise<
  { ok: true; tenantId: string; company: { id: bigint } } | { ok: false; error: string }
> {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) return { ok: false, error: "No active tenant." };
  const company = await prisma.company.findFirst({ where: { tenantId }, select: { id: true } });
  if (!company) return { ok: false, error: "No tenant company for simulation." };
  return { ok: true, tenantId, company };
}

/** Resolve open simulator rows for this bot so toggling OFF drops SIM_ACTIVE in Shadow Plane inventory. */
export async function clearShadowSimulatorPipeline(
  sourceAgent: "INFILBOT_SIMULATION" | "PHISHBOT_SIMULATION",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await resolveActiveTenantCompany();
  if (!ctx.ok) return ctx;
  const { company } = ctx;
  try {
    const prodRows = await prisma.threatEvent.findMany({
      where: {
        tenantCompanyId: company.id,
        sourceAgent,
        status: { not: ThreatState.RESOLVED },
      },
      select: { id: true, resolutionApprovalId: true },
    });
    for (const row of prodRows) {
      await transitionThreatStatus({
        threatId: row.id,
        newStatus: ThreatState.RESOLVED,
        approvalId: row.resolutionApprovalId,
        actorUserId: "system-attbot",
        eventType: "SHADOW_SIMULATOR_CLEAR",
      });
    }
    await prisma.simThreatEvent.updateMany({
        where: {
          tenantCompanyId: company.id,
          sourceAgent,
          status: { not: ThreatState.RESOLVED },
        },
        data: { status: ThreatState.RESOLVED },
      });
    revalidatePath("/integrity");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Serializable card for `useRiskStore.getState().upsertPipelineThreat` (matches `PipelineThreat` shape). */
export type AttbotPipelineThreatPayload = {
  id: string;
  name: string;
  loss: number;
  score: number;
  industry?: string;
  source?: string;
  description?: string;
  createdAt?: string;
  threatStatus?: string;
  lifecycleState?: "pipeline" | "active" | "confirmed" | "resolved";
};

export type TriggerAttbotSimulationResult =
  | { ok: true; pipelineThreat: AttbotPipelineThreatPayload }
  | { ok: false; error: string };

export type LaunchStrategicIntelDrillInput = {
  route?: StrategicThreatRoute;
  displayTitle?: string;
  estimatedLossM?: number;
  selectedIndustry?: string;
  lureType?: StrategicIntelLureType;
  citationSource?: string;
};

/**
 * Immediate ThreatEvent row + finalize after company resolution so the client can `upsertPipelineThreat`
 * without waiting for the polling interval.
 */
export async function triggerAttbotSimulation(): Promise<TriggerAttbotSimulationResult> {
  const store = await cookies();
  const cookieRaw = store.get("ironframe-tenant")?.value ?? null;
  const tenantId = await getActiveTenantUuidFromCookies();

  if (!tenantId) {
    attbotDevLog("resolved tenantId is falsy", {
      cookieRaw,
      cookieEmpty: cookieRaw == null || cookieRaw.trim() === "",
    });
    await logIronwatch({
      event_type: "ATTBOT_NO_TENANT",
      actor_id: "unknown",
      detail: "No active tenant cookie / UUID.",
      severity: "ERROR",
    });
    return { ok: false, error: "No active tenant." };
  }

  attbotDevLog("tenant resolution", {
    cookieRaw: cookieRaw ?? "(missing)",
    cookieEmpty: cookieRaw == null || cookieRaw.trim() === "",
    resolvedTenantId: tenantId,
  });

  await clearSimulationStandDown(tenantId);

  try {
    attbotDevLog("DATABASE_URL (masked)", {
      url: maskDatabaseUrlForLog(process.env.DATABASE_URL),
    });

    let company = await prisma.company.findFirst({
      where: { tenantId },
    });
    let bootstrapCompany = false;

    if (!company) {
      await prisma.tenant.upsert({
        where: { id: tenantId },
        create: {
          id: tenantId,
          name: "ATTBOT Bootstrap Tenant",
          slug: `attbot-${tenantId}`,
          industry: "Secure Enclave",
        },
        update: {},
      });
      company = await prisma.company.create({
        data: {
          name: "Internal Test Co",
          sector: "Technology",
          tenantId,
          isTestRecord: true,
        },
      });
      bootstrapCompany = true;
      await logIronwatch({
        event_type: "ATTBOT_COMPANY_BOOTSTRAP",
        actor_id: tenantId,
        detail: `Created fallback Company id=${company.id.toString()} isTestRecord=true`,
        severity: "WARN",
      });
    }

    attbotDevLog("using company", {
      tenantCompanyId: company.id.toString(),
      bootstrapCompany,
    });

    const target = await selectSyntheticTarget("ATTBOT");
    if (!target) {
      return { ok: false, error: "No synthetic targets available. Seed SyntheticEmployee first." };
    }

    const draft = await ingressGateway.writeThreatEvent({
      tenantCompanyId: company.id,
      status: ThreatState.PIPELINE,
      sourceAgent: ATTACK_SOURCE,
      score: 10,
      title: `${ATTACK_THREAT_TITLE_PREFIX} Initializing…`,
      targetEntity: target.email,
      financialRisk_cents: 0n,
      ttlSeconds: 259200,
      ingestionDetails: JSON.stringify({
        phase: "INGESTING",
        vector: "SIMULATED_ATTACK_CHAIN",
        category: "SIMULATION",
        simulator: "ATTBOT",
        syntheticEmployeeId: target.id,
        syntheticEmployeeEmail: target.email,
        syntheticEmployeeRole: target.role,
        noRealWorldActions: true,
      }),
      aiReport: "ATTACK_BOT: Initializing simulation row…",
    });

    const mockPayload = {
      vector: "SQL_INJECTION",
      ip: "192.168.1.105",
      severity: "CRITICAL",
      target: target.email,
      targetType: "SYNTHETIC_EMPLOYEE",
      syntheticEmployeeId: target.id,
      syntheticEmployeeRole: target.role,
      syntheticClearanceLevel: target.clearanceLevel,
      syntheticVulnerabilityScore: target.vulnerabilityScore,
      category: "SIMULATION",
      noRealWorldActions: true,
      timestamp: new Date().toISOString(),
      raw_query:
        "SELECT * FROM users WHERE email = 'admin@ironframe.ai' OR 1=1--",
    };

    await ingressGateway.updateThreatEvent(draft.id, {
      title: `${ATTACK_THREAT_TITLE_PREFIX} Simulated exploit chain against ${target.name}.`,
      targetEntity: mockPayload.target,
      financialRisk_cents: 0n,
      ingestionDetails: JSON.stringify(mockPayload),
      aiReport:
        "Ironquery Initial Scan: Simulated hostile payload detected against synthetic target. No account lockout or real-world alerting should trigger.",
    });

    const final = await ingressGateway.findThreatEventByIdForBots(draft.id);
    if (!final) {
      return { ok: false, error: "Threat row missing after ATTBOT update." };
    }

    const pipelineThreat: AttbotPipelineThreatPayload = {
      id: final.id,
      name: final.title,
      loss: Number(final.financialRisk_cents) / CENTS_PER_MILLION,
      score: final.score,
      industry: final.targetEntity,
      source: final.sourceAgent,
      description: `Simulated SQLi · ${final.targetEntity}`,
      createdAt: final.createdAt.toISOString(),
      threatStatus: ThreatState.PIPELINE,
      lifecycleState: "pipeline",
    };

    await logIronwatch({
      event_type: "ATTBOT_SIMULATION_OK",
      actor_id: tenantId,
      detail: JSON.stringify({
        companyId: company.id.toString(),
        bootstrapCompany,
        threatId: final.id,
        syntheticEmployeeId: target.id,
        category: "SIMULATION",
        noRealWorldActions: true,
      }),
      severity: "INFO",
    });

    revalidatePath("/admin/clearance");
    revalidatePath("/admin/chat");

    return { ok: true, pipelineThreat };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logIronwatch({
      event_type: "ATTBOT_SIMULATION_FAILED",
      actor_id: tenantId,
      detail: JSON.stringify({
        error: message,
        databaseUrlMasked: maskDatabaseUrlForLog(process.env.DATABASE_URL),
      }),
      severity: "ERROR",
    });
    return { ok: false, error: message };
  }
}

export async function triggerPhishbotSimulation(): Promise<TriggerAttbotSimulationResult> {
  const ctx = await resolveActiveTenantCompany();
  if (!ctx.ok) return ctx;
  const { tenantId, company } = ctx;
  await clearSimulationStandDown(tenantId);
  const target = await selectSyntheticTarget("PHISHBOT");
  if (!target) return { ok: false, error: "No synthetic targets available. Seed SyntheticEmployee first." };

  const effectiveVulnerability = effectiveVulnerabilityForPhishSuccess(
    target.vulnerabilityScore,
    target.isHardened,
  );
  const phishSimTargetHooked = evaluatePhishbotHookSucceeded(effectiveVulnerability);

  const created = await ingressGateway.writeThreatEvent({
    tenantCompanyId: company.id,
    status: ThreatState.PIPELINE,
    sourceAgent: "PHISHBOT_SIMULATION",
    score: 7,
    title: `[PHISHBOT] Simulated phishing lure against ${target.name}.`,
    targetEntity: target.email,
    financialRisk_cents: 0n,
    ttlSeconds: 259200,
    ingestionDetails: JSON.stringify({
      category: "SIMULATION",
      simulator: "PHISHBOT",
      syntheticEmployeeId: target.id,
      syntheticEmployeeEmail: target.email,
      syntheticEmployeeRole: target.role,
      syntheticVulnerabilityScore: target.vulnerabilityScore,
      effectiveVulnerabilityForPhishSim: effectiveVulnerability,
      phishSimTargetHooked,
      vipIsHardened: target.isHardened,
      noRealWorldActions: true,
    }),
    aiReport:
      "PHISHBOT simulation executed on synthetic directory target. Real identities and lockout controls are excluded.",
  });

  await logIronwatch({
    event_type: "PHISHBOT_SIMULATION_OK",
    actor_id: tenantId,
    detail: JSON.stringify({
      threatId: created.id,
      syntheticEmployeeId: target.id,
      category: "SIMULATION",
      noRealWorldActions: true,
      phishSimTargetHooked,
      effectiveVulnerabilityForPhishSim: effectiveVulnerability,
    }),
    severity: "INFO",
  });

  if (phishSimTargetHooked) {
    const heist = await applyHeistRetentionForSuccessfulPhish({
      target,
    });
    await ingressGateway.updateThreatEvent(created.id, {
      financialRisk_cents: heist.breachLossCents,
      ingestionDetails: JSON.stringify({
        category: "SIMULATION",
        simulator: "PHISHBOT",
        syntheticEmployeeId: target.id,
        syntheticEmployeeEmail: target.email,
        syntheticEmployeeRole: target.role,
        syntheticVulnerabilityScore: target.vulnerabilityScore,
        effectiveVulnerabilityForPhishSim: effectiveVulnerability,
        phishSimTargetHooked,
        vipIsHardened: target.isHardened,
        simLossTag: "SIM_LOSS",
        insuranceRecoveryPending: true,
        outOfPocketExposureCents: heist.deductibleCents.toString(),
        insuranceRecoveryCents: heist.insuranceRecoveryCents.toString(),
        noRealWorldActions: true,
      }),
      aiReport:
        "PHISHBOT hook succeeded: deductible permanently retained from Medshield baseline; remaining loss flagged for insurance recovery.",
    });
  }

  revalidatePath("/integrity");

  return {
    ok: true,
    pipelineThreat: {
      id: created.id,
      name: created.title,
      loss: 0,
      score: created.score,
      industry: created.targetEntity,
      source: created.sourceAgent,
      description: `Simulated Phish · ${target.email}`,
      createdAt: new Date().toISOString(),
      threatStatus: ThreatState.PIPELINE,
      lifecycleState: "pipeline",
    },
  };
}

/**
 * Strategic Intel drill launcher: routes by threat profile — PhishBot (BEC / generic phish),
 * Ironsight blast-radius (synthetic completed trace), or Ironmap vendor dependency.
 */
export async function launchSimulatedAttack(
  input?: LaunchStrategicIntelDrillInput,
): Promise<TriggerAttbotSimulationResult> {
  const ctx = await resolveActiveTenantCompany();
  if (!ctx.ok) return ctx;
  const { tenantId, company } = ctx;
  await clearSimulationStandDown(tenantId);

  const route: StrategicThreatRoute = input?.route ?? "PHISH";
  const selectedIndustry = (input?.selectedIndustry ?? "Healthcare").trim() || "Healthcare";
  const estimatedLossM =
    typeof input?.estimatedLossM === "number" && Number.isFinite(input.estimatedLossM)
      ? Math.max(0, input.estimatedLossM)
      : 4.5;
  const displayTitleRaw = (input?.displayTitle ?? "").trim();
  const citationSource = (input?.citationSource ?? "").trim() || undefined;
  const intelLure = input?.lureType;

  if (route === "RANSOMWARE") {
    const displayTitle = displayTitleRaw || "Ransomware blast-radius event";
    const aiTrace = buildStrategicIronsightAiTrace({ industry: selectedIndustry, displayTitle });
    const lossCents = lossMillionsToCents(estimatedLossM);
    const created = await ingressGateway.writeThreatEvent({
      tenantCompanyId: company.id,
      status: ThreatState.PIPELINE,
      sourceAgent: "IRONSIGHT_SIMULATION",
      score: 9,
      title: `[IRONSIGHT · Agent 03] Blast-radius drill — ${displayTitle}`,
      targetEntity: selectedIndustry,
      financialRisk_cents: lossCents,
      ttlSeconds: 259200,
      ingestionDetails: JSON.stringify({
        category: "SIMULATION",
        simulator: "IRONSIGHT",
        trigger: "STRATEGIC_INTEL_TOP_SECTOR_THREAT",
        strategicIntelRoute: "RANSOMWARE",
        threatIntelCitation: citationSource ?? null,
        lureType: intelLure ?? null,
        aiTrace,
        noRealWorldActions: true,
      }),
      aiReport:
        "IRONSIGHT (Agent 03) Strategic Intel drill: synthetic blast-radius trace pre-materialized for GRC preview. No live containment executed.",
    });

    await logIronwatch({
      event_type: "STRATEGIC_INTEL_IRONSIGHT_OK",
      actor_id: tenantId,
      detail: JSON.stringify({
        threatId: created.id,
        category: "SIMULATION",
        strategicIntelRoute: "RANSOMWARE",
        displayTitle,
        noRealWorldActions: true,
      }),
      severity: "INFO",
    });

    revalidatePath("/integrity");
    revalidatePath("/");

    return {
      ok: true,
      pipelineThreat: {
        id: created.id,
        name: created.title,
        loss: estimatedLossM,
        score: created.score,
        industry: selectedIndustry,
        source: created.sourceAgent,
        description: `Strategic Intel · Ironsight · ${displayTitle}`,
        createdAt: new Date().toISOString(),
        threatStatus: ThreatState.PIPELINE,
        lifecycleState: "pipeline",
      },
    };
  }

  if (route === "SUPPLY_CHAIN") {
    const displayTitle = displayTitleRaw || "Supply-chain vendor drill";
    const lossCents = lossMillionsToCents(estimatedLossM);
    const created = await ingressGateway.writeThreatEvent({
      tenantCompanyId: company.id,
      status: ThreatState.PIPELINE,
      sourceAgent: "IRONMAP_SIMULATION",
      score: 8,
      title: `[IRONMAP · Agent 15] Vendor dependency drill — ${displayTitle}`,
      targetEntity: "NTH_PARTY_VENDOR_GRAPH",
      financialRisk_cents: lossCents,
      ttlSeconds: 259200,
      ingestionDetails: JSON.stringify({
        category: "SIMULATION",
        simulator: "IRONMAP",
        trigger: "STRATEGIC_INTEL_TOP_SECTOR_THREAT",
        strategicIntelRoute: "SUPPLY_CHAIN",
        threatIntelCitation: citationSource ?? null,
        lureType: intelLure ?? null,
        vendorContext: {
          tier: "NTH_PARTY",
          sector: selectedIndustry,
          narrative:
            "Transitive dependency / unsigned artifact path flagged for procurement and security joint review (simulation).",
        },
        noRealWorldActions: true,
      }),
      aiReport:
        "Ironmap (Agent 15) Strategic Intel drill: vendor graph risk synthesized for triage. No vendor outreach executed.",
    });

    await logIronwatch({
      event_type: "STRATEGIC_INTEL_IRONMAP_OK",
      actor_id: tenantId,
      detail: JSON.stringify({
        threatId: created.id,
        category: "SIMULATION",
        strategicIntelRoute: "SUPPLY_CHAIN",
        displayTitle,
        noRealWorldActions: true,
      }),
      severity: "INFO",
    });

    revalidatePath("/integrity");
    revalidatePath("/");

    return {
      ok: true,
      pipelineThreat: {
        id: created.id,
        name: created.title,
        loss: estimatedLossM,
        score: created.score,
        industry: selectedIndustry,
        source: created.sourceAgent,
        description: `Strategic Intel · Ironmap · ${displayTitle}`,
        createdAt: new Date().toISOString(),
        threatStatus: ThreatState.PIPELINE,
        lifecycleState: "pipeline",
      },
    };
  }

  const lureProfile: "FINANCIAL" | "CREDENTIAL" | "MALWARE" | "GENERIC" =
    route === "BEC" || intelLure === "FINANCIAL"
      ? "FINANCIAL"
      : intelLure === "CREDENTIAL"
        ? "CREDENTIAL"
        : intelLure === "MALWARE"
          ? "MALWARE"
          : "GENERIC";
  const financialLure = lureProfile === "FINANCIAL";
  const vipTargets = await prisma.syntheticEmployee.findMany({
    where: { clearanceLevel: 5 },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      clearanceLevel: true,
      vulnerabilityScore: true,
      isHardened: true,
      monetaryValue: true,
    },
  });
  const target =
    vipTargets.length > 0
      ? vipTargets[Math.floor(Math.random() * vipTargets.length)]
      : await selectSyntheticTarget("PHISHBOT");
  if (!target) return { ok: false, error: "No synthetic targets available. Seed SyntheticEmployee first." };

  const effectiveVulnerability = effectiveVulnerabilityForPhishSuccess(
    target.vulnerabilityScore,
    target.isHardened,
  );
  const phishSimTargetHooked = evaluatePhishbotHookSucceeded(effectiveVulnerability);

  const sectorLabel = displayTitleRaw;
  const title = financialLure
    ? `[STRATEGIC INTEL · PhishBot 10 · BEC] Financial lure — ${target.name}${sectorLabel ? ` (${sectorLabel})` : ""}`
    : sectorLabel
      ? `[STRATEGIC INTEL] ${sectorLabel} — ${target.name}`
      : `[STRATEGIC INTEL] Simulated sector drill against ${target.name}.`;

  const phishIngestionCore = {
    category: "SIMULATION",
    simulator: "PHISHBOT",
    trigger: "STRATEGIC_INTEL_TOP_SECTOR_THREAT",
    strategicIntelRoute: route,
    strategicIntelThreatLabel: sectorLabel || null,
    strategicIntelIndustry: selectedIndustry,
    threatIntelCitation: citationSource ?? null,
    lureProfile,
    syntheticEmployeeId: target.id,
    syntheticEmployeeEmail: target.email,
    syntheticEmployeeRole: target.role,
    syntheticVulnerabilityScore: target.vulnerabilityScore,
    effectiveVulnerabilityForPhishSim: effectiveVulnerability,
    phishSimTargetHooked,
    vipIsHardened: target.isHardened,
    noRealWorldActions: true,
  };

  const created = await ingressGateway.writeThreatEvent({
    tenantCompanyId: company.id,
    status: ThreatState.PIPELINE,
    sourceAgent: "PHISHBOT_SIMULATION",
    score: financialLure ? 9 : 8,
    title,
    targetEntity: target.email,
    financialRisk_cents: 0n,
    ttlSeconds: 259200,
    ingestionDetails: JSON.stringify(phishIngestionCore),
    aiReport: financialLure
      ? "PhishBot (Agent 10) Strategic Intel drill: financial / BEC-style lure against synthetic Level-5 executive. Real identities excluded."
      : "Strategic Intel drill executed on random Level-5 synthetic executive target. Real identities are excluded.",
  });

  await logIronwatch({
    event_type: "STRATEGIC_INTEL_SIMULATION_OK",
    actor_id: tenantId,
    detail: JSON.stringify({
      threatId: created.id,
      syntheticEmployeeId: target.id,
      category: "SIMULATION",
      noRealWorldActions: true,
      phishSimTargetHooked,
      effectiveVulnerabilityForPhishSim: effectiveVulnerability,
      strategicIntelRoute: route,
      lureProfile: financialLure ? "FINANCIAL" : "GENERIC",
    }),
    severity: "INFO",
  });

  if (phishSimTargetHooked) {
    const heist = await applyHeistRetentionForSuccessfulPhish({ target });
    await ingressGateway.updateThreatEvent(created.id, {
      financialRisk_cents: heist.breachLossCents,
      ingestionDetails: JSON.stringify({
        ...phishIngestionCore,
        simLossTag: "SIM_LOSS",
        insuranceRecoveryPending: true,
        outOfPocketExposureCents: heist.deductibleCents.toString(),
        insuranceRecoveryCents: heist.insuranceRecoveryCents.toString(),
      }),
      aiReport:
        "Strategic Intel PhishBot drill hook succeeded: deductible retained from Medshield baseline; remaining loss flagged for insurance recovery.",
    });
  }

  revalidatePath("/integrity");
  revalidatePath("/");

  return {
    ok: true,
    pipelineThreat: {
      id: created.id,
      name: created.title,
      loss: 0,
      score: created.score,
      industry: selectedIndustry,
      source: created.sourceAgent,
      description: `Strategic Drill · PhishBot · ${target.email}`,
      createdAt: new Date().toISOString(),
      threatStatus: ThreatState.PIPELINE,
      lifecycleState: "pipeline",
    },
  };
}

export type TriggerInfilbotOptions = {
  displayTitle?: string;
  selectedIndustry?: string;
  citationSource?: string;
  lureType?: StrategicIntelLureType;
  estimatedLossM?: number;
};

export async function triggerInfilbotSimulation(
  options?: TriggerInfilbotOptions,
): Promise<TriggerAttbotSimulationResult> {
  const ctx = await resolveActiveTenantCompany();
  if (!ctx.ok) return ctx;
  const { tenantId, company } = ctx;
  await clearSimulationStandDown(tenantId);
  const target = await selectSyntheticTarget("INFILBOT");
  if (!target) return { ok: false, error: "No synthetic targets available. Seed SyntheticEmployee first." };

  const displayTitle = options?.displayTitle?.trim();
  const selectedIndustry = (options?.selectedIndustry ?? "Healthcare").trim() || "Healthcare";
  const citationSource = options?.citationSource?.trim() || undefined;
  const lossM =
    typeof options?.estimatedLossM === "number" && Number.isFinite(options.estimatedLossM)
      ? Math.max(0, options.estimatedLossM)
      : 0;
  const lossCents = lossM > 0 ? lossMillionsToCents(lossM) : 0n;

  const title = displayTitle
    ? `[STRATEGIC INTEL · InfilBot] ${displayTitle} — ${target.name}`
    : `[INFILBOT] Simulated credential / lateral movement against ${target.name}.`;

  const created = await ingressGateway.writeThreatEvent({
    tenantCompanyId: company.id,
    status: ThreatState.PIPELINE,
    sourceAgent: "INFILBOT_SIMULATION",
    score: 8,
    title,
    targetEntity: target.email,
    financialRisk_cents: lossCents,
    ttlSeconds: 259200,
    ingestionDetails: JSON.stringify({
      category: "SIMULATION",
      simulator: "INFILBOT",
      trigger: displayTitle ? "STRATEGIC_INTEL_THREAT_LIBRARY" : "INFILBOT_DEFAULT",
      strategicIntelThreatLabel: displayTitle ?? null,
      strategicIntelIndustry: displayTitle ? selectedIndustry : null,
      threatIntelCitation: citationSource ?? null,
      lureType: options?.lureType ?? null,
      syntheticEmployeeId: target.id,
      syntheticEmployeeEmail: target.email,
      syntheticEmployeeRole: target.role,
      syntheticClearanceLevel: target.clearanceLevel,
      noRealWorldActions: true,
    }),
    aiReport: displayTitle
      ? "INFILBOT Strategic Intel drill: credential / lateral movement scenario from Threat Library. Synthetic employee only."
      : "INFILBOT simulation: synthetic employee only. No IdP lockout or production lateral containment.",
  });

  await logIronwatch({
    event_type: "INFILBOT_SIMULATION_OK",
    actor_id: tenantId,
    detail: JSON.stringify({
      threatId: created.id,
      syntheticEmployeeId: target.id,
      category: "SIMULATION",
      noRealWorldActions: true,
      strategicIntel: Boolean(displayTitle),
    }),
    severity: "INFO",
  });

  revalidatePath("/integrity");
  revalidatePath("/");

  return {
    ok: true,
    pipelineThreat: {
      id: created.id,
      name: created.title,
      loss: lossM,
      score: created.score,
      industry: selectedIndustry,
      source: created.sourceAgent,
      description: displayTitle
        ? `Strategic Intel · InfilBot · ${target.email}`
        : `Simulated Infil · ${target.email}`,
      createdAt: new Date().toISOString(),
      threatStatus: ThreatState.PIPELINE,
      lifecycleState: "pipeline",
    },
  };
}

/**
 * Threat Library entrypoint for Strategic Intel cards.
 * Current directive: every card click launches an immediate PhishBot drill
 * against a random Level-5 target (financial lure for BEC-like items).
 */
export async function triggerLiveThreatSimulation(
  threatId: string,
): Promise<TriggerAttbotSimulationResult> {
  const hit = findThreatIntelById(threatId);
  if (!hit) return { ok: false, error: "Unknown threat profile." };

  const selectedIndustry = industryDisplayFromThreatEnum(hit.bucket);
  const lossM = threatImpactToLossM(hit.entry.impact);
  const { lureType, title, source } = hit.entry;
  const route: StrategicThreatRoute = lureType === "FINANCIAL" ? "BEC" : "PHISH";
  return launchSimulatedAttack({
    route,
    displayTitle: title,
    estimatedLossM: lossM,
    selectedIndustry,
    lureType,
    citationSource: source,
  });
}
