import "server-only";

import prisma from "@/lib/prisma";
import {
  CUSTOMER_FACING_PATH_B_SKU,
  WORKFLOW_REVIEW_CTA_MINUTES,
  formatPathBUsd,
} from "@/lib/ironframeProductKnowledge/commercial";
import { notifyOpsChannels } from "@/app/lib/server/notifyOpsEmail";
import { upsertOpsActivity } from "@/app/lib/server/opsScheduleCore";
import {
  logPendingSalesDraftApproval,
  resolveProspectPoolTenantId,
  upsertProspectCrmContact,
  type BaselineTarget,
} from "@/app/lib/server/salesAgentConsoleCore";
import { PENDING_SALES_DRAFT_TAG } from "@/app/lib/server/approvalQueueCore";

export const INBOUND_LEAD_SOURCE_PREFIX = "inbound-lead:";
export const INBOUND_LEADS_HREF = "/dashboard/operations/salesteam#inbound-leads";

export type InboundProspectLeadRow = {
  id: string;
  orgName: string;
  slug: string;
  email: string;
  reportedAleCents: string;
  createdAt: string;
  opsStatus: string | null;
  priority: number;
  sourceRef: string;
  /** PENDING SALES draft id when already queued (auto or manual). */
  pendingDraftId: string | null;
};

export function inboundLeadSourceRef(slug: string): string {
  return `${INBOUND_LEAD_SOURCE_PREFIX}${slug.trim().toLowerCase()}`;
}

export function buildInboundWorkflowReviewDraft(input: {
  orgName: string;
  email: string;
  reportedAleCents: bigint;
}): string {
  const aleDollars =
    input.reportedAleCents > 0n
      ? `$${Number(input.reportedAleCents / 100n).toLocaleString("en-US")}`
      : "not stated";
  return [
    `Thanks for requesting a ${WORKFLOW_REVIEW_CTA_MINUTES} minute workflow review with Ironframe.`,
    "",
    `We received your note for ${input.orgName} (${input.email}). Next step is a peer review on evidence / board-report friction — not a product demo.`,
    "",
    `Reported annual loss exposure (intake): ${aleDollars}.`,
    "",
    `${CUSTOMER_FACING_PATH_B_SKU} is ${formatPathBUsd()} flat for a fixed cohort window if we align on success criteria after the review.`,
    "",
    "Reply with 2–3 times that work this week (or YES and we will propose slots).",
    "",
    "— Ironframe GTM",
  ].join("\n");
}

function contactDisplayName(email: string, orgName: string): string {
  const local = email.split("@")[0]?.replace(/[._+]+/g, " ").trim();
  if (local && local.length >= 2) {
    return local.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 120);
  }
  return `${orgName} contact`.slice(0, 120);
}

/**
 * After public-lead upsert: P1 OpsActivity + operator notify + Approvals draft queued.
 * Does NOT email the prospect (HITL DISPATCH only).
 */
export async function elevateInboundLeadPriority(input: {
  orgName: string;
  slug: string;
  email: string;
  reportedAleCents: bigint;
  /** Default true on first create; pass false when backfilling from queue action. */
  notify?: boolean;
  /** Queue PENDING SALES draft for Approvals (default true). Never auto-DISPATCH. */
  autoQueueDraft?: boolean;
}): Promise<{
  sourceRef: string;
  notified: boolean;
  created: boolean;
  queuedDraftId: string | null;
  draftCreated: boolean;
}> {
  const slug = input.slug.trim().toLowerCase();
  const sourceRef = inboundLeadSourceRef(slug);
  const aleLabel =
    input.reportedAleCents > 0n
      ? `$${(Number(input.reportedAleCents) / 100).toLocaleString("en-US")}`
      : "ALE not stated";
  const dueAt = new Date(Date.now() + 4 * 60 * 60 * 1000);

  const existing = await prisma.opsActivity.findFirst({ where: { sourceRef } });
  const created = !existing;
  await upsertOpsActivity({
    id: existing?.id,
    title: `P1 Inbound · ${input.orgName} · workflow review`,
    kind: "OPS_GENERAL",
    status: existing?.status === "DONE" || existing?.status === "CANCELLED" ? "IN_PROGRESS" : "PLANNED",
    dueAt,
    ownerLabel: "GTM host",
    sourceRef,
    href: INBOUND_LEADS_HREF,
    priority: 1,
    synopsis: [
      "Highest priority: public /register/contact hand-raiser.",
      `Email ${input.email}`,
      aleLabel,
      "Reply via Approvals HITL — do not auto-send.",
    ].join(" · "),
    nextActions: [
      "Open SalesTeam inbound strip / queue Approvals draft",
      "HITL DISPATCH scheduling reply",
      "Host workflow review on LIVE desk",
    ],
  });

  let queuedDraftId: string | null = null;
  let draftCreated = false;
  if (input.autoQueueDraft !== false) {
    try {
      const queued = await queueInboundLeadApprovalDraft({ slug, skipElevate: true });
      queuedDraftId = queued.interactionId;
      draftCreated = queued.created;
    } catch (err) {
      console.warn("[inbound-lead] auto-queue Approvals draft failed", err);
    }
  }

  const shouldNotify = input.notify !== false && created;
  let notified = false;
  if (shouldNotify) {
    try {
      const draftHref = queuedDraftId
        ? `/dashboard/admin/approvals?kind=SALES&draft=${encodeURIComponent(queuedDraftId)}`
        : INBOUND_LEADS_HREF;
      const delivery = await notifyOpsChannels({
        subject: `P1 inbound workflow review — ${input.orgName}`,
        text: [
          "Highest-priority inbound lead (public contact form).",
          "",
          `Company: ${input.orgName}`,
          `Email: ${input.email}`,
          `Slug: ${slug}`,
          `ALE: ${aleLabel}`,
          "",
          queuedDraftId
            ? "Approvals draft auto-queued (PENDING). Review Proposed outreach → Approve & dispatch SALES."
            : "Queue Approvals draft from SalesTeam inbound strip, then DISPATCH.",
          `Open: https://ironframegrc.com${draftHref}`,
          "Do not auto-reply — HITL DISPATCH only.",
        ].join("\n"),
      });
      notified = delivery.emailOk === true || delivery.endpointsOk > 0;
    } catch (err) {
      console.warn("[inbound-lead] notify failed", err);
    }
  }

  return { sourceRef, notified, created, queuedDraftId, draftCreated };
}

