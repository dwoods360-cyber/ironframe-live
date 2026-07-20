import "server-only";

import { Prisma, type OpsActivity, type OpsActivityKind, type OpsActivityStatus } from "@prisma/client";

import {
  calendarDaysUntilDue,
  milestoneForDaysUntil,
  parseRemindersSent,
  type ReminderMilestone,
} from "@/app/lib/opsScheduleMath";
import {
  allProjects2026SeedSpecs,
  defaultNextActionsFor,
  hrefForSeedSpec,
  mergeNextActionItems,
  nextActionsForSeedSpec,
  parseNextActionItems,
  serializeNextActionItems,
  synopsisForQueueDraft,
  type OpsChecklistItem,
} from "@/app/lib/opsScheduleSeedSpecs";
import {
  hrefForOpsSourceRef,
  hrefForQueueDraft,
  normalizeOpsActivityHref,
} from "@/app/lib/opsScheduleLinks";
import { decryptNotificationUrl } from "@/lib/security/notificationEndpointCrypto";
import { assertWebhookUrlPassesIrongate } from "@/lib/security/irongateOutboundWebhook";
import prisma from "@/lib/prisma";

export type { ReminderMilestone };
export { calendarDaysUntilDue, parseRemindersSent } from "@/app/lib/opsScheduleMath";
export {
  allProjects2026SeedSpecs,
  summer2026SeedSpecs,
  videoCampaign2026SeedSpecs,
  ironframeRollout2026SeedSpecs,
  synopsisForQueueDraft,
  type OpsChecklistItem,
  type OpsScheduleSeedSpec,
} from "@/app/lib/opsScheduleSeedSpecs";
export { hrefForOpsSourceRef, hrefForQueueDraft } from "@/app/lib/opsScheduleLinks";

