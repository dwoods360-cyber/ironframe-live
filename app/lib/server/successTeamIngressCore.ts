import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { PENDING_CS_ADVISORY_TAG } from "@/app/lib/server/approvalQueueCore";
import type { SuccessTeamAdvisoryPayload } from "@/app/lib/ingress/successTeamIngressSchema";
import prisma from "@/lib/prisma";

const SUCCESS_TEAM_EXECUTION_SOURCE = "successTeamPoll | Advisory:";

export type SuccessTeamAccountWire = {
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
  updatedAt: string;
  lastInteractionAt: string | null;
  daysSinceInteraction: number | null;
};

export type SuccessTeamHealthSnapshotWire = {
  dealId: string;
  tenantId: string;
  contactId: string;
  stage: string;
  valueCents: string;
  industrySector: string | null;
  healthScore: number;
  healthBand: "healthy" | "watch" | "at_risk" | "critical";
  signals: string[];
  pilotMetadata: Record<string, unknown> | null;
  lastInteractionAt: string | null;
  daysSinceInteraction: number | null;
  polledAt: string;
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

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function parsePilotMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  return metadata as Record<string, unknown>;
}

function computeHealthScore(input: {
  daysSinceInteraction: number | null;
  evidenceCompletenessPct: number | null;
  hasFirstAction: boolean;
  gateBRecentPass: boolean;
  valueCents: bigint;
  industrySector: string | null;
}): { healthScore: number; healthBand: SuccessTeamHealthSnapshotWire["healthBand"]; signals: string[] } {
  let score = 100;
  const signals: string[] = [];
  const days = input.daysSinceInteraction ?? 999;

  if (days >= 30) {
    const blocks = Math.min(4, Math.floor(days / 30));
    score -= blocks * 10;
    signals.push("STALE_ENGAGEMENT");
  }
  if (days >= 60) {
    score -= 20;
    signals.push("CRITICAL_SILENCE");
  }

  const evidence = input.evidenceCompletenessPct;
  const evidenceThreshold = input.industrySector === "HEALTH_HIPAA" ? 70 : 70;
  const evidencePenalty = input.industrySector === "HEALTH_HIPAA" ? 20 : 15;
  if (evidence !== null && evidence < evidenceThreshold) {
    score -= evidencePenalty;
    signals.push("LOW_EVIDENCE_COMPLETENESS");
  }

  if (!input.hasFirstAction) {
    score -= 10;
    signals.push("MISSING_FIRST_ACTION");
  }

  if (input.gateBRecentPass) {
    score = Math.min(100, score + 5);
  }

  if (input.valueCents >= 5_000_000n) {
    score = Math.min(100, score + 5);
  }

  score = Math.max(0, Math.min(100, score));

  let healthBand: SuccessTeamHealthSnapshotWire["healthBand"];
  if (score >= 80) healthBand = "healthy";
  else if (score >= 60) healthBand = "watch";
  else if (score >= 40) healthBand = "at_risk";
  else healthBand = "critical";

  return { healthScore: score, healthBand, signals };
}

function buildSuccessTeamPendingAdvisorySummary(input: {
  subject: string;
  body: string;
  advisoryType: SuccessTeamAdvisoryPayload["advisoryType"];
  industrySector: string;
  healthScore: number;
  healthBand: string;
  valueCents?: string;
  corpusPlayIds?: string[];
}): string {
  const valueLine = input.valueCents
    ? `Account value (¢): ${input.valueCents}`
    : "Account value (¢): pending operator bind";
  const plays = input.corpusPlayIds?.length
    ? `Corpus plays: ${input.corpusPlayIds.join(", ")}`
    : "Corpus plays: default retention/expansion bundle";
  return [
    `${PENDING_CS_ADVISORY_TAG} ${input.subject}`,
    "--- Agent Proposed Advisory Text ---",
    input.body.trim(),
    "--- Account Context ---",
    `Advisory Type: ${input.advisoryType}`,
    `Beachhead Sector: ${input.industrySector}`,
    `Health Score: ${input.healthScore} (${input.healthBand})`,
    valueLine,
    plays,
    `Execution Source: ${SUCCESS_TEAM_EXECUTION_SOURCE}${input.advisoryType}`,
  ].join("\n");
}