export async function listInboundProspectLeads(limit = 40): Promise<InboundProspectLeadRow[]> {
  const take = Math.min(100, Math.max(1, limit));
  const rows = await prisma.prospect.findMany({
    orderBy: { createdAt: "desc" },
    take,
  });
  if (rows.length === 0) return [];

  const sourceRefs = rows.map((row) => inboundLeadSourceRef(row.slug));
  const activities = await prisma.opsActivity.findMany({
    where: { sourceRef: { in: sourceRefs } },
    select: { sourceRef: true, status: true, priority: true },
  });
  const byRef = new Map(
    activities.map((a) => [a.sourceRef ?? "", a] as const),
  );

  const emails = rows.map((row) => row.email.toLowerCase());
  const tenantId = resolveProspectPoolTenantId();
  const contacts = await prisma.ironboardCrmContact.findMany({
    where: { tenantId, email: { in: emails } },
    select: { id: true, email: true },
  });
  const contactIdByEmail = new Map(
    contacts.map((c) => [c.email.toLowerCase(), c.id] as const),
  );
  const contactIds = [...contactIdByEmail.values()];
  const pendingByContact = new Map<string, string>();
  if (contactIds.length > 0) {
    const pendings = await prisma.ironboardCrmInteraction.findMany({
      where: {
        tenantId,
        contactId: { in: contactIds },
        summary: { contains: PENDING_SALES_DRAFT_TAG },
      },
      orderBy: { occurredAt: "desc" },
      select: { id: true, contactId: true },
    });
    for (const row of pendings) {
      if (!row.contactId) continue;
      if (!pendingByContact.has(row.contactId)) {
        pendingByContact.set(row.contactId, row.id);
      }
    }
  }

  return rows.map((row) => {
    const sourceRef = inboundLeadSourceRef(row.slug);
    const activity = byRef.get(sourceRef);
    const contactId = contactIdByEmail.get(row.email.toLowerCase());
    return {
      id: row.id,
      orgName: row.orgName,
      slug: row.slug,
      email: row.email,
      reportedAleCents: row.reportedAle.toString(),
      createdAt: row.createdAt.toISOString(),
      opsStatus: activity?.status ?? null,
      priority: activity?.priority ?? 1,
      sourceRef,
      pendingDraftId: contactId ? pendingByContact.get(contactId) ?? null : null,
    };
  });
}

/**
 * One-click: CRM contact + PENDING SALES draft for Approvals HITL.
 * Idempotent per contact while a PENDING draft already exists.
 */
