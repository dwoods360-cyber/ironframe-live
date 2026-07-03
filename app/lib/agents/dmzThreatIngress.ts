import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";
import { scanPayload } from "@/app/lib/agents/ironlock";
import { generateIronqueryInsight } from "@/app/lib/agents/ironquery";
import { dispatchIronlockQuarantineAutoEscalation } from "@/app/utils/ironlockQuarantineAutoEscalation";
import {
  INGEST_SALT_PEPPER_MISSING,
  sanitizeIngressJsonString,
} from "@/app/lib/ironethic/ingressSanitizer";

export class IronethicIngressConfigurationError extends Error {
  constructor(message: string = INGEST_SALT_PEPPER_MISSING) {
    super(message);
    this.name = "IronethicIngressConfigurationError";
  }
}

function sanitizeDmzDetailsOrThrow(detailsBody: string): string {
  try {
    return sanitizeIngressJsonString(detailsBody) ?? detailsBody;
  } catch (err) {
    if (err instanceof Error && err.message.includes("INGEST_SALT_PEPPER")) {
      throw new IronethicIngressConfigurationError(err.message);
    }
    throw err;
  }
}

export type BuildDmzIngressResult = {
  action: string;
  details: string;
  quarantined: boolean;
};

/**
 * Applies Ironlock scan before persisting pipeline threat activity (primary DB ThreatEvent).
 */
export function buildIronlockDmzWrite(params: {
  threatId: string;
  intendedAction: string;
  /** Stored body: plain text or JSON string */
  detailsBody: string;
  /** Full text scanned for injection patterns */
  ingressScanText: string;
}): BuildDmzIngressResult {
  const { isMalicious, reason } = scanPayload(params.ingressScanText);
  if (isMalicious && reason) {
    let detailsOut: string;
    try {
      const parsed = JSON.parse(params.detailsBody) as Record<string, unknown>;
      detailsOut = JSON.stringify({
        ...parsed,
        ironlock: { flagged: true, reason },
        intendedAction: params.intendedAction,
      });
    } catch {
      detailsOut = JSON.stringify({
        note: params.detailsBody,
        ironlock: { flagged: true, reason },
        intendedAction: params.intendedAction,
      });
    }
    return {
      action: "QUARANTINED_BY_IRONLOCK",
      details: detailsOut,
      quarantined: true,
    };
  }
  return {
    action: params.intendedAction,
    details: params.detailsBody,
    quarantined: false,
  };
}

export async function writeDmzThreatActivityWithIronlock(params: {
  tenantId: string;
  threatId: string;
  intendedAction: string;
  detailsBody: string;
  ingressScanText: string;
}): Promise<BuildDmzIngressResult> {
  const company = await prisma.company.findFirst({
    where: { tenantId: params.tenantId },
    select: { id: true },
  });
  if (!company) {
    throw new Error("Irongate: no company row for tenant; cannot create pipeline threat.");
  }

  const detailsBody = sanitizeDmzDetailsOrThrow(params.detailsBody);
  const built = buildIronlockDmzWrite({ ...params, detailsBody });
  const payloadString = JSON.stringify({
    tenantId: params.tenantId,
    threatId: params.threatId,
    intendedAction: params.intendedAction,
    resolvedDmzAction: built.action,
    quarantinedByIronlock: built.quarantined,
    details: built.details,
  });
  const ironqueryInsight = await generateIronqueryInsight(payloadString);

  const created = await prisma.threatEvent.create({
    data: {
      title: `Irongate: ${params.threatId}`,
      sourceAgent: built.action,
      score: 9,
      targetEntity: "Irongate",
      financialRisk_cents: 0n,
      tenantCompanyId: company.id,
      status: built.quarantined ? ThreatState.MITIGATED : ThreatState.IDENTIFIED,
      ingestionDetails: sanitizeDmzDetailsOrThrow(built.details),
      aiReport: ironqueryInsight,
    },
    select: { id: true },
  });

  console.info(
    "[EPIC12_WORM_LEDGER] ThreatEvent append-only ingest",
    JSON.stringify({
      threatEventId: created.id,
      tenantId: params.tenantId,
      dmzAction: built.action,
      wormImmutable: true,
    }),
  );

  if (built.quarantined) {
    void dispatchIronlockQuarantineAutoEscalation({
      threatId: created.id,
      tenantUuid: params.tenantId,
      previousStatus: null,
    });
  }

  return built;
}