/** Poll queue — CLOSED_WON accounts for operator CRM tenant (read-only). */
export async function listSuccessTeamAccounts(
  tenantSlugRaw: string,
  limitRaw = 50,
): Promise<{ tenantId: string; accounts: SuccessTeamAccountWire[]; polledAt: string }> {
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
      where: { tenantId: tenant.id, stage: "CLOSED_WON" },
      include: {
        primaryContact: true,
        interactions: { orderBy: { occurredAt: "desc" }, take: 1 },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: limit,
    });

    const now = new Date();
    const accounts: SuccessTeamAccountWire[] = [];
    for (const deal of deals) {
      const contact = deal.primaryContact;
      if (!contact) continue;
      const lastIx = deal.interactions[0];
      const lastAt = lastIx?.occurredAt ?? null;
      accounts.push({
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
        updatedAt: deal.updatedAt.toISOString(),
        lastInteractionAt: lastAt?.toISOString() ?? null,
        daysSinceInteraction: lastAt ? daysBetween(lastAt, now) : null,
      });
    }

    return {
      tenantId: tenant.id,
      accounts,
      polledAt: now.toISOString(),
    };
  });
}

/** Deterministic health snapshot for a single CLOSED_WON account. */
export async function getSuccessTeamHealthSnapshot(
  tenantSlugRaw: string,
  dealIdRaw: string,
): Promise<SuccessTeamHealthSnapshotWire> {
  const tenantSlug = sanitizeText(tenantSlugRaw, 63);
  const dealId = sanitizeText(dealIdRaw, 36);

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) throw new Error(`TARGET_TENANT_NOT_FOUND: ${tenantSlug}`);

  return prisma.$transaction(async (tx) => {
    await bindIronguardTenant(tx, tenant.id);

    const deal = await tx.ironboardCrmDeal.findFirst({
      where: { id: dealId, tenantId: tenant.id, stage: "CLOSED_WON" },
      include: {
        primaryContact: true,
        interactions: { orderBy: { occurredAt: "desc" }, take: 1 },
      },
    });
    if (!deal?.primaryContact) throw new Error(`CLOSED_WON_DEAL_NOT_FOUND: ${dealId}`);

    const contact = deal.primaryContact;
    const pilotMeta = parsePilotMetadata(contact.metadata);
    const lastIx = deal.interactions[0];
    const lastAt = lastIx?.occurredAt ?? null;
    const now = new Date();
    const daysSince = lastAt ? daysBetween(lastAt, now) : null;

    const evidenceRaw = pilotMeta?.lastEvidenceCompletenessPct;
    const evidenceCompletenessPct =
      typeof evidenceRaw === "number"
        ? evidenceRaw
        : typeof evidenceRaw === "string"
          ? Number.parseInt(evidenceRaw, 10)
          : null;

    const hasFirstAction = Boolean(pilotMeta?.firstActionAt);
    const gateBRecentPass = pilotMeta?.lastQualified === true;

    const { healthScore, healthBand, signals } = computeHealthScore({
      daysSinceInteraction: daysSince,
      evidenceCompletenessPct: Number.isFinite(evidenceCompletenessPct) ? evidenceCompletenessPct : null,
      hasFirstAction,
      gateBRecentPass,
      valueCents: deal.valueCents,
      industrySector: contact.industrySector,
    });

    return {
      dealId: deal.id,
      tenantId: tenant.id,
      contactId: contact.id,
      stage: deal.stage,
      valueCents: deal.valueCents.toString(),
      industrySector: contact.industrySector,
      healthScore,
      healthBand,
      signals,
      pilotMetadata: pilotMeta,
      lastInteractionAt: lastAt?.toISOString() ?? null,
      daysSinceInteraction: daysSince,
      polledAt: now.toISOString(),
    };
  });
}

/** Queue CS advisory for mandatory human approval — never dispatches to client. */
export async function submitSuccessTeamAdvisory(
  input: SuccessTeamAdvisoryPayload,
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
  const body = sanitizeText(input.body, 12_000);

  return prisma.$transaction(async (tx) => {
    await bindIronguardTenant(tx, tenant.id);

    const deal = await tx.ironboardCrmDeal.findFirst({
      where: { id: dealId, tenantId: tenant.id, stage: "CLOSED_WON" },
      select: { id: true },
    });
    if (!deal) throw new Error(`CLOSED_WON_DEAL_NOT_FOUND: ${dealId}`);

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
        channel: "EMAIL",
        summary: buildSuccessTeamPendingAdvisorySummary({
          subject,
          body,
          advisoryType: input.advisoryType,
          industrySector: input.industrySector,
          healthScore: input.healthScore,
          healthBand: input.healthBand,
          valueCents: input.valueCents,
          corpusPlayIds: input.corpusPlayIds,
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
