import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

import {
  PENDING_DRAFT_TAG,
  PENDING_SUPPORT_INTAKE_TAG,
} from "@/app/lib/server/approvalQueueCore";
import type { SupportTeamReplyPayload } from "@/app/lib/ingress/supportTeamIngressSchema";
import { buildInTenantSupportTelemetry } from "@/app/lib/server/inTenantSupportTelemetry";
import prisma from "@/lib/prisma";

const SUPPORT_TEAM_EXECUTION_SOURCE = "supportTeamPoll | Severity:";

export type SupportTeamTicketWire = {
  interactionId: string;
  tenantId: string;
  contactId: string;
  company: string;
  fullName: string;
  email: string;
  urgency: string;
  objective: string;
  userNotes: string;
  frameworkContext: string | null;
  path: string | null;
  surface: string | null;
  incomingQuery: string;
  telemetryExcerpt: string | null;
  occurredAt: string;
};

export type SupportTeamContextSnapshotWire = {
  tenantId: string;
  tenantSlug: string;
  billingStatus: string | null;
  openThreatCount: number;
  ironguardViolationCount7d: number;
  frameworkContext: string | null;
  capturedAt: string;
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

function parseIntakeSummary(summary: string): {
  urgency: string;
  objective: string;
  userNotes: string;
  frameworkContext: string | null;
  path: string | null;
  surface: string | null;
  incomingQuery: string;
  telemetryExcerpt: string | null;
} {
  const urgency = summary.match(/--- Urgency ---\s*(\S+)/)?.[1]?.trim() ?? "ROUTINE";
  const objectiveLine = summary.match(/--- Objective ---\s*(.+)/)?.[1]?.trim() ?? "";
  const objective = objectiveLine.split("|")[0]?.trim() ?? "OTHER";
  const userNotes =
    summary.match(/--- Operator Details ---\s*([\s\S]*?)\s*--- Route \/ Framework ---/)?.[1]?.trim() ??
    "";
  const routeLine = summary.match(/--- Route \/ Framework ---\s*(.+)/)?.[1]?.trim() ?? "";
  const frameworkContext = routeLine.match(/framework=([^|]+)/)?.[1]?.trim() ?? null;
  const path = routeLine.match(/path=([^|]+)/)?.[1]?.trim() ?? null;
  const surface = routeLine.match(/surface=([^|]+)/)?.[1]?.trim() ?? null;

  const consoleIncoming =
    summary.match(/--- Incoming Query ---\s*([\s\S]*?)\s*--- (?:Forensic Telemetry|Tracking Core) ---/)?.[1]?.trim() ??
    "";
  const incomingQuery = consoleIncoming || userNotes || "(structured intake)";

  const telemetryMatch = summary.match(
    /--- Forensic Telemetry[\s\S]*?---\s*([\s\S]*?)(?:\n--- Tracking Core ---|$)/,
  );
  const telemetryExcerpt = telemetryMatch?.[1]?.trim().slice(0, 4_000) ?? null;

  return {
    urgency,
    objective,
    userNotes,
    frameworkContext: frameworkContext === "UNKNOWN" ? null : frameworkContext,
    path: path === "n/a" ? null : path,
    surface: surface === "n/a" ? null : surface,
    incomingQuery,
    telemetryExcerpt,
  };
}

function buildSupportTeamPendingDraftSummary(input: {
  subject: string;
  body: string;
  severityTier: SupportTeamReplyPayload["severityTier"];
  intakeInteractionId: string;
  corpusPlayIds?: string[];
}): string {
  const plays = input.corpusPlayIds?.length
    ? `Corpus plays: ${input.corpusPlayIds.join(", ")}`
    : "Corpus plays: default support bundle";
  return [
    `${PENDING_DRAFT_TAG} ${input.subject}`,
    "--- Agent Proposed Reply Text ---",
    input.body.trim(),
    "--- Tracking Core ---",
    `Intake Interaction: ${input.intakeInteractionId}`,
    `Severity Tier: ${input.severityTier}`,
    plays,
    `Execution Source: ${SUPPORT_TEAM_EXECUTION_SOURCE}${input.severityTier}`,
  ].join("\n");
}

/** Poll queue — support intake interactions awaiting SupportTeam worker (read-only). */
export async function listSupportTeamIntakeQueue(
  tenantSlugRaw: string,
  limitRaw = 50,
): Promise<{ tenantId: string; tickets: SupportTeamTicketWire[]; polledAt: string }> {
  const tenantSlug = sanitizeText(tenantSlugRaw, 63);
  const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 100);

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) throw new Error(`TARGET_TENANT_NOT_FOUND: ${tenantSlug}`);

  return prisma.$transaction(async (tx) => {
    await bindIronguardTenant(tx, tenant.id);

    const rows = await tx.ironboardCrmInteraction.findMany({
      where: {
        tenantId: tenant.id,
        summary: { contains: PENDING_SUPPORT_INTAKE_TAG },
        contactId: { not: null },
      },
      include: { contact: true },
      orderBy: { occurredAt: "asc" },
      take: limit,
    });

    const tickets: SupportTeamTicketWire[] = [];
    for (const row of rows) {
      if (!row.contactId || !row.contact) continue;
      const parsed = parseIntakeSummary(row.summary);
      tickets.push({
        interactionId: row.id,
        tenantId: tenant.id,
        contactId: row.contactId,
        company: row.contact.company,
        fullName: row.contact.fullName,
        email: row.contact.email,
        ...parsed,
        occurredAt: row.occurredAt.toISOString(),
      });
    }

    return {
      tenantId: tenant.id,
      tickets,
      polledAt: new Date().toISOString(),
    };
  });
}

