"use server";

import { revalidatePath } from "next/cache";
import { ThreatState, type Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import {
  getScopedTenantUuidFromCookies,
  resolveTenantUuidForThreatScope,
} from "@/app/utils/serverTenantContext";
import { getCompanyIdForTenantUuid } from "@/app/lib/grc/clearanceThreatResolve";
import { ingressGateway } from "@/app/lib/security/ingressGateway";
import { validateIngressContext } from "@/app/middleware/irongateShield";
import { integrityService } from "@/src/services/integrityService";
import { EventSource } from "@prisma/client";
import { createHash } from "crypto";
import {
  computeSimulatedAleReallocationCents,
  formatHitlApprovalNote,
  hitlCategoryFromChaosScenario,
  type HitlChaosScenarioId,
  type HitlReviewIngestionMeta,
} from "@/app/utils/hitlReviewQueue";
import { mergeIngestionDetailsPatchJson } from "@/app/utils/ingestionDetailsMerge";
import { CHAOS_ASSIGNEE_IRONGATE_14 } from "@/app/config/chaosShadowAudit";

export type InjectHitlChaosResult =
  | {
      ok: true;
      threatId: string;
      approvalId: string;
      tenantId: string;
      scenario: HitlChaosScenarioId;
      message: string;
    }
  | { ok: false; error: string };

function scenarioCardTitle(scenario: HitlChaosScenarioId): string {
  switch (scenario) {
    case "HITL_ALE_CIRCUIT_BREAKER":
      return "[HITL] ALE Circuit Breaker — Fund Reallocation Pending";
    case "HITL_BREACH_ATTESTATION":
      return "[HITL] CISO Handshake — PII/CUI Exfiltration Manifest";
    case "HITL_UNQUARANTINE_OVERRIDE":
      return "[HITL] System Un-Quarantine — Core Node Override";
    case "HITL_CONFIG_AUDIT_TRAIL":
      return "[HITL] Config Audit Trail — Notification Endpoint Delta";
    default:
      return "[HITL] Review Queue Scenario";
  }
}

function scenarioApprovalNote(
  scenario: HitlChaosScenarioId,
  meta: HitlReviewIngestionMeta,
): string {
  const category = hitlCategoryFromChaosScenario(scenario);
  switch (scenario) {
    case "HITL_ALE_CIRCUIT_BREAKER":
      return formatHitlApprovalNote(
        category,
        `Pending ledger entry: ${meta.pendingLedgerCents ?? "0"} integer cents (BigInt-safe). ` +
          "Approve to release remediation script; reject freezes remediation.",
      );
    case "HITL_BREACH_ATTESTATION":
      return formatHitlApprovalNote(
        category,
        `Forensic incident manifest (${meta.forensicManifestUrl ?? "vault://sim/manifest"}) ` +
          "requires CISO digital signature for evidence vaulting.",
      );
    case "HITL_UNQUARANTINE_OVERRIDE":
      return formatHitlApprovalNote(
        category,
        `Ironlock quarantine on node ${meta.quarantineNodeId ?? "core-sim-01"}. ` +
          "Approve to resume traffic after self-healing verification.",
      );
    case "HITL_CONFIG_AUDIT_TRAIL": {
      const delta = meta.configDelta;
      return formatHitlApprovalNote(
        category,
        delta
          ? `Webhook delta ${delta.endpoint}: ${delta.previousHash.slice(0, 12)}… → ${delta.proposedHash.slice(0, 12)}… — secondary admin approval required.`
          : "Notification endpoint modification pending secondary admin approval.",
      );
    }
    default:
      return formatHitlApprovalNote(category, "HITL review required.");
  }
}

function buildHitlIngestionMeta(
  scenario: HitlChaosScenarioId,
  tenantScopeUuid: string,
): HitlReviewIngestionMeta {
  const category = hitlCategoryFromChaosScenario(scenario);
  const base: HitlReviewIngestionMeta = {
    category,
    tenantScopeUuid,
    scenarioId: scenario,
    remediationFrozen: false,
  };

  switch (scenario) {
    case "HITL_ALE_CIRCUIT_BREAKER":
      return {
        ...base,
        pendingLedgerCents: computeSimulatedAleReallocationCents(tenantScopeUuid).toString(),
      };
    case "HITL_BREACH_ATTESTATION":
      return {
        ...base,
        forensicManifestUrl: `https://vault.internal/sim/${tenantScopeUuid.slice(0, 8)}/breach-manifest.pdf`,
      };
    case "HITL_UNQUARANTINE_OVERRIDE":
      return {
        ...base,
        quarantineNodeId: `core-node-${tenantScopeUuid.slice(0, 8)}`,
      };
    case "HITL_CONFIG_AUDIT_TRAIL": {
      const seed = createHash("sha256").update(`${tenantScopeUuid}:webhook`).digest("hex");
      const proposed = createHash("sha256").update(`${seed}:proposed`).digest("hex");
      return {
        ...base,
        configDelta: {
          endpoint: "https://hooks.internal/alerts-primary",
          previousHash: seed,
          proposedHash: proposed,
        },
      };
    }
    default:
      return base;
  }
}

/**
 * Injects a tenant-scoped HITL chaos scenario: threat card + pending Review Queue approval.
 * All simulation data is bound to `tenantUuidOverride` / session cookie — zero cross-tenant bleed.
 */
export async function injectHitlChaosScenarioAction(
  scenario: HitlChaosScenarioId,
  tenantUuidOverride?: string,
): Promise<InjectHitlChaosResult> {
  const activeTenantUuid = tenantUuidOverride?.trim()
    ? await resolveTenantUuidForThreatScope(tenantUuidOverride.trim())
    : await getScopedTenantUuidFromCookies();

  if (!activeTenantUuid) {
    return {
      ok: false,
      error: "No active tenant in session — select Command Center tenant before HITL chaos inject.",
    };
  }

  try {
    validateIngressContext(activeTenantUuid);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Tenant context validation failed.";
    return { ok: false, error: message };
  }

  const cookieTenant = await getScopedTenantUuidFromCookies();
  if (tenantUuidOverride?.trim() && cookieTenant && cookieTenant !== activeTenantUuid) {
    return {
      ok: false,
      error: "Tenant override mismatch — HITL inject blocked (session isolation).",
    };
  }

  let companyId = await getCompanyIdForTenantUuid(activeTenantUuid);
  if (companyId == null) {
    await prisma.tenant.upsert({
      where: { id: activeTenantUuid },
      create: {
        id: activeTenantUuid,
        name: "HITL Chaos Bootstrap Tenant",
        slug: `hitl-${activeTenantUuid.slice(0, 8)}`,
        industry: "Secure Enclave",
      },
      update: {},
    });
    const company = await prisma.company.create({
      data: {
        name: "HITL Chaos Lab Co",
        sector: "Technology",
        tenantId: activeTenantUuid,
        isTestRecord: true,
      },
      select: { id: true },
    });
    companyId = company.id;
  }

  const user = await getSupabaseSessionUser();
  const requestedByUserId = user?.id?.trim() || "hitl-chaos-simulator";

  const hitlMeta = buildHitlIngestionMeta(scenario, activeTenantUuid);
  const cardTitle = scenarioCardTitle(scenario);
  const financialCents =
    scenario === "HITL_ALE_CIRCUIT_BREAKER" && hitlMeta.pendingLedgerCents
      ? BigInt(hitlMeta.pendingLedgerCents)
      : 0n;

  const ingestionDetailsObj = mergeIngestionDetailsPatchJson("{}", {
    sourcePlane: "CHAOS",
    isChaosTest: true,
    isHitlReviewDrill: true,
    incident_type: "HITL_REVIEW",
    category: "HITL",
    tenantScopeUuid: activeTenantUuid,
    chaosTenantCompanyId: companyId.toString(),
    hitlReview: hitlMeta as unknown as Prisma.InputJsonValue,
    grcJustification:
      "SYSTEM TEST: HITL Review Queue drill — tenant-scoped attestation card for Control Room sign-off.",
    dmzIrongateIngress: {
      agentId: CHAOS_ASSIGNEE_IRONGATE_14,
      routedAt: new Date().toISOString(),
      sanitized: true,
    },
  });
  const ingestionDetails =
    typeof ingestionDetailsObj === "string" ? ingestionDetailsObj : JSON.stringify(ingestionDetailsObj);

  try {
    const created = await ingressGateway.writeThreatEvent({
      title: cardTitle,
      sourceAgent: "IRONINTEL_SIMULATION",
      score: 10,
      targetEntity: hitlMeta.quarantineNodeId ?? "HITL-ChaosLab",
      financialRisk_cents: financialCents,
      status: ThreatState.IDENTIFIED,
      tenantCompanyId: companyId,
      ingestionDetails,
      ttlSeconds: 259_200,
      assigneeId: CHAOS_ASSIGNEE_IRONGATE_14,
      aiReport: "[SIMULATION_DATA] HITL chaos scenario — Review Queue card pending manager attestation.",
    });

    const approvalNote = scenarioApprovalNote(scenario, hitlMeta);

    const { approvalId } = await prisma.$transaction(async (tx) => {
      const approval = await tx.threatApproval.create({
        data: {
          threatId: created.id,
          tenantId: activeTenantUuid,
          status: "PENDING",
          requestedByUserId,
          approvalNote,
        },
        select: { id: true },
      });

      await integrityService.logEvent(tx, {
        tenantId: activeTenantUuid,
        eventType: "HITL_REVIEW_REQUESTED",
        entityType: "THREAT_APPROVAL",
        entityId: approval.id,
        actorUserId: requestedByUserId,
        payload: {
          threatId: created.id,
          scenario,
          hitlCategory: hitlMeta.category,
          pendingLedgerCents: hitlMeta.pendingLedgerCents ?? null,
          tenantScopeUuid: activeTenantUuid,
        },
        source: EventSource.SYSTEM,
      });

      return { approvalId: approval.id };
    });

    revalidatePath("/", "layout");
    revalidatePath("/integrity");

    return {
      ok: true,
      threatId: created.id,
      approvalId,
      tenantId: activeTenantUuid,
      scenario,
      message: `${cardTitle} — Review Queue card created for tenant ${activeTenantUuid.slice(0, 8)}…`,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
