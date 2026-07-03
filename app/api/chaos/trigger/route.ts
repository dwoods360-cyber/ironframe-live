import { NextRequest, NextResponse } from "next/server";

import { isConstitutionalChaosDrill } from "@/app/config/chaosRegistry";
import { triggerConstitutionalCollapseChaos } from "@/app/lib/constitutionalCollapseChaos";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";
import { isShadowPlaneActiveFromEnv } from "@/app/utils/shadowPlaneActive";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { syncConstitutionalIntegrityEnforcement } from "@/app/utils/tasFingerprint";
import { checkAndExecuteDeadMansSwitch, getDeadManSwitchStatus } from "@/app/lib/deadMansSwitch";
import { markTenantChaosForensicHardeningComplete } from "@/app/lib/security/quarantineTenantTargeting";

export const dynamic = "force-dynamic";

type TriggerBody = {
  scenario?: string;
  tenantId?: string;
};

/**
 * POST /api/chaos/trigger — `CONSTITUTIONAL_COLLAPSE` arms per-tenant void, Ironlock freeze, simulation DMS.
 */
export async function POST(request: NextRequest) {
  if (!isShadowPlaneActiveFromEnv()) {
    const simCookie = request.cookies.get("ironframe-simulation-mode")?.value === "1";
    if (!simCookie) {
      return NextResponse.json(
        { ok: false, error: "Chaos constitutional drills require simulation / shadow plane." },
        { status: 403 },
      );
    }
  }

  const tenantGuard = await assertAuthenticatedIronguardTenantOr403(request);
  if (!tenantGuard.ok) {
    return tenantGuard.response;
  }

  let body: TriggerBody = {};
  try {
    body = (await request.json()) as TriggerBody;
  } catch {
    body = {};
  }

  const scenario = (body.scenario ?? "").trim();
  if (!isConstitutionalChaosDrill(scenario)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unsupported scenario "${scenario}". Use CONSTITUTIONAL_COLLAPSE.`,
      },
      { status: 400 },
    );
  }

  const tenantId =
    body.tenantId?.trim() || tenantGuard.tenantUuid || (await getActiveTenantUuidFromCookies());
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "No active tenant." }, { status: 400 });
  }

  const result = await triggerConstitutionalCollapseChaos({ tenantId });
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  await markTenantChaosForensicHardeningComplete(tenantId);

  const snap = await syncConstitutionalIntegrityEnforcement(tenantId);
  await checkAndExecuteDeadMansSwitch(snap.isConstitutionalEmergency, tenantId);
  const deadManSwitch = await getDeadManSwitchStatus(snap.isConstitutionalEmergency, tenantId);

  return NextResponse.json({
    ok: true,
    scenario: "CONSTITUTIONAL_COLLAPSE",
    tenantId: result.tenantId,
    expiresAt: result.expiresAt,
    threatsFrozen: result.threatsFrozen,
    shadowFrozen: result.shadowFrozen,
    simulatedVoidHash: result.voidRecord.simulatedVoidHash,
    isConstitutionalEmergency: snap.isConstitutionalEmergency,
    chaosSimulationActive: snap.chaosSimulationActive,
    deadManSwitch,
  });
}
