import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { SECURITY_POSTURE_TRIPARTITE_LOCK } from "@/app/config/securityPosture";
import { computeSustainabilityStaleLockdown } from "@/app/config/sustainabilityStaleLockdown";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import prisma from "@/lib/prisma";
import { requireSystemOwnerSession } from "@/app/lib/constitutionalOwnerSession";
import {
  recordEntryWitness,
  verifyCisoStaffWitnessCollusion,
} from "@/app/lib/entryWitness";
import { composeMasterSealFromSegments, getEmergencySealRecord } from "@/app/lib/emergencySeal";
import { hashStaleLockdownWitnessPayload } from "@/app/lib/sustainabilityStaleLockdownWitness";
import { recalculateSystemMaturityScore } from "@/app/services/governanceScoring";
import {
  IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS,
  readGovernanceMaturityStateSync,
} from "@/app/lib/governanceMaturityState";
import { validateForensicJustification } from "@/app/utils/validateJustification";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { executeEmergencyOverride } from "@/app/lib/executeEmergencyOverride";

export const dynamic = "force-dynamic";

const WITNESS_CONTEXT = "sustainability-stale-lockdown-waiver";

export async function POST(request: NextRequest) {
  try {
    await requireSystemOwnerSession();
    const row = await prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: {
        sustainabilityLiveApiDegraded: true,
        sustainabilityApiDegradedSince: true,
        sustainabilityStaleLockdownWaived: true,
      },
    });
    if (!row) {
      return NextResponse.json({ ok: false, error: "System configuration row missing." }, { status: 500 });
    }
    const lock = computeSustainabilityStaleLockdown(row);
    if (!lock.staleDataLockdownWindow) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Stale-data waiver only applies after 24h consecutive sustainability API outage (Irontech lockdown).",
        },
        { status: 400 },
      );
    }
    if (row?.sustainabilityStaleLockdownWaived) {
      return NextResponse.json({ ok: true, alreadyWaived: true }, { status: 200 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const vault = typeof body.vault === "string" ? body.vault.trim().toLowerCase() : "";
    const ciso = typeof body.ciso === "string" ? body.ciso.trim().toLowerCase() : "";
    const staff = typeof body.staff === "string" ? body.staff.trim().toLowerCase() : "";
    const forensicJustification =
      typeof body.forensicJustification === "string" ? body.forensicJustification.trim() : "";
    if (!vault || !ciso || !staff) {
      return NextResponse.json(
        { ok: false, error: "Tripartite split-keys required: vault, ciso, staff." },
        { status: 400 },
      );
    }
    if (forensicJustification.length < IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS) {
      return NextResponse.json(
        {
          ok: false,
          error: `Mandatory ${IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS}-character forensic justification required to waiver stale-data outage (Ironlock).`,
        },
        { status: 422 },
      );
    }
    const forensicQuality = validateForensicJustification(
      forensicJustification,
      IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS,
    );
    if (!forensicQuality.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Forensic justification failed entropy / quality gates (Ironlock).",
          reason: forensicQuality.reason,
        },
        { status: 422 },
      );
    }

    const cisoWitness = await recordEntryWitness({
      request,
      context: WITNESS_CONTEXT,
      custodianRole: "CISO",
    });
    const staffWitness = await recordEntryWitness({
      request,
      context: WITNESS_CONTEXT,
      custodianRole: "STAFF",
    });
    const collusion = await verifyCisoStaffWitnessCollusion({
      context: WITNESS_CONTEXT,
      cisoFingerprint: cisoWitness.fingerprintHash,
      staffFingerprint: staffWitness.fingerprintHash,
      secondaryMfaToken:
        typeof body.secondaryMfaToken === "string" ? body.secondaryMfaToken : undefined,
    });
    if (!collusion.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: collusion.message,
          collusionDetected: true,
          requiresSecondaryMfa: collusion.requiresSecondaryMfa,
        },
        { status: 403 },
      );
    }

    const seal = await getEmergencySealRecord();
    if (!seal || seal.posture !== SECURITY_POSTURE_TRIPARTITE_LOCK) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "TRIPARTITE_LOCK emergency seal required (Vault + CISO + Staff) for stale-data operations waiver.",
        },
        { status: 403 },
      );
    }

    const composed = composeMasterSealFromSegments(SECURITY_POSTURE_TRIPARTITE_LOCK, {
      vault,
      ciso,
      staff,
    });
    if (!composed) {
      return NextResponse.json(
        { ok: false, error: "Invalid segment lengths or hex characters." },
        { status: 400 },
      );
    }
    const derivedSha = createHash("sha256").update(composed, "utf8").digest("hex");
    if (derivedSha !== seal.masterSha256) {
      return NextResponse.json({ ok: false, error: "Seal verification failed." }, { status: 403 });
    }

    const forensicJustificationSha256 = createHash("sha256")
      .update(forensicJustification, "utf8")
      .digest("hex");

    const witnessPayload = {
      event: "SUSTAINABILITY_STALE_LOCKDOWN_WAIVER",
      agent: "IRONTECH_AGENT_12",
      derivedSha256: derivedSha,
      entryWitnessCiso: cisoWitness.witnessId,
      entryWitnessStaff: staffWitness.witnessId,
      forensicJustificationSha256,
    };
    const witnessSha256 = hashStaleLockdownWitnessPayload(witnessPayload);

    const outageAnchorSince = row.sustainabilityApiDegradedSince ?? null;
    const maturityScoreBefore = readGovernanceMaturityStateSync().current.score;

    await prisma.systemConfig.update({
      where: { id: "global" },
      data: {
        sustainabilityStaleLockdownWaived: true,
        stateFreezeEscalatedAt: null,
        stateFreezeVoiceDispatchedAt: null,
      },
    });

    await auditLogCreateLoose({
      data: {
        action: "SUSTAINABILITY_STALE_LOCKDOWN_WAIVER",
        justification: JSON.stringify({
          ...witnessPayload,
          witnessSha256,
          forensicJustification,
          message:
            "Irontech (Agent 12): tripartite stale-data waiver — Vault+CISO+Staff segments reconstituted; EntryWitness rows linked; mandatory forensic justification on file; mutations resume while live feed remains unhealthy until Ironwatch recovery clears waiver.",
        }),
        operatorId: "SYSTEM_OWNER_STALE_DATA_WAIVER",
        threatId: null,
        isSimulation: false,
      },
    });

    const tWaiver = new Date();

    await recalculateSystemMaturityScore({ trigger: "SUSTAINABILITY_STALE_LOCKDOWN_WAIVER" });

    const maturityScoreAfter = readGovernanceMaturityStateSync().current.score;
    const tenantId = await getActiveTenantUuidFromCookies();

    try {
      await executeEmergencyOverride({
        kind: "STALE_DATA_TRIPARTITE_WAIVER",
        postMortem: {
          tenantId,
          outageAnchorSince,
          tWaiver,
          witnessSha256,
          forensicJustification,
          maturityScoreBefore,
          maturityScoreAfter,
        },
      });
    } catch (pmErr) {
      console.error("[Ironscribe] post-mortem hook failed (waiver still committed)", pmErr);
    }

    return NextResponse.json(
      { ok: true, witnessSha256 },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "X-Ironframe-Client-Refresh": "1",
        },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Waiver rejected.";
    const status = /Authentication|SYSTEM_OWNER/i.test(msg) ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
