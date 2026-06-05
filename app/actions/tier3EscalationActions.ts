"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { ThreatState } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  normalizeIngestionDetailsToString,
  parseIngestionDetailsForMerge,
} from "@/app/utils/ingestionDetailsMerge";
import {
  buildChaosL4LifecyclePatch,
  CHAOS_L4_WORK_PERFORMED_MIN_CHARS,
  isChaosL4ReadyForTechClaim,
  isChaosL4TechInvestigating,
  parseChaosL4IrontechLive,
  parseChaosL4LifecycleFromIngestion,
} from "@/app/utils/chaosL4Lifecycle";
import {
  finalizeRemoteSupportTechResolution,
  patchRemoteSupportDrillIngestion,
} from "@/app/utils/irontechResilience";

type Tier3ThreatCtx = {
  plane: "prod" | "shadow";
  tenantCompanyId: bigint | null;
  status: ThreatState;
  ingestionRaw: string;
};

async function resolveTier3ThreatContext(threatId: string): Promise<Tier3ThreatCtx | null> {
  const id = threatId.trim();
  if (!id) return null;

  const simRow = await prisma.riskEvent.findFirst({
    where: { id },
    select: { status: true, ingestionDetails: true, tenantCompanyId: true },
  });
  if (simRow) {
    return {
      plane: "shadow",
      tenantCompanyId: simRow.tenantCompanyId,
      status: simRow.status,
      ingestionRaw: normalizeIngestionDetailsToString(simRow.ingestionDetails) ?? "{}",
    };
  }

  const prodRow = await prisma.threatEvent.findUnique({
    where: { id },
    select: { status: true, ingestionDetails: true, tenantCompanyId: true },
  });
  if (!prodRow) return null;

  return {
    plane: "prod",
    tenantCompanyId: prodRow.tenantCompanyId,
    status: prodRow.status,
    ingestionRaw: prodRow.ingestionDetails ?? "{}",
  };
}

function mergeIrontechLiveAttempt4(ingestionRaw: string): Record<string, Prisma.InputJsonValue> {
  const base = parseIngestionDetailsForMerge(ingestionRaw);
  const live = parseChaosL4IrontechLive(ingestionRaw);
  const attempts = [...(live?.attempts ?? [])];
  const at = new Date().toISOString();
  attempts.push({
    attempt: 4,
    max: 4,
    error: "Step 4: User granted JIT remote access window. Initializing secure SSH sidecar proxy.",
    at,
  });
  return {
    irontechLive: {
      streamSeq: (live?.streamSeq ?? 3) + 1,
      lastTerminalLine:
        "> [IRONFRAME] STAGE 4 — JIT GRANTED — Sidecar proxy initializing for field engineer ingress",
      agentName: "Irontech",
      streamedAt: at,
      attempts,
    } as unknown as Prisma.InputJsonValue,
  };
}

/** Step 4 — customer analyst grants remote access; ticket stays on board for tech handoff. */
export async function userGrantAccessAction(
  threatId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await resolveTier3ThreatContext(threatId);
  if (!ctx) return { ok: false, error: "Threat not found." };

  const l4 = parseChaosL4LifecycleFromIngestion(ctx.ingestionRaw);
  if (!l4) {
    return { ok: false, error: "Only Scenario 4 (Remote Support) tickets support Tier-3 grant." };
  }
  if (l4.lifecycleStep !== "AWAITING_JIT_GRANT") {
    return { ok: false, error: "Ticket is not awaiting JIT grant." };
  }

  const grantedAt = new Date().toISOString();
  const patch = {
    ...buildChaosL4LifecyclePatch({
      lifecycleStep: "JIT_GRANTED",
      assignedRole: "IRONFRAME_TECH_SUPPORT",
      remoteSupportJitAwaitingGrant: false,
      jitGrantedAt: grantedAt,
      chaosRemoteAccessGrantedAt: grantedAt,
    }),
    ...mergeIrontechLiveAttempt4(ctx.ingestionRaw),
  };

  const result = await patchRemoteSupportDrillIngestion(
    threatId,
    patch,
    "CHAOS_L4_JIT_GRANTED",
    ThreatState.MITIGATED,
  );
  if (!result.success) return { ok: false, error: result.error };

  revalidatePath("/", "layout");
  revalidatePath("/integrity");
  return { ok: true };
}

/** Step 5 — Ironframe Tech Support claims the card. */
export async function techClaimCardAction(
  threatId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await resolveTier3ThreatContext(threatId);
  if (!ctx) return { ok: false, error: "Threat not found." };

  if (!isChaosL4ReadyForTechClaim(ctx.ingestionRaw)) {
    return {
      ok: false,
      error: "GRC_PROTOCOL_VIOLATION: Cannot claim vendor token until JIT window is opened.",
    };
  }

  const claimedAt = new Date().toISOString();
  const result = await patchRemoteSupportDrillIngestion(
    threatId,
    buildChaosL4LifecyclePatch({
      lifecycleStep: "TECH_INVESTIGATING",
      assignedRole: "IRONFRAME_TECH_SUPPORT",
      techClaimedAt: claimedAt,
    }),
    "CHAOS_L4_TECH_CLAIMED",
    ThreatState.MITIGATED,
  );
  if (!result.success) return { ok: false, error: result.error };

  revalidatePath("/", "layout");
  revalidatePath("/integrity");
  return { ok: true };
}

/** Steps 6–7 — tech submits work log, writes compliance timeline, archives, drops from active board scope. */
export async function techResolveAction(
  threatId: string,
  workPerformed: string,
): Promise<{ ok: true; closedAt: string } | { ok: false; error: string }> {
  const trimmed = workPerformed.trim();
  if (trimmed.length < CHAOS_L4_WORK_PERFORMED_MIN_CHARS) {
    return {
      ok: false,
      error: "VALIDATION_ERROR: Clear technical summary of work performed is mandated for audit tracking.",
    };
  }

  const ctx = await resolveTier3ThreatContext(threatId);
  if (!ctx) return { ok: false, error: "Threat not found." };

  const l4 = parseChaosL4LifecycleFromIngestion(ctx.ingestionRaw);
  if (!l4) {
    return { ok: false, error: "Only Scenario 4 (Remote Support) tickets support Tier-3 resolve." };
  }
  if (l4.assignedRole !== "IRONFRAME_TECH_SUPPORT") {
    return {
      ok: false,
      error: "GRC_PROTOCOL_VIOLATION: Security override rejected. Ticket must be claimed by active field tech.",
    };
  }
  if (!isChaosL4TechInvestigating(ctx.ingestionRaw)) {
    return { ok: false, error: "Claim the ticket before submitting work performed." };
  }

  const closedAt = new Date().toISOString();
  const finalize = await finalizeRemoteSupportTechResolution(threatId.trim(), trimmed);
  if (!finalize.success) {
    return { ok: false, error: finalize.error };
  }

  revalidatePath("/", "layout");
  revalidatePath("/integrity");
  revalidatePath("/dashboard");
  return { ok: true, closedAt };
}
