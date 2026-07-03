import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { assessTasMdIntegritySync } from "@/app/lib/tasMdIntegrity";
import { readSystemConfigStaleLockdownSliceSafe } from "@/app/lib/systemConfigSafeAccess";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";
import {
  getTasFingerprintSnapshot,
  syncConstitutionalIntegrityEnforcement,
} from "@/app/utils/tasFingerprint";
import { shortenSha256Hex } from "@/app/utils/tasConstitutionalFingerprintFormat";
import { checkAndExecuteDeadMansSwitch, getDeadManSwitchStatus } from "@/app/lib/deadMansSwitch";
import { readGovernanceMaturityState } from "@/app/lib/governanceMaturityState";
import { computeSustainabilityStaleLockdown } from "@/app/config/sustainabilityStaleLockdown";

export const dynamic = "force-dynamic";

function buildIntegrityPayload(params: {
  snap: ReturnType<typeof getTasFingerprintSnapshot>;
  deadManSwitch: Awaited<ReturnType<typeof getDeadManSwitchStatus>>;
  governance: Awaited<ReturnType<typeof readGovernanceMaturityState>>;
  requiredForensicAttestationMin: number;
  isSustainabilityApiDegraded: boolean;
  isSustainabilityStaleLockdownBlocking: boolean;
  sustainabilityStaleLockdownHours: number | null;
  ancillaryWarning?: string | null;
}) {
  const {
    snap,
    deadManSwitch,
    governance,
    requiredForensicAttestationMin,
    isSustainabilityApiDegraded,
    isSustainabilityStaleLockdownBlocking,
    sustainabilityStaleLockdownHours,
    ancillaryWarning,
  } = params;

  return {
    isConstitutionalEmergency: snap.isConstitutionalEmergency,
    deadManSwitch,
    systemMaturityScore: governance?.current?.score ?? null,
    governanceDegradationActive: governance?.current?.governanceDegradationActive ?? false,
    requiredForensicAttestationMin,
    isSustainabilityApiDegraded,
    isSustainabilityStaleLockdownBlocking,
    sustainabilityStaleLockdownHours,
    constitutionalRebaselinePending: snap.constitutionalRebaselinePending,
    constitutionalDegradedMode: snap.constitutionalDegradedMode,
    sha256: snap.sha256,
    sha256Short: snap.sha256 ? shortenSha256Hex(snap.sha256) : "",
    failureReason: snap.failureReason,
    failureMessage: snap.failureMessage,
    ironlockFreezeApplied: snap.ironlockFreezeApplied,
    isOverrideSpent: snap.isOverrideSpent,
    chaosSimulationActive: snap.chaosSimulationActive,
    checkedAt: snap.checkedAt,
    ...(ancillaryWarning ? { ancillaryWarning } : {}),
  };
}

/**
 * Constitutional Integrity Sentinel — polled on app start / interval for emergency + rebirth.
 */
export async function GET(request: NextRequest) {
  try {
    const guard = await assertAuthenticatedIronguardTenantOr403(request);
    if (!guard.ok) return guard.response;
    const tenantId = guard.tenantUuid;

    let snap = getTasFingerprintSnapshot({ forceRefresh: true, tenantId });
    try {
      snap = await syncConstitutionalIntegrityEnforcement(tenantId);
    } catch (e) {
      console.error("[api/grc/tas-integrity] syncConstitutionalIntegrityEnforcement", e);
      snap = getTasFingerprintSnapshot({ forceRefresh: true, tenantId });
    }

    let deadManSwitch: Awaited<ReturnType<typeof getDeadManSwitchStatus>> = {
      armed: false,
      expiresAt: null,
      remainingMs: null,
      resolved: false,
      triggered: false,
      lwtSent: false,
      lwtArchiveId: null,
      triggerTenantId: null,
      isSimulation: false,
    };
    let governance = await readGovernanceMaturityState();
    let cfg = null;
    let ancillaryWarning: string | null = null;

    try {
      if (snap.isConstitutionalEmergency) {
        await checkAndExecuteDeadMansSwitch(true, tenantId);
      }
      deadManSwitch = await getDeadManSwitchStatus(snap.isConstitutionalEmergency, tenantId);
      governance = await readGovernanceMaturityState();
      cfg = await readSystemConfigStaleLockdownSliceSafe();
    } catch (e) {
      ancillaryWarning = e instanceof Error ? e.message : "SystemConfig ancillary read failed";
      console.error("[api/grc/tas-integrity] ancillary", e);
    }

    const lock = computeSustainabilityStaleLockdown(cfg);
    const requiredForensicAttestationMin = Math.max(
      snap.requiredForensicAttestationMin,
      governance?.current?.neutralizeMinChars ?? 50,
    );

    const body = buildIntegrityPayload({
      snap,
      deadManSwitch,
      governance,
      requiredForensicAttestationMin,
      isSustainabilityApiDegraded: cfg?.sustainabilityLiveApiDegraded === true,
      isSustainabilityStaleLockdownBlocking: lock.blockingMutations,
      sustainabilityStaleLockdownHours: lock.hoursDegraded,
      ancillaryWarning,
    });

    const httpStatus =
      snap.isConstitutionalEmergency && !snap.constitutionalDegradedMode ? 503 : 200;

    return NextResponse.json(body, {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-store",
        "X-Constitutional-Emergency": snap.isConstitutionalEmergency ? "1" : "0",
        "X-Constitutional-Rebaseline": snap.constitutionalRebaselinePending ? "1" : "0",
        "X-Constitutional-Degraded": snap.constitutionalDegradedMode ? "1" : "0",
      },
    });
  } catch (e) {
    console.error("[api/grc/tas-integrity]", e);
    const assessment = assessTasMdIntegritySync();
    if (assessment.ok) {
      const snap = getTasFingerprintSnapshot({ forceRefresh: true });
      return NextResponse.json(
        buildIntegrityPayload({
          snap: { ...snap, isConstitutionalEmergency: false, failureReason: null, failureMessage: null },
          deadManSwitch: {
            armed: false,
            expiresAt: null,
            remainingMs: null,
            resolved: false,
            triggered: false,
            lwtSent: false,
            lwtArchiveId: null,
            triggerTenantId: null,
            isSimulation: false,
          },
          governance: await readGovernanceMaturityState(),
          requiredForensicAttestationMin: snap.requiredForensicAttestationMin,
          isSustainabilityApiDegraded: false,
          isSustainabilityStaleLockdownBlocking: false,
          sustainabilityStaleLockdownHours: null,
          ancillaryWarning: e instanceof Error ? e.message : "integrity check failed",
        }),
        {
          status: 200,
          headers: { "Cache-Control": "no-store", "X-Constitutional-Emergency": "0" },
        },
      );
    }
    return NextResponse.json(
      {
        isConstitutionalEmergency: true,
        constitutionalRebaselinePending: false,
        constitutionalDegradedMode: false,
        requiredForensicAttestationMin: 100,
        isOverrideSpent: false,
        isSustainabilityApiDegraded: false,
        isSustainabilityStaleLockdownBlocking: false,
        sustainabilityStaleLockdownHours: null,
        sha256: "",
        sha256Short: "",
        failureReason: "UNREADABLE",
        failureMessage: e instanceof Error ? e.message : "integrity check failed",
        ironlockFreezeApplied: false,
        checkedAt: new Date().toISOString(),
      },
      { status: 503, headers: { "Cache-Control": "no-store", "X-Constitutional-Emergency": "1" } },
    );
  }
}