export type OpsActivitySummary = {
  id: string;
  title: string;
  kind: OpsActivityKind;
  status: OpsActivityStatus;
  dueAt: string;
  ownerLabel: string;
  /** Global priority rank (1 = P1 highest). */
  priority: number;
  sourceRef: string | null;
  /** Clickable destination for the calendar card. */
  href: string;
  /** Brief what/why blurb (stored in OpsActivity.notes). */
  synopsis: string;
  /** @deprecated Prefer synopsis — same value. */
  notes: string | null;
  /** What was completed / denied — for Done/Cancelled review. */
  outcome: string | null;
  /** Remaining work checklist for open items (with checkbox state). */
  nextActions: OpsChecklistItem[];
  /** Count of unchecked checklist steps. */
  nextActionsRemaining: number;
  remindersSent: Partial<Record<ReminderMilestone, string>>;
  daysUntilDue: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type OpsScheduleSnapshot = {
  activities: OpsActivitySummary[];
  dueSoonCount: number;
  overdueCount: number;
  openCount: number;
};

const OPEN_STATUSES: OpsActivityStatus[] = ["PLANNED", "IN_PROGRESS", "IN_REVIEW"];

type ActivityExtras = {
  href?: string | null;
  outcome?: string | null;
  next_actions?: string | null;
  nextActions?: string | null;
  priority?: number | null;
};

function storedPriorityOf(row: OpsActivity & ActivityExtras): number {
  const value = typeof row.priority === "number" && Number.isFinite(row.priority) ? row.priority : 50;
  return Math.max(1, Math.floor(value));
}

function storedHrefOf(row: OpsActivity & ActivityExtras): string {
  return typeof row.href === "string" ? row.href.trim() : "";
}

function storedOutcomeOf(row: OpsActivity & ActivityExtras): string | null {
  const value = typeof row.outcome === "string" ? row.outcome.trim() : "";
  return value || null;
}

function storedNextActionsRaw(row: OpsActivity & ActivityExtras): string | null {
  const value = row.nextActions ?? row.next_actions;
  return typeof value === "string" ? value : null;
}

async function persistActivityHref(id: string, href: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE ops_activities SET href = ${href}, updated_at = NOW() WHERE id = ${id}
  `;
}

async function persistActivityOutcome(id: string, outcome: string | null): Promise<void> {
  await prisma.$executeRaw`
    UPDATE ops_activities SET outcome = ${outcome}, updated_at = NOW() WHERE id = ${id}
  `;
}

async function persistActivityNextActions(id: string, nextActions: OpsChecklistItem[]): Promise<void> {
  const serialized = serializeNextActionItems(nextActions);
  await prisma.$executeRaw`
    UPDATE ops_activities SET next_actions = ${serialized || null}, updated_at = NOW() WHERE id = ${id}
  `;
}

async function persistActivityPriority(id: string, priority: number): Promise<void> {
  const rank = Math.max(1, Math.floor(priority));
  await prisma.$executeRaw`
    UPDATE ops_activities SET priority = ${rank}, updated_at = NOW() WHERE id = ${id}
  `;
}

async function hydrateActivityExtras(
  rows: OpsActivity[],
): Promise<Array<OpsActivity & ActivityExtras>> {
  if (rows.length === 0) return rows;
  const extras = await prisma.$queryRaw<
    Array<{
      id: string;
      href: string | null;
      outcome: string | null;
      next_actions: string | null;
      priority: number | null;
    }>
  >`
    SELECT id, href, outcome, next_actions, priority FROM ops_activities
    WHERE id IN (${Prisma.join(rows.map((r) => r.id))})
  `;
  const byId = new Map(extras.map((e) => [e.id, e]));
  return rows.map((row) => {
    const extra = byId.get(row.id);
    return {
      ...row,
      href: extra?.href ?? null,
      outcome: extra?.outcome ?? null,
      next_actions: extra?.next_actions ?? null,
      priority: extra?.priority ?? (row as ActivityExtras).priority ?? 50,
    };
  });
}

function toSummary(row: OpsActivity & ActivityExtras, now = new Date()): OpsActivitySummary {
  const synopsis = (row.notes ?? "").trim() || "No synopsis — add a one-sentence what/why.";
  const href = storedHrefOf(row) || hrefForOpsSourceRef(row.sourceRef, row.kind);
  const isClosed = row.status === "DONE" || row.status === "CANCELLED";
  const outcome =
    storedOutcomeOf(row) ||
    (isClosed ? "No outcome recorded — add what was completed for review." : null);
  let nextActions = parseNextActionItems(storedNextActionsRaw(row));
  if (!isClosed && nextActions.length === 0) {
    nextActions = defaultNextActionsFor({
      kind: row.kind,
      status: row.status,
      title: row.title,
      sourceRef: row.sourceRef,
    }).map((text) => ({ text, done: false }));
  }
  const openActions = isClosed ? [] : nextActions;
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    status: row.status,
    dueAt: row.dueAt.toISOString(),
    ownerLabel: row.ownerLabel,
    priority: storedPriorityOf(row),
    sourceRef: row.sourceRef,
    href,
    synopsis,
    notes: row.notes,
    outcome,
    nextActions: openActions,
    nextActionsRemaining: openActions.filter((item) => !item.done).length,
    remindersSent: parseRemindersSent(row.remindersSent),
    daysUntilDue: calendarDaysUntilDue(row.dueAt, now),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export async function listOpsActivities(options?: {
  includeDone?: boolean;
  limit?: number;
}): Promise<OpsActivitySummary[]> {
  const includeDone = options?.includeDone === true;
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 300);
  const rows = await prisma.opsActivity.findMany({
    where: includeDone ? undefined : { status: { in: OPEN_STATUSES } },
    // Priority lives on the row (raw hydrate); client may lag schema — sort in memory.
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });
  const hydrated = await hydrateActivityExtras(rows);
  const now = new Date();
  return hydrated
    .map((row) => toSummary(row, now))
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.dueAt.localeCompare(b.dueAt);
    });
}

export async function buildOpsScheduleSnapshot(): Promise<OpsScheduleSnapshot> {
  const activities = await listOpsActivities({ includeDone: true, limit: 200 });
  const open = activities.filter((a) => OPEN_STATUSES.includes(a.status));
  return {
    activities,
    openCount: open.length,
    dueSoonCount: open.filter((a) => a.daysUntilDue >= 0 && a.daysUntilDue <= 3).length,
    overdueCount: open.filter((a) => a.daysUntilDue < 0).length,
  };
}

export type UpsertOpsActivityInput = {
  id?: string;
  title: string;
  kind: OpsActivityKind;
  status?: OpsActivityStatus;
  dueAt: string | Date;
  ownerLabel?: string;
  sourceRef?: string | null;
  /** Global priority rank (1 = P1). */
  priority?: number | null;
  /** Required clickable destination (app path or https). Derived from sourceRef when omitted. */
  href?: string | null;
  /** Required brief what/why (preferred). */
  synopsis?: string | null;
  /** Alias for synopsis (legacy). */
  notes?: string | null;
  /** What was completed — set for DONE/CANCELLED seeds and close-outs. */
  outcome?: string | null;
  /** Remaining work checklist for open items. */
  nextActions?: Array<string | OpsChecklistItem> | null;
};

export async function upsertOpsActivity(input: UpsertOpsActivityInput): Promise<OpsActivitySummary> {
  const dueAt = input.dueAt instanceof Date ? input.dueAt : new Date(input.dueAt);
  if (Number.isNaN(dueAt.getTime())) {
    throw new Error("dueAt must be a valid ISO date.");
  }
  const status = input.status ?? "PLANNED";
  const synopsis = (input.synopsis ?? input.notes ?? "").trim();
  if (!synopsis) {
    throw new Error("synopsis is required — add a brief what/why for the calendar card.");
  }
  const sourceRef = input.sourceRef?.trim() || null;
  const href = normalizeOpsActivityHref(
    (input.href ?? "").trim() || hrefForOpsSourceRef(sourceRef, input.kind),
  );
  const data = {
    title: input.title.trim(),
    kind: input.kind,
    status,
    dueAt,
    ownerLabel: (input.ownerLabel ?? "Ops").trim() || "Ops",
    sourceRef,
    notes: synopsis,
    completedAt: status === "DONE" || status === "CANCELLED" ? new Date() : null,
  };
  if (!data.title) throw new Error("title is required.");

  const row = input.id
    ? await prisma.opsActivity.update({ where: { id: input.id }, data })
    : await prisma.opsActivity.create({ data: { ...data, remindersSent: {} } });
  await persistActivityHref(row.id, href);
  if (typeof input.priority === "number" && Number.isFinite(input.priority)) {
    await persistActivityPriority(row.id, input.priority);
  }
  if (input.outcome?.trim()) {
    await persistActivityOutcome(row.id, input.outcome.trim());
  }
  const resolvedActions: OpsChecklistItem[] = input.nextActions?.length
    ? input.nextActions.map((item) =>
        typeof item === "string"
          ? { text: item.trim(), done: false }
          : { text: item.text.trim(), done: Boolean(item.done) },
      )
    : defaultNextActionsFor({
        kind: input.kind,
        status,
        title: data.title,
        sourceRef,
      }).map((text) => ({ text, done: false }));
  if (status === "DONE" || status === "CANCELLED") {
    await persistActivityNextActions(row.id, []);
  } else if (resolvedActions.length > 0) {
    await persistActivityNextActions(row.id, resolvedActions.filter((i) => i.text));
  }
  const [hydrated] = await hydrateActivityExtras([row]);
  return toSummary({ ...hydrated, href });
}

/** Toggle one checklist step's completion state. */
export async function setOpsActivityChecklistItem(
  id: string,
  index: number,
  done: boolean,
): Promise<OpsActivitySummary> {
  const row = await prisma.opsActivity.findUnique({ where: { id } });
  if (!row) throw new Error("Activity not found.");
  if (row.status === "DONE" || row.status === "CANCELLED") {
    throw new Error("Cannot update checklist on a closed activity.");
  }
  const [hydrated] = await hydrateActivityExtras([row]);
  let items = parseNextActionItems(storedNextActionsRaw(hydrated));
  if (items.length === 0) {
    items = defaultNextActionsFor({
      kind: row.kind,
      status: row.status,
      title: row.title,
      sourceRef: row.sourceRef,
    }).map((text) => ({ text, done: false }));
  }
  if (index < 0 || index >= items.length) {
    throw new Error("Checklist index out of range.");
  }
  items = items.map((item, i) => (i === index ? { ...item, done } : item));
  await persistActivityNextActions(id, items);
  return toSummary({ ...hydrated, next_actions: serializeNextActionItems(items) });
}

export async function updateOpsActivityStatus(
  id: string,
  status: OpsActivityStatus,
  outcome?: string | null,
): Promise<OpsActivitySummary> {
  const isClosed = status === "DONE" || status === "CANCELLED";
  const trimmedOutcome = (outcome ?? "").trim();
  if (isClosed && !trimmedOutcome) {
    throw new Error(
      "outcome is required when marking Done or Cancelled — record what was completed for review.",
    );
  }
  const row = await prisma.opsActivity.update({
    where: { id },
    data: {
      status,
      completedAt: isClosed ? new Date() : null,
    },
  });
  if (isClosed) {
    await persistActivityOutcome(row.id, trimmedOutcome);
  } else if (outcome !== undefined) {
    await persistActivityOutcome(row.id, null);
  }
  const [hydrated] = await hydrateActivityExtras([row]);
  return toSummary({ ...hydrated, outcome: isClosed ? trimmedOutcome : null });
}

/** Next business day 17:00 UTC as default review due (skip Sat/Sun). */
export function defaultReviewDueAt(from = new Date()): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  d.setUTCHours(17, 0, 0, 0);
  return d;
}

/**
 * When a draft is staged into briefing-queue, ensure an open REVIEW activity exists.
 */
export async function ensureQueueReviewActivity(args: {
  filename: string;
  title?: string;
}): Promise<OpsActivitySummary | null> {
  const filename = args.filename.trim();
  if (!filename) return null;

  const isNewsletter = /newsletter/i.test(filename) || /ironcast/i.test(filename);
  const kind: OpsActivityKind = isNewsletter ? "NEWSLETTER_REVIEW" : "BRIEFING_REVIEW";
  const existing = await prisma.opsActivity.findFirst({
    where: {
      sourceRef: filename,
      kind,
      status: { in: OPEN_STATUSES },
    },
  });
  if (existing) return toSummary(existing);

  const title =
    args.title?.trim() ||
    (isNewsletter
      ? `Review newsletter draft: ${filename}`
      : `Review briefing draft: ${filename}`);

  return upsertOpsActivity({
    title,
    kind,
    status: "IN_REVIEW",
    dueAt: defaultReviewDueAt(),
    ownerLabel: process.env.OPS_SCHEDULE_DEFAULT_OWNER?.trim() || "Ops",
    sourceRef: filename,
    href: hrefForQueueDraft(filename),
    synopsis: synopsisForQueueDraft(filename),
    nextActions: defaultNextActionsFor({
      kind,
      status: "IN_REVIEW",
      title,
      sourceRef: filename,
    }).map((text) => ({ text, done: false })),
  });
}

/** Idempotent seed of all known 2026 project packs (GF slate, video, Ironframe rollout, etc.). */
export async function seedSummer2026OpsSchedule(): Promise<{
  created: number;
  skipped: number;
  updated: number;
  activities: OpsActivitySummary[];
}> {
  return seedAllProjects2026OpsSchedule();
}

export async function seedAllProjects2026OpsSchedule(): Promise<{
  created: number;
  skipped: number;
  updated: number;
  activities: OpsActivitySummary[];
}> {
  let created = 0;
  let skipped = 0;
  let updated = 0;
  const owner = process.env.OPS_SCHEDULE_DEFAULT_OWNER?.trim() || "Ops";
  const specs = allProjects2026SeedSpecs();
  for (const spec of specs) {
    const nextSynopsis = spec.synopsis.trim();
    const nextHref = hrefForSeedSpec(spec);
    const nextActionTexts = nextActionsForSeedSpec(spec);
    const nextPriority = Math.max(1, Math.floor(spec.priority ?? 50));
    const existing = await prisma.opsActivity.findFirst({
      where: { sourceRef: spec.sourceRef, kind: spec.kind },
    });
    if (existing) {
      const [hydrated] = await hydrateActivityExtras([existing]);
      const prevHref = storedHrefOf(hydrated);
      const prevPriority = storedPriorityOf(hydrated);
      const nextOutcome = (spec.outcome ?? "").trim();
      const prevOutcome = storedOutcomeOf(hydrated) ?? "";
      const prevItems = parseNextActionItems(storedNextActionsRaw(hydrated));
      const mergedItems = mergeNextActionItems(prevItems, nextActionTexts);
      const nextActionsSerialized = serializeNextActionItems(mergedItems);
      const prevActionsSerialized = serializeNextActionItems(prevItems);
      const statusChanged = existing.status !== spec.status;
      const nextDueAt = new Date(spec.dueAt);
      const dueChanged = existing.dueAt.getTime() !== nextDueAt.getTime();
      const priorityChanged = prevPriority !== nextPriority;
      const outcomeChanged = nextOutcome
        ? prevOutcome !== nextOutcome
        : Boolean(prevOutcome) &&
          (spec.status === "PLANNED" ||
            spec.status === "IN_PROGRESS" ||
            spec.status === "IN_REVIEW");
      if (
        (existing.notes ?? "").trim() !== nextSynopsis ||
        existing.title !== spec.title ||
        prevHref !== nextHref ||
        statusChanged ||
        dueChanged ||
        priorityChanged ||
        outcomeChanged ||
        prevActionsSerialized !== nextActionsSerialized
      ) {
        await prisma.opsActivity.update({
          where: { id: existing.id },
          data: {
            notes: nextSynopsis,
            title: spec.title,
            status: spec.status,
            dueAt: nextDueAt,
            completedAt:
              spec.status === "DONE" || spec.status === "CANCELLED"
                ? existing.completedAt ?? new Date()
                : null,
          },
        });
        await persistActivityHref(existing.id, nextHref);
        await persistActivityPriority(existing.id, nextPriority);
        if (nextOutcome) {
          await persistActivityOutcome(existing.id, nextOutcome);
        } else if (outcomeChanged) {
          await persistActivityOutcome(existing.id, null);
        }
        await persistActivityNextActions(existing.id, mergedItems);
        updated += 1;
      } else {
        skipped += 1;
      }
      continue;
    }
    await upsertOpsActivity({
      title: spec.title,
      kind: spec.kind,
      status: spec.status,
      dueAt: spec.dueAt,
      ownerLabel: owner,
      sourceRef: spec.sourceRef,
      priority: nextPriority,
      href: nextHref,
      synopsis: spec.synopsis,
      outcome: spec.outcome,
      nextActions: nextActionTexts,
    });
    created += 1;
  }
  const activities = await listOpsActivities({ includeDone: true });
  return { created, skipped, updated, activities };
}

function reminderLabel(milestone: ReminderMilestone): string {
  switch (milestone) {
    case "t3":
      return "3 days before due";
    case "t2":
      return "2 days before due";
    case "t1":
      return "1 day before due";
    case "t0":
      return "due today";
  }
}

async function broadcastOpsReminderText(text: string): Promise<{
  endpointsAttempted: number;
  endpointsOk: number;
  emailOk: boolean | null;
}> {
  const endpoints = await prisma.notificationEndpoint.findMany({
    where: { isEnabled: true },
    select: { id: true, name: true, urlEncrypted: true, channelType: true },
  });

  let endpointsOk = 0;
  for (const ep of endpoints) {
    try {
      const url = decryptNotificationUrl(ep.urlEncrypted);
      assertWebhookUrlPassesIrongate(url);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) endpointsOk += 1;
      else {
        const body = await res.text().catch(() => "");
        console.warn("[ops-schedule] endpoint failed", ep.name, res.status, body);
      }
    } catch (err) {
      console.warn("[ops-schedule] endpoint skip", ep.name, err);
    }
  }

  let emailOk: boolean | null = null;
  const notifyEmail = process.env.OPS_SCHEDULE_NOTIFY_EMAIL?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (notifyEmail && resendKey) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      const from =
        process.env.IRONCAST_FROM_EMAIL?.trim() ||
        process.env.WORKSPACE_INVITE_FROM_EMAIL?.trim() ||
        "delivery@ironframegrc.com";
      const response = await resend.emails.send({
        from: `Ironframe Ops <${from}>`,
        to: [notifyEmail],
        subject: "Ops Schedule reminder",
        text,
      });
      emailOk = !response.error;
      if (response.error) {
        console.warn("[ops-schedule] email failed", response.error.message);
      }
    } catch (err) {
      emailOk = false;
      console.warn("[ops-schedule] email error", err);
    }
  }

  return {
    endpointsAttempted: endpoints.length,
    endpointsOk,
    emailOk,
  };
}

export type OpsReminderRunResult = {
  ok: true;
  scanned: number;
  sent: Array<{ id: string; title: string; milestone: ReminderMilestone; daysUntilDue: number }>;
  skipped: number;
  delivery: { endpointsAttempted: number; endpointsOk: number; emailOk: boolean | null };
};

/**
 * Daily reminder scan — send each open activity at most once per T-3/T-2/T-1/T-0 milestone.
 */
export async function runOpsScheduleReminders(now = new Date()): Promise<OpsReminderRunResult> {
  const open = await prisma.opsActivity.findMany({
    where: { status: { in: OPEN_STATUSES } },
  });

  const dueForReminder: Array<{
    row: OpsActivity;
    milestone: ReminderMilestone;
    daysUntil: number;
  }> = [];

  for (const row of open) {
    const daysUntil = calendarDaysUntilDue(row.dueAt, now);
    const milestone = milestoneForDaysUntil(daysUntil);
    if (!milestone) continue;
    const sent = parseRemindersSent(row.remindersSent);
    if (sent[milestone]) continue;
    dueForReminder.push({ row, milestone, daysUntil });
  }

  if (dueForReminder.length === 0) {
    return {
      ok: true,
      scanned: open.length,
      sent: [],
      skipped: open.length,
      delivery: { endpointsAttempted: 0, endpointsOk: 0, emailOk: null },
    };
  }

  const lines = [
    "Ironframe Ops Schedule — due-date reminders",
    `Generated: ${now.toISOString()}`,
    "",
    ...dueForReminder.map(({ row, milestone, daysUntil }) => {
      const href =
        ((row as { href?: string | null }).href ?? "").trim() ||
        hrefForOpsSourceRef(row.sourceRef, row.kind);
      return (
        `• [${reminderLabel(milestone)}] ${row.title} — due ${row.dueAt.toISOString().slice(0, 10)} (${daysUntil}d) · ${row.ownerLabel}` +
        (row.sourceRef ? ` · ${row.sourceRef}` : "") +
        ` · ${href}`
      );
    }),
    "",
    "Ops Hub: /dashboard/operations?tab=calendar",
  ];
  const text = lines.join("\n");
  const delivery = await broadcastOpsReminderText(text);

  const sent: OpsReminderRunResult["sent"] = [];
  const stamp = now.toISOString();
  for (const { row, milestone, daysUntil } of dueForReminder) {
    const nextSent = { ...parseRemindersSent(row.remindersSent), [milestone]: stamp };
    await prisma.opsActivity.update({
      where: { id: row.id },
      data: { remindersSent: nextSent as Prisma.InputJsonValue },
    });
    sent.push({
      id: row.id,
      title: row.title,
      milestone,
      daysUntilDue: daysUntil,
    });
  }

  return {
    ok: true,
    scanned: open.length,
    sent,
    skipped: open.length - sent.length,
    delivery,
  };
}
