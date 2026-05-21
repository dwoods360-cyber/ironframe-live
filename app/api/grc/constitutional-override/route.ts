import { NextResponse } from "next/server";

import { SYSTEM_OWNER_ID } from "@/app/config/constitutionalAuthority";
import type { EmergencySealSegments } from "@/app/lib/emergencySeal";
import { requireSystemOwnerSession } from "@/app/lib/constitutionalOwnerSession";
import {
  recordEntryWitness,
  verifyCisoStaffWitnessCollusion,
} from "@/app/lib/entryWitness";
import { getEmergencySealRecord } from "@/app/lib/emergencySeal";
import { markPhoenixUnlockedForTripartiteOverride } from "@/app/lib/phoenixResurrection";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { SECURITY_POSTURE_TRIPARTITE_LOCK } from "@/app/config/securityPosture";
import { applyConstitutionalOwnerOverride } from "@/app/utils/tasFingerprint";

export const dynamic = "force-dynamic";

const WITNESS_CONTEXT = "constitutional-override";

function parseOverrideInput(body: Record<string, unknown>):
  | string
  | (EmergencySealSegments & { overrideKey?: string })
  | null {
  const legacy =
    typeof body.overrideKey === "string"
      ? body.overrideKey
      : typeof body.key === "string"
        ? body.key
        : "";
  if (legacy.trim()) {
    return legacy.trim();
  }

  const vault = typeof body.vault === "string" ? body.vault.trim() : "";
  if (!vault) return null;

  const human = typeof body.human === "string" ? body.human.trim() : "";
  const ciso = typeof body.ciso === "string" ? body.ciso.trim() : "";
  const staff = typeof body.staff === "string" ? body.staff.trim() : "";

  if (human) {
    return { vault, human };
  }
  if (ciso && staff) {
    return { vault, ciso, staff };
  }
  return null;
}

/**
 * Nuclear one-time override — SYSTEM_OWNER_ID spends override key and triggers SYSTEM_REBIRTH.
 */
export async function POST(request: Request) {
  try {
    await requireSystemOwnerSession();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const input = parseOverrideInput(body);
    if (!input) {
      return NextResponse.json(
        { ok: false, error: "Provide override segments (vault + human, or vault + ciso + staff)." },
        { status: 400 },
      );
    }

    if (typeof input !== "string" && input.ciso && input.staff) {
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
    }

    const result = await applyConstitutionalOwnerOverride(input, SYSTEM_OWNER_ID);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 403 });
    }

    const seal = await getEmergencySealRecord();
    const isTripartite =
      typeof input !== "string" &&
      !input.overrideKey &&
      Boolean(input.ciso && input.staff) &&
      (seal?.posture === SECURITY_POSTURE_TRIPARTITE_LOCK || !seal);
    if (isTripartite) {
      const tenantId = await getActiveTenantUuidFromCookies();
      markPhoenixUnlockedForTripartiteOverride({
        tenantId,
        constitutionalHash: result.sha256,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        isOverrideSpent: true,
        constitutionalHash: result.sha256,
        priorState: result.priorState,
        isConstitutionalEmergency: false,
        constitutionalDegradedMode: false,
        requiredForensicAttestationMin: 50,
        authorizedBy: SYSTEM_OWNER_ID,
        phoenixUnlocked: isTripartite,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "X-Ironframe-Client-Refresh": "1",
          "X-Constitutional-Rebirth": "1",
        },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Override rejected.";
    const status = /Authentication|SYSTEM_OWNER/i.test(msg) ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
