import "server-only";

import prisma from "@/lib/prisma";
import { upsertOpsActivity } from "@/app/lib/server/opsScheduleCore";

export type IcpTouchStage = "TOUCH1" | "TOUCH2" | "TOUCH3";
export type IcpTouchChannel = "EMAIL" | "SMS";

export type IcpTouchLogRow = {
  id: string;
  touch: IcpTouchStage;
  channel: IcpTouchChannel;
  company: string;
  date: string;
  occurredAt: string;
  interactionId: string | null;
  dealId: string | null;
  to: string | null;
  trigger: string | null;
  nextTouchNote: string;
  loggedBy: string | null;
};

export type LogIcpTouchInput = {
  touch?: IcpTouchStage;
  channel: IcpTouchChannel;
  company: string;
  interactionId?: string | null;
  dealId?: string | null;
  to?: string | null;
  trigger?: string | null;
  nextTouchNote?: string | null;
  occurredAt?: string | null;
  loggedBy?: string | null;
};

const SOURCE_PREFIX = "icp-touch:";
const SHORTLIST_HREF = "/dashboard/operations/library/icp-shortlist#section-d";

function asTouch(value: string | null | undefined): IcpTouchStage | null {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "TOUCH1" || v === "TOUCH2" || v === "TOUCH3") return v;
  return null;
}

function asChannel(value: string | null | undefined): IcpTouchChannel | null {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "EMAIL" || v === "SMS") return v;
  return null;
}

function dayStamp(isoOrDate: string | Date): string {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function buildIcpTouchSourceRef(input: {
  touch: IcpTouchStage;
  interactionId?: string | null;
  company: string;
  date: string;
  channel: IcpTouchChannel;
}): string {
  const interaction = input.interactionId?.trim();
  if (interaction) return `${SOURCE_PREFIX}${input.touch}:${interaction}`;
  const slug = input.company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${SOURCE_PREFIX}${input.touch}:manual:${slug || "company"}:${input.date}:${input.channel}`;
}

function buildSourceRef(input: {
  touch: IcpTouchStage;
  interactionId?: string | null;
  company: string;
  date: string;
  channel: IcpTouchChannel;
}): string {
  return buildIcpTouchSourceRef(input);
}

function parseRowFromActivity(row: {
  id: string;
  title: string;
  sourceRef: string | null;
  notes: string | null;
  outcome: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): IcpTouchLogRow | null {
  const ref = row.sourceRef ?? "";
  if (!ref.startsWith(SOURCE_PREFIX)) return null;
  const parts = ref.slice(SOURCE_PREFIX.length).split(":");
  const touch = asTouch(parts[0]);
  if (!touch) return null;

  let payload: Record<string, unknown> = {};
  try {
    if (row.outcome?.trim().startsWith("{")) {
      payload = JSON.parse(row.outcome) as Record<string, unknown>;
    }
  } catch {
    payload = {};
  }

  const channel =
    asChannel(typeof payload.channel === "string" ? payload.channel : null) ??
    (/\bSMS\b/i.test(row.title) ? "SMS" : "EMAIL");
  const company =
    (typeof payload.company === "string" && payload.company.trim()) ||
    row.title.replace(/^TOUCH[123]\s*·\s*/i, "").replace(/\s*·\s*(EMAIL|SMS).*$/i, "").trim() ||
    "Prospect";
  const occurredAt =
    (typeof payload.occurredAt === "string" && payload.occurredAt) ||
    (row.completedAt ?? row.createdAt).toISOString();

  return {
    id: row.id,
    touch,
    channel,
    company,
    date: dayStamp(occurredAt),
    occurredAt,
    interactionId:
      (typeof payload.interactionId === "string" && payload.interactionId) ||
      (parts[1] && parts[1] !== "manual" ? parts[1] : null),
    dealId: typeof payload.dealId === "string" ? payload.dealId : null,
    to: typeof payload.to === "string" ? payload.to : null,
    trigger: typeof payload.trigger === "string" ? payload.trigger : null,
    nextTouchNote:
      (typeof payload.nextTouchNote === "string" && payload.nextTouchNote) ||
      row.notes?.trim() ||
      "Logged touch",
    loggedBy: typeof payload.loggedBy === "string" ? payload.loggedBy : null,
  };
}

export async function listIcpShortlistTouches(limit = 40): Promise<IcpTouchLogRow[]> {
  const rows = await prisma.opsActivity.findMany({
    where: { sourceRef: { startsWith: SOURCE_PREFIX } },
    orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
    take: Math.min(100, Math.max(1, limit)),
  });
  return rows
    .map((row) => parseRowFromActivity(row))
    .filter((row): row is IcpTouchLogRow => Boolean(row));
}

export async function logIcpShortlistTouch(
  input: LogIcpTouchInput,
): Promise<{ row: IcpTouchLogRow; created: boolean }> {
  const company = String(input.company ?? "").trim();
  if (!company) throw new Error("company is required.");
  const channel = asChannel(input.channel);
  if (!channel) throw new Error("channel must be EMAIL or SMS.");
  const touch = asTouch(input.touch ?? "TOUCH1") ?? "TOUCH1";
  const occurredAt = input.occurredAt?.trim()
    ? new Date(input.occurredAt)
    : new Date();
  if (Number.isNaN(occurredAt.getTime())) throw new Error("occurredAt must be a valid ISO date.");
  const date = dayStamp(occurredAt);
  const nextTouchNote =
    String(input.nextTouchNote ?? "").trim() ||
    (touch === "TOUCH1"
      ? "Wait reply / Touch 2 day 4–5"
      : touch === "TOUCH2"
        ? "Wait reply / Touch 3"
        : "Wait reply or YES path");
  const interactionId = input.interactionId?.trim() || null;
  const dealId = input.dealId?.trim() || null;
  const to = input.to?.trim() || null;
  const trigger = input.trigger?.trim() || null;
  const loggedBy = input.loggedBy?.trim() || null;

  const sourceRef = buildSourceRef({
    touch,
    interactionId,
    company,
    date,
    channel,
  });

  const existing = await prisma.opsActivity.findFirst({
    where: { sourceRef },
  });
  if (existing) {
    const row = parseRowFromActivity(existing);
    if (row) return { row, created: false };
  }

  const payload = {
    touch,
    channel,
    company,
    date,
    occurredAt: occurredAt.toISOString(),
    interactionId,
    dealId,
    to,
    trigger,
    nextTouchNote,
    loggedBy,
  };

  const synopsis = [
    `${touch} ${channel} DISPATCHED`,
    trigger ? `trigger ${trigger}` : null,
    to ? `to ${to}` : null,
    nextTouchNote,
  ]
    .filter(Boolean)
    .join(" · ");

  const activity = await upsertOpsActivity({
    title: `${touch} · ${company} · ${channel}`,
    kind: "OPS_GENERAL",
    status: "DONE",
    dueAt: occurredAt,
    ownerLabel: "GTM host",
    sourceRef,
    href: SHORTLIST_HREF,
    priority: 20,
    synopsis,
    outcome: JSON.stringify(payload),
  });

  const row = parseRowFromActivity({
    id: activity.id,
    title: activity.title,
    sourceRef: activity.sourceRef,
    notes: activity.notes,
    outcome: activity.outcome,
    completedAt: activity.completedAt ? new Date(activity.completedAt) : occurredAt,
    createdAt: new Date(activity.createdAt),
    updatedAt: new Date(activity.updatedAt),
  });
  if (!row) throw new Error("Failed to parse logged touch.");
  return { row, created: true };
}
