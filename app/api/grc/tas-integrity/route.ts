import { NextResponse } from "next/server";

import {
  getTasFingerprintSnapshot,
  syncConstitutionalIntegrityEnforcement,
} from "@/app/utils/tasFingerprint";
import { shortenSha256Hex } from "@/app/utils/tasConstitutionalFingerprintFormat";
import { checkAndExecuteDeadMansSwitch, getDeadManSwitchStatus } from "@/app/lib/deadMansSwitch";
import { readGovernanceMaturityState } from "@/app/lib/governanceMaturityState";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import prisma from "@/lib/prisma";
import { computeSustainabilityStaleLockdown } from "@/app/config/sustainabilityStaleLockdown";

export const dynamic = "force-dynamic";

/**
 * Constitutional Integrity Sentinel — polled on app start / interval for emergency + rebirth.
 */
export async function GET() {
  try {
    const tenantId = await getActiveTenantUuidFromCookies();
    const snap = await syncConstitutionalIntegrityEnforcement(tenantId);
    if (snap.isConstitutionalEmergency) {
      await checkAndExecuteDeadMansSwitch(true, tenantId);
    }
    const deadManSwitch = await getDeadManSwitchStatus(snap.isConstitutionalEmergency, tenantId);
    const governance = await readGovernanceMaturityState();
    const cfg = await prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: {
        sustainabilityLiveApiDegraded: true,
        sustainabilityApiDegradedSince: true,
        sustainabilityStaleLockdownWaived: true,
      },
    });
    const lock = computeSustainabilityStaleLockdown(cfg);
    const requiredForensicAttestationMin = Math.max(
      snap.requiredForensicAttestationMin,
      governance?.current?.neutralizeMinChars ?? 50,
    );
    return NextResponse.json(
      {
        isConstitutionalEmergency: snap.isConstitutionalEmergency,
        deadManSwitch,
        systemMaturityScore: governance?.current?.score ?? null,
        governanceDegradationActive: governance?.current?.governanceDegradationActive ?? false,
        requiredForensicAttestationMin,
        isSustainabilityApiDegraded: cfg?.sustainabilityLiveApiDegraded === true,
        isSustainabilityStaleLockdownBlocking: lock.blockingMutations,
        sustainabilityStaleLockdownHours: lock.hoursDegraded,
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
      },
      {
        status: snap.isConstitutionalEmergency && !snap.constitutionalDegradedMode ? 503 : 200,
        headers: {
          "Cache-Control": "no-store",
          "X-Constitutional-Emergency": snap.isConstitutionalEmergency ? "1" : "0",
          "X-Constitutional-Rebaseline": snap.constitutionalRebaselinePending ? "1" : "0",
          "X-Constitutional-Degraded": snap.constitutionalDegradedMode ? "1" : "0",
        },
      },
    );
  } catch (e) {
    console.error("[api/grc/tas-integrity]", e);
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
