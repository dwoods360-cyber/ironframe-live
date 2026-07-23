import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

import {
  PENDING_SALES_DRAFT_TAG,
} from "@/app/lib/server/approvalQueueCore";
import type { SalesteamOutreachPayload } from "@/app/lib/ingress/salesteamIngressSchema";
import prisma from "@/lib/prisma";

const SALESTEAM_EXECUTION_SOURCE = "salesTeamPoll | Channel:";

export type SalesteamProspectWire = {
  dealId: string;
  contactId: string;
  tenantId: string;
  stage: string;
  dealTitle: string;
  valueCents: string;
  company: string;
  fullName: string;
  email: string;
  phone: string | null;
  industrySector: string | null;
  detectedTrigger: string | null;
  priorityScore: number;
  updatedAt: string;
};

function sanitizeText(raw: unknown, maxLen: number): string {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "[STRIPPED]")
    .trim()
    .slice(0, maxLen);
}

/** Draft bodies need paragraph breaks — keep \\n / \\r / \\t; strip other controls. */
function sanitizeMultilineText(raw: unknown, maxLen: number): string {
  return String(raw ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "[STRIPPED]")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maxLen);
}

/** Operator-only cadence tags must not sit in customer-facing body text. */
function peelCadenceFooter(body: string): { body: string; cadenceLine: string | null } {
  const match = body.match(/\n*\[Cadence:\s*([^\]]+)\]\s*$/i);
  if (!match) return { body: body.trim(), cadenceLine: null };
  return {
    body: body.replace(/\n*\[Cadence:\s*[^\]]+\]\s*$/i, "").trim(),
    cadenceLine: `Cadence: ${match[1]!.trim()}`,
  };
}

async function bindIronguardTenant(tx: Prisma.TransactionClient, tenantId: string): Promise<void> {
  try {
    await tx.$executeRaw`SELECT ironguard_set_session_tenant(${tenantId}::uuid);`;
  } catch {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true);`;
  }
}

export function buildSalesTeamPendingDraftSummary(input: {
  subject: string;
  body: string;
  channel: SalesteamOutreachPayload["channel"];
  industrySector: string;
  lossExposureCents?: string;
}): string {
  const { body, cadenceLine } = peelCadenceFooter(input.body);
  const lossLine = input.lossExposureCents
    ? `Quantified loss exposure (¢): ${input.lossExposureCents}`
    : "Quantified loss exposure (¢): pending operator baseline bind";
  return [
    `${PENDING_SALES_DRAFT_TAG} ${input.subject}`,
    "--- Agent Proposed Reply Text ---",
    body,
    "--- Prospect Context ---",
    `Beachhead Sector: ${input.industrySector}`,
    lossLine,
    cadenceLine,
    `Execution Source: ${SALESTEAM_EXECUTION_SOURCE}${input.channel}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Poll queue — PROSPECT-stage deals for a tenant, ordered by contact priority.
 * SalesTeam worker tracks processed deal IDs locally; this endpoint is read-only.
 */
export async function listSalesteamProspectQueue(
  tenantSlugRaw: string,
  limitRaw = 50,
): Promise<{ tenantId: string; prospects: SalesteamProspectWire[]; polledAt: string }> {
  const tenantSlug = sanitizeText(tenantSlugRaw, 63);
  const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 100);

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) throw new Error(`TARGET_TENANT_NOT_FOUND: ${tenantSlug}`);

  return prisma.$transaction(async (tx) => {
    await bindIronguardTenant(tx, tenant.id);

    const deals = await tx.ironboardCrmDeal.findMany({
      where: { tenantId: tenant.id, stage: "PROSPECT" },
      include: { primaryContact: true },
      orderBy: [{ updatedAt: "desc" }],
      take: limit,
    });

    const prospects: SalesteamProspectWire[] = [];
    for (const deal of deals) {
      const contact = deal.primaryContact;
      if (!contact) continue;
      prospects.push({
        dealId: deal.id,
        contactId: contact.id,
        tenantId: tenant.id,
        stage: deal.stage,
        dealTitle: deal.title,
        valueCents: deal.valueCents.toString(),
        company: contact.company,
        fullName: contact.fullName,
        email: contact.email,
        phone: contact.phone,
        industrySector: contact.industrySector,
        detectedTrigger: contact.detectedTrigger,
        priorityScore: contact.priorityScore,
        updatedAt: deal.updatedAt.toISOString(),
      });
    }

    return {
      tenantId: tenant.id,
      prospects,
      polledAt: new Date().toISOString(),
    };
  });
}

/** Queue outreach draft for mandatory human approval — never dispatches live. */
export async function submitSalesteamOutreachDraft(
  input: SalesteamOutreachPayload,
): Promise<{ interactionId: string; tenantId: string; status: "PENDING_HUMAN_REVIEW" }> {
  const tenantSlug = sanitizeText(input.tenantSlug, 63);
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) throw new Error(`TARGET_TENANT_NOT_FOUND: ${tenantSlug}`);

  const dealId = sanitizeText(input.dealId, 36);
  const contactId = sanitizeText(input.contactId, 36);
  const subject = sanitizeText(input.subject, 200);
  const body = sanitizeMultilineText(input.body, 12_000);

  return prisma.$transaction(async (tx) => {
    await bindIronguardTenant(tx, tenant.id);

    const deal = await tx.ironboardCrmDeal.findFirst({
      where: { id: dealId, tenantId: tenant.id, stage: "PROSPECT" },
      select: { id: true },
    });
    if (!deal) throw new Error(`PROSPECT_DEAL_NOT_FOUND: ${dealId}`);

    const contact = await tx.ironboardCrmContact.findFirst({
      where: { id: contactId, tenantId: tenant.id },
      select: { id: true },
    });
    if (!contact) throw new Error(`CONTACT_NOT_FOUND: ${contactId}`);

    const interaction = await tx.ironboardCrmInteraction.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        contactId: contact.id,
        dealId: deal.id,
        channel: input.channel === "SMS" ? "OTHER" : "EMAIL",
        summary: buildSalesTeamPendingDraftSummary({
          subject,
          body,
          channel: input.channel,
          industrySector: input.industrySector,
          lossExposureCents: input.lossExposureCents,
        }),
        occurredAt: new Date(),
      },
    });

    return {
      interactionId: interaction.id,
      tenantId: tenant.id,
      status: "PENDING_HUMAN_REVIEW" as const,
    };
  });
}
