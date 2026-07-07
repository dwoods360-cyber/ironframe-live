import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

import type { IronleadsIngressPayload } from "@/app/lib/ingress/ironleadsIngressSchema";
import {
  classifyVulnerability,
  computeQualificationScores,
  isTriggerSignal,
  priorityScoreFromSignals,
  type QualificationInput,
  type TriggerSignal,
} from "@/Ironboard/src/services/crm/leadPrioritization";
import { isBeachheadSector } from "@/Ironboard/src/types/crm";
import prisma from "@/lib/prisma";

export type IronleadsIngressResult = {
  tenantId: string;
  contact: {
    id: string;
    priorityScore: number;
    vulnerabilityClass: "HIGH" | "MEDIUM" | "LOW";
  };
  deal: {
    id: string;
    stage: string;
  };
};

function sanitizeText(raw: unknown, maxLen: number): string {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "[STRIPPED]")
    .trim()
    .slice(0, maxLen);
}

async function bindIronguardTenant(tx: Prisma.TransactionClient, tenantId: string): Promise<void> {
  try {
    await tx.$executeRaw`SELECT ironguard_set_session_tenant(${tenantId}::uuid);`;
  } catch {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true);`;
  }
}

function qualificationInput(
  industrySector: IronleadsIngressPayload["industrySector"],
  detectedTrigger: string,
  triggers: TriggerSignal[],
): QualificationInput {
  return {
    industrySector,
    detectedTrigger,
    triggers,
    painMarkers: { fragmentedGrc: true },
  };
}

/**
 * Irongate perimeter ingress for Ironleads — creates SUSPECT-stage contact + deal.
 * Lives in the Next.js app layer so webpack never bundles Ironboard's NodeNext `.js` imports.
 */
export async function ingestIronleadsLead(input: IronleadsIngressPayload): Promise<IronleadsIngressResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: sanitizeText(input.targetTenantSlug, 63) },
    select: { id: true },
  });
  if (!tenant) throw new Error(`TARGET_TENANT_NOT_FOUND: ${input.targetTenantSlug}`);

  const companyName = sanitizeText(input.companyName, 255);
  if (!companyName || companyName.length < 2) throw new Error("companyName is required");

  if (!isBeachheadSector(input.industrySector)) {
    throw new Error(`Invalid industrySector "${input.industrySector}"`);
  }

  const detectedTrigger = sanitizeText(input.detectedTrigger, 120);
  if (!detectedTrigger || detectedTrigger.length < 2) throw new Error("detectedTrigger is required");

  const contactEmail = input.contactEmail
    ? sanitizeText(input.contactEmail, 320).toLowerCase()
    : `suspect+${randomUUID().slice(0, 8)}@ironleads.local`;

  const contactName = sanitizeText(input.contactName ?? "Ironleads Prospect", 200);

  const triggers = detectedTrigger
    .split(/[,|]/)
    .map((part) => part.trim().toUpperCase())
    .filter((part): part is TriggerSignal => isTriggerSignal(part));

  const qualification = computeQualificationScores(
    qualificationInput(input.industrySector, detectedTrigger, triggers),
  );
  const priorityScore = priorityScoreFromSignals(qualification);
  const vulnerabilityClass = classifyVulnerability(qualification);

  return prisma.$transaction(async (tx) => {
    await bindIronguardTenant(tx, tenant.id);

    const contactRow = await tx.ironboardCrmContact.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        fullName: contactName,
        email: contactEmail,
        company: companyName,
        title: "Suspect — autonomous harvest",
        industrySector: input.industrySector,
        detectedTrigger,
        ingestionSource: "AUTONOMOUS_CRAWLER",
        priorityScore,
        qualificationSignals: qualification as unknown as Prisma.InputJsonValue,
      },
    });

    const dealRow = await tx.ironboardCrmDeal.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        title: `${companyName} — OSINT suspect`,
        stage: "SUSPECT",
        valueCents: 0n,
        primaryContactId: contactRow.id,
        accountDomain: input.accountDomain ? sanitizeText(input.accountDomain, 255) : null,
        notes: `Ironleads ingress | trigger=${detectedTrigger}`,
      },
    });

    return {
      tenantId: tenant.id,
      contact: {
        id: contactRow.id,
        priorityScore,
        vulnerabilityClass,
      },
      deal: {
        id: dealRow.id,
        stage: dealRow.stage,
      },
    };
  });
}