export async function queueInboundLeadApprovalDraft(input: {
  slug: string;
  /** When true, skip elevateInboundLeadPriority (caller already elevated). */
  skipElevate?: boolean;
}): Promise<{ interactionId: string; created: boolean; company: string; email: string }> {
  const slug = input.slug.trim().toLowerCase();
  if (!slug) throw new Error("slug is required.");

  const prospect = await prisma.prospect.findUnique({ where: { slug } });
  if (!prospect) throw new Error("Inbound prospect not found.");

  // Ensure P1 OpsActivity exists (covers leads recorded before elevation shipped).
  if (!input.skipElevate) {
    await elevateInboundLeadPriority({
      orgName: prospect.orgName,
      slug: prospect.slug,
      email: prospect.email,
      reportedAleCents: prospect.reportedAle,
      notify: false,
      autoQueueDraft: false,
    });
  }

  const baselineTarget: BaselineTarget = "regionalBHC";
  const name = contactDisplayName(prospect.email, prospect.orgName);
  const notes = [
    "Channel: PUBLIC_LEAD_FORM",
    "Priority: P1 inbound workflow-review request",
    `prospectSlug: ${prospect.slug}`,
    `reportedAleCents: ${prospect.reportedAle.toString()}`,
  ].join(" | ");

  const contact = await upsertProspectCrmContact({
    name,
    email: prospect.email,
    company: prospect.orgName,
    baselineTarget,
    notes,
  });

  const tenantId = resolveProspectPoolTenantId();
  const existingPending = await prisma.ironboardCrmInteraction.findFirst({
    where: {
      tenantId,
      contactId: contact.id,
      summary: { contains: PENDING_SALES_DRAFT_TAG },
    },
    orderBy: { occurredAt: "desc" },
  });
  if (existingPending) {
    await syncInboundActivityAfterQueue({
      slug,
      interactionId: existingPending.id,
      synopsisHint: `P1 inbound already queued (${existingPending.id.slice(0, 8)}…).`,
    });
    return {
      interactionId: existingPending.id,
      created: false,
      company: prospect.orgName,
      email: prospect.email,
    };
  }

  const proposedPitch = buildInboundWorkflowReviewDraft({
    orgName: prospect.orgName,
    email: prospect.email,
    reportedAleCents: prospect.reportedAle,
  });

  const interactionId = await logPendingSalesDraftApproval({
    tenantId,
    contactId: contact.id,
    company: prospect.orgName,
    baselineTarget,
    notes,
    proposedPitch,
  });

  await syncInboundActivityAfterQueue({
    slug,
    interactionId,
    synopsisHint: `P1 inbound auto-queued to Approvals (${interactionId.slice(0, 8)}…).`,
  });

  return {
    interactionId,
    created: true,
    company: prospect.orgName,
    email: prospect.email,
  };
}

async function syncInboundActivityAfterQueue(input: {
  slug: string;
  interactionId: string;
  synopsisHint: string;
}): Promise<void> {
  const sourceRef = inboundLeadSourceRef(input.slug);
  const activity = await prisma.opsActivity.findFirst({ where: { sourceRef } });
  if (!activity || activity.status === "DONE" || activity.status === "CANCELLED") return;
  const draftHref = `/dashboard/admin/approvals?kind=SALES&draft=${encodeURIComponent(input.interactionId)}`;
  await upsertOpsActivity({
    id: activity.id,
    title: activity.title,
    kind: activity.kind,
    status: "IN_PROGRESS",
    dueAt: activity.dueAt,
    ownerLabel: activity.ownerLabel,
    sourceRef,
    href: draftHref,
    priority: 1,
    synopsis: activity.notes?.trim() || input.synopsisHint,
    nextActions: [
      { text: "Open SalesTeam inbound strip / queue Approvals draft", done: true },
      { text: "HITL DISPATCH scheduling reply", done: false },
      { text: "Host workflow review on LIVE desk", done: false },
    ],
  });
}

/**
 * After SALES DISPATCH: mark inbound checklist DISPATCH done; point href at LIVE.
 * Idempotent. Does not mark activity DONE (LIVE hosting still open).
 */
export async function advanceInboundLeadAfterSalesDispatch(input: {
  email?: string | null;
  company?: string | null;
  interactionId: string;
}): Promise<{ advanced: boolean }> {
  const email = input.email?.trim().toLowerCase() || null;
  let prospect =
    email != null
      ? await prisma.prospect.findFirst({ where: { email }, orderBy: { createdAt: "desc" } })
      : null;
  if (!prospect && input.company?.trim()) {
    prospect = await prisma.prospect.findFirst({
      where: { orgName: { equals: input.company.trim(), mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
    });
  }
  if (!prospect) return { advanced: false };

  const sourceRef = inboundLeadSourceRef(prospect.slug);
  const activity = await prisma.opsActivity.findFirst({ where: { sourceRef } });
  if (!activity || activity.status === "DONE" || activity.status === "CANCELLED") {
    return { advanced: false };
  }

  await upsertOpsActivity({
    id: activity.id,
    title: activity.title,
    kind: activity.kind,
    status: "IN_PROGRESS",
    dueAt: activity.dueAt,
    ownerLabel: activity.ownerLabel,
    sourceRef,
    href: "/dashboard/operations/workflow-review",
    priority: 1,
    synopsis: [
      activity.notes?.trim() || `P1 inbound · ${prospect.orgName}`,
      `DISPATCHED ${input.interactionId.slice(0, 8)}…`,
      "TOUCH1 logged automatically — host LIVE when they reply YES.",
    ].join(" · "),
    nextActions: [
      { text: "Open SalesTeam inbound strip / queue Approvals draft", done: true },
      { text: "HITL DISPATCH scheduling reply", done: true },
      { text: "Host workflow review on LIVE desk", done: false },
    ],
  });
  return { advanced: true };
}
