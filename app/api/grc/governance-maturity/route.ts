import { NextResponse } from "next/server";

import { readGovernanceMaturityState } from "@/app/lib/governanceMaturityState";
import { recalculateSystemMaturityScore } from "@/app/services/governanceScoring";
import { buildCarbonPulsePayload } from "@/app/services/ironbloom/carbonPulseService";
import { buildIrontallyFrameworkSnapshot } from "@/app/services/irontallyMapper";
import {
  computeCostOfNonCompliance,
  resolveGovernanceBaselineMode,
} from "@/app/utils/financialRisk";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { tenantKeyFromUuid } from "@/app/utils/tenantIsolation";
import prisma from "@/lib/prisma";
import { computeSustainabilityStaleLockdown } from "@/app/config/sustainabilityStaleLockdown";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const tenantId = await getActiveTenantUuidFromCookies();
  const recalc = new URL(request.url).searchParams.get("recalc") === "1";

  let state = recalc
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