/** Tenant-scoped forensic snapshot for SupportTeam enrichment (read-only). */
export async function getSupportTeamContextSnapshot(
  tenantSlugRaw: string,
): Promise<SupportTeamContextSnapshotWire> {
  const tenantSlug = sanitizeText(tenantSlugRaw, 63);
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, slug: true, isUnderTargetedSiege: true },
  });
  if (!tenant) throw new Error(`TARGET_TENANT_NOT_FOUND: ${tenantSlug}`);

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const telemetry = await buildInTenantSupportTelemetry({ tenantUuid: tenant.id });

  const [billing, ironguardCount7d] = await Promise.all([
    prisma.tenantBilling.findUnique({
      where: { tenantSlug: tenant.slug },
      select: { status: true },
    }),
    prisma.ironguardViolation.count({
      where: {
        createdAt: { gte: since7d },
        OR: [{ sessionTenantUuid: tenant.id }, { attemptedTenantUuid: tenant.id }],
      },
    }),
  ]);

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    billingStatus: billing?.status?.trim() ?? telemetry?.billing.status ?? null,
    openThreatCount: tenant.isUnderTargetedSiege ? 1 : 0,
    ironguardViolationCount7d: ironguardCount7d,
    frameworkContext: telemetry?.client.path ?? null,
    capturedAt: new Date().toISOString(),
  };
}

/** Queue support reply draft for mandatory human approval — never dispatches live. */
export async function submitSupportTeamReplyDraft(
  input: SupportTeamReplyPayload,
): Promise<{ interactionId: string; tenantId: string; status: "PENDING_HUMAN_REVIEW" }> {
  const tenantSlug = sanitizeText(input.tenantSlug, 63);
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) throw new Error(`TARGET_TENANT_NOT_FOUND: ${tenantSlug}`);

  const intakeInteractionId = sanitizeText(input.intakeInteractionId, 36);
  const contactId = sanitizeText(input.contactId, 36);
  const subject = sanitizeText(input.subject, 200);
  const body = sanitizeText(input.body, 12_000);

  return prisma.$transaction(async (tx) => {
    await bindIronguardTenant(tx, tenant.id);

    const intake = await tx.ironboardCrmInteraction.findFirst({
      where: {
        id: intakeInteractionId,
        tenantId: tenant.id,
        summary: { contains: PENDING_SUPPORT_INTAKE_TAG },
      },
      select: { id: true, contactId: true, summary: true },
    });
    if (!intake) throw new Error(`SUPPORT_INTAKE_NOT_FOUND: ${intakeInteractionId}`);

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
        channel: "EMAIL",
        summary: buildSupportTeamPendingDraftSummary({
          subject,
          body,
          severityTier: input.severityTier,
          intakeInteractionId,
          corpusPlayIds: input.corpusPlayIds,
        }),
        occurredAt: new Date(),
      },
    });

    await tx.ironboardCrmInteraction.update({
      where: { id: intakeInteractionId },
      data: {
        summary: intake.summary.replace(
          PENDING_SUPPORT_INTAKE_TAG,
          "[SUPPORT INTAKE PROCESSED]",
        ),
      },
    });

    return {
      interactionId: interaction.id,
      tenantId: tenant.id,
      status: "PENDING_HUMAN_REVIEW" as const,
    };
  });
}
