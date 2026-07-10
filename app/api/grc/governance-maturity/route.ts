import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { readGovernanceMaturityState } from "@/app/lib/governanceMaturityState";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";
import { recalculateSystemMaturityScore } from "@/app/services/governanceScoring";
import { buildCarbonPulsePayload } from "@/app/services/ironbloom/carbonPulseService";
import { buildIrontallyFrameworkSnapshot } from "@/app/services/irontallyMapper";
import {
  computeCostOfNonCompliance,
  resolveGovernanceBaselineMode,
} from "@/app/utils/financialRisk";
import { tenantKeyFromUuid } from "@/app/utils/tenantIsolation";
import prisma from "@/lib/prisma";
import { computeSustainabilityStaleLockdown } from "@/app/config/sustainabilityStaleLockdown";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guard = await assertAuthenticatedIronguardTenantOr403(request);
  if (!guard.ok) return guard.response;
  const tenantId = guard.tenantUuid;
  const recalc = request.nextUrl.searchParams.get("recalc") === "1";

  let state;
  try {
    state = recalc
      ? await recalculateSystemMaturityScore({
          tenantId: tenantId ?? undefined,
          trigger: "API_POLL",
        })
      : await readGovernanceMaturityState();

    if (!recalc) {
      const cfg = await prisma.systemConfig.findUnique({
        where: { id: "global" },
        select: {
          sustainabilityLiveApiDegraded: true,
          sustainabilityApiDegradedSince: true,
          sustainabilityStaleLockdownWaived: true,
        },
      });
      const dbDegraded = cfg?.sustainabilityLiveApiDegraded === true;
      const snapDegraded = state.current.apiOutagePenaltyActive === true;
      const lock = computeSustainabilityStaleLockdown(cfg);
      const dbFrozen = lock.staleDataLockdownWindow && cfg?.sustainabilityStaleLockdownWaived !== true;
      const fileFrozen = state.current.sustainabilityStaleLockdownFrozen === true;
      if (dbDegraded !== snapDegraded || dbFrozen !== fileFrozen) {
        state = await recalculateSystemMaturityScore({
          tenantId: tenantId ?? undefined,
          trigger: "IRONWATCH_STATE_SYNC",
        });
      }
    }
  } catch (err) {
    console.error("[governance-maturity] maturity calculation failed", err);
    state = await readGovernanceMaturityState();
  }

  const tenantKey = tenantKeyFromUuid(tenantId);
  let sustainabilityAleCents: string | undefined;
  let carbonPenaltyAvoidedCents: string | undefined;
  let resilienceBonusActive: boolean | undefined;
  if (tenantId) {
    try {
      const pulse = await buildCarbonPulsePayload(tenantId);
      sustainabilityAleCents = pulse.sustainabilityAleCents;
      carbonPenaltyAvoidedCents = pulse.governanceDividend.penaltyAvoidedCents;
      resilienceBonusActive = pulse.resilienceStreak.verifiedSustainabilityLeader;
    } catch {
      /* pulse optional for maturity poll */
    }
  }
  const financialImpact = computeCostOfNonCompliance(state.current.score, {
    tenantKey,
    baselineMode: resolveGovernanceBaselineMode(tenantKey),
    sustainabilityAleCents,
    carbonPenaltyAvoidedCents,
    selfHealingResilienceBonusActive: resilienceBonusActive,
  });
  const irontally = buildIrontallyFrameworkSnapshot(
    state.current.score,
    state.current.calculatedAt,
  );

  let isUnderTargetedSiege = false;
  if (tenantId) {
    try {
      const trow = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { isUnderTargetedSiege: true },
      });
      isUnderTargetedSiege = trow?.isUnderTargetedSiege === true;
    } catch {
      isUnderTargetedSiege = false;
    }
  }

  return NextResponse.json(
    {
      ok: true,
      tenantId,
      tenantKey,
      score: state.current.score,
      governanceDegradationActive: state.current.governanceDegradationActive,
      neutralizeMinChars: state.current.neutralizeMinChars,
      apiOutagePenaltyActive: state.current.apiOutagePenaltyActive ?? false,
      isUnderTargetedSiege,
      targetedAdversarialMaturityPenalty: state.current.targetedAdversarialMaturityPenalty ?? 0,
      maturityDisplayLabel:
        state.current.sustainabilityStaleLockdownFrozen === true
          ? "CRITICAL: FROZEN"
          : state.current.apiOutagePenaltyActive === true
            ? "Degraded (API Outage)"
            : null,
      current: state.current,
      trend: state.trend,
      financialImpact,
      irontally,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
