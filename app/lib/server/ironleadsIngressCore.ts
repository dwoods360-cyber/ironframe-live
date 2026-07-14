import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

import type { IronleadsIngressPayload } from "@/app/lib/ingress/ironleadsIngressSchema";
import { normalizeAccountDomain } from "@/app/lib/ingress/ironleadsSuspectIdentity";
import {
  classifyVulnerability,
  computeQualificationScores,
  isBeachheadSector,
  isTriggerSignal,
  priorityScoreFromSignals,
  type QualificationInput,
  type TriggerSignal,
} from "@/lib/crm/leadPrioritization";
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
  /** True when an existing SUSPECT for the same company/domain was refreshed instead of created. */
  deduped: boolean;
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
 * Reuses an existing SUSPECT for the same tenant company or account domain instead of stacking clones.
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

  const accountDomain = normalizeAccountDomain(
    input.accountDomain ? sanitizeText(input.accountDomain, 255) : null,
  );

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

    const existingByDomain = accountDomain
      ? await tx.ironboardCrmDeal.findFirst({
          where: {
            tenantId: tenant.id,
            stage: "SUSPECT",
            accountDomain: { equals: accountDomain, mode: "insensitive" },
          },
          include: { primaryContact: true },
          orderBy: { updatedAt: "desc" },
        })
      : null;

    const existingContact =
      existingByDomain?.primaryContact ??
      (await tx.ironboardCrmContact.findFirst({
        where: {
          tenantId: tenant.id,
          company: { equals: companyName, mode: "insensitive" },
          primaryDeals: { some: { stage: "SUSPECT" } },
        },
        include: {
          primaryDeals: {
            where: { stage: "SUSPECT" },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
      }));

    if (existingContact) {
      const existingDeal =
        existingByDomain ??
        ("primaryDeals" in existingContact ? existingContact.primaryDeals[0] : null) ??
        (await tx.ironboardCrmDeal.findFirst({
          where: {
            tenantId: tenant.id,
            stage: "SUSPECT",
            primaryContactId: existingContact.id,
          },
          orderBy: { updatedAt: "desc" },
        }));

      const contactRow = await tx.ironboardCrmContact.update({
        where: { id: existingContact.id },
        data: {
          fullName: contactName,
          industrySector: input.industrySector,
          detectedTrigger,
          priorityScore: Math.max(existingContact.priorityScore, priorityScore),
          qualificationSignals: qualification as unknown as Prisma.InputJsonValue,
          ingestionSource: "AUTONOMOUS_CRAWLER",
        },
      });

      const dealRow = existingDeal
        ? await tx.ironboardCrmDeal.update({
            where: { id: existingDeal.id },
            data: {
              title: `${companyName} — OSINT suspect`,
              accountDomain,
              notes: `Ironleads ingress (deduped) | trigger=${detectedTrigger} | priorScore=${existingContact.priorityScore}`,
            },
          })
        : await tx.ironboardCrmDeal.create({
            data: {
              id: randomUUID(),
              tenantId: tenant.id,
              title: `${companyName} — OSINT suspect`,
              stage: "SUSPECT",
              valueCents: 0n,
              primaryContactId: contactRow.id,
              accountDomain,
              notes: `Ironleads ingress | trigger=${detectedTrigger}`,
            },
          });

      return {
        tenantId: tenant.id,
        contact: {
          id: contactRow.id,
          priorityScore: contactRow.priorityScore,
          vulnerabilityClass,
        },
        deal: {
          id: dealRow.id,
          stage: dealRow.stage,
        },
        deduped: true,
      };
    }

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
        accountDomain,
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
      deduped: false,
    };
  });
}
