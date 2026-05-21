import "server-only";

import { timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { clientIpFromRequest, fingerprintHashFromRequest } from "@/app/lib/requestForensics";

export const COLLUSION_WARNING_ACTION = "COLLUSION_WARNING";

export type WitnessCustodianRole = "CISO" | "STAFF" | "CEO" | "CFO" | "CIO" | "VAULT";

export type RecordWitnessResult = {
  witnessId: string;
  clientIp: string;
  fingerprintHash: string;
};

export async function recordEntryWitness(params: {
  request: Request;
  context: string;
  custodianRole: WitnessCustodianRole;
}): Promise<RecordWitnessResult> {
  const clientIp = clientIpFromRequest(params.request);
  const fingerprintHash = fingerprintHashFromRequest(params.request);

  let witnessId = `witness-${Date.now()}`;
  try {
    const row = await prisma.entryWitness.create({
      data: {
        context: params.context,
        custodianRole: params.custodianRole,
        clientIp,
        fingerprintHash,
      },
    });
    witnessId = row.id;
  } catch {
    /* table may not exist yet */
  }

  return { witnessId, clientIp, fingerprintHash };
}

export async function recordEntryWitnessDirect(params: {
  context: string;
  custodianRole: WitnessCustodianRole;
  clientIp: string;
  fingerprintHash: string;
}): Promise<RecordWitnessResult> {
  let witnessId = `witness-${Date.now()}`;
  try {
    const row = await prisma.entryWitness.create({
      data: {
        context: params.context,
        custodianRole: params.custodianRole,
        clientIp: params.clientIp,
        fingerprintHash: params.fingerprintHash,
      },
    });
    witnessId = row.id;
  } catch {
    /* table may not exist yet */
  }
  return {
    witnessId,
    clientIp: params.clientIp,
    fingerprintHash: params.fingerprintHash,
  };
}

export type CollusionCheckResult =
  | { ok: true }
  | {
      ok: false;
      collusionDetected: true;
      message: string;
      requiresSecondaryMfa: true;
    };

function verifySecondaryMfaToken(token: string | null | undefined): boolean {
  const expected = process.env.SECONDARY_BIOMETRIC_MFA_TOKEN?.trim();
  if (!expected) return false;
  const submitted = (token ?? "").trim();
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(submitted, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Compare CISO and Staff fingerprints from the same context — exact match triggers collusion gate.
 */
export async function verifyCisoStaffWitnessCollusion(params: {
  context: string;
  cisoFingerprint: string;
  staffFingerprint: string;
  secondaryMfaToken?: string | null;
}): Promise<CollusionCheckResult> {
  if (params.cisoFingerprint !== params.staffFingerprint) {
    return { ok: true };
  }

  try {
    await auditLogCreateLoose({
      data: {
        action: COLLUSION_WARNING_ACTION,
        justification: JSON.stringify({
          event: "COLLUSION_WARNING",
          context: params.context,
          message:
            "CISO and Staff entry witnesses share an identical client fingerprint — possible same-machine collusion.",
          cisoFingerprint: params.cisoFingerprint,
          staffFingerprint: params.staffFingerprint,
        }),
        operatorId: "SYSTEM_WITNESS",
        threatId: null,
        isSimulation: false,
        governance_tenant_uuid: TENANT_UUIDS.medshield,
      },
    });
  } catch (e) {
    console.error("[entryWitness] COLLUSION_WARNING audit failed", e);
  }

  if (verifySecondaryMfaToken(params.secondaryMfaToken)) {
    return { ok: true };
  }

  return {
    ok: false,
    collusionDetected: true,
    requiresSecondaryMfa: true,
    message:
      "[COLLUSION_WARNING] CISO and Staff fingerprints match (same machine suspected). Secondary biometric/MFA required.",
  };
}
