import "server-only";

import { randomBytes } from "crypto";

import prisma from "@/lib/prisma";
import { adminOnboardingProvisionHref } from "@/app/lib/approvalDispatchValidation";
import { upsertOpsActivity } from "@/app/lib/server/opsScheduleCore";

export const ORDER_FORM_AGREED_SOURCE_PREFIX = "order-form-agreed:" as const;
const HANDOFF_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type OrderFormAgreedHandoffPayload = {
  v: 1;
  token: string;
  customerLegalName: string;
  operatorEmail: string;
  billingEmail: string | null;
  workspaceSlug: string;
  pilotWindowDays: number | null;
  successCriteria: string[];
  lockedAt: string;
  lockedByUserId: string | null;
  revokedAt?: string | null;
  revokeReason?: string | null;
  consumedAt?: string | null;
};

export type OrderFormAgreedHandoff = {
  id: string;
  token: string;
  customerLegalName: string;
  operatorEmail: string;
  billingEmail: string | null;
  workspaceSlug: string;
  pilotWindowDays: number | null;
  successCriteria: string[];
  lockedAt: string;
  provisionHref: string;
  status: "active" | "revoked" | "consumed" | "expired";
};

function sourceRefForToken(token: string): string {
  return `${ORDER_FORM_AGREED_SOURCE_PREFIX}${token}`;
}

function newToken(): string {
  return randomBytes(18).toString("base64url");
}

function parsePayload(raw: string | null | undefined): OrderFormAgreedHandoffPayload | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as OrderFormAgreedHandoffPayload;
    if (parsed?.v !== 1 || !parsed.token || !parsed.workspaceSlug) return null;
    return parsed;
  } catch {
    return null;
  }
}

function statusForActivity(input: {
  status: string;
  dueAt: Date;
  payload: OrderFormAgreedHandoffPayload;
}): OrderFormAgreedHandoff["status"] {
  if (input.payload.consumedAt) return "consumed";
  if (input.payload.revokedAt || input.status === "CANCELLED") return "revoked";
  if (input.status === "DONE") return "consumed";
  if (input.dueAt.getTime() < Date.now()) return "expired";
  if (input.status === "IN_PROGRESS" || input.status === "PLANNED") return "active";
  return "expired";
}

function toHandoff(row: {
  id: string;
  status: string;
  dueAt: Date;
  outcome: string | null;
}): OrderFormAgreedHandoff | null {
  const payload = parsePayload(row.outcome);
  if (!payload) return null;
  const status = statusForActivity({
    status: row.status,
    dueAt: row.dueAt,
    payload,
  });
  return {
    id: row.id,
    token: payload.token,
    customerLegalName: payload.customerLegalName,
    operatorEmail: payload.operatorEmail,
    billingEmail: payload.billingEmail,
    workspaceSlug: payload.workspaceSlug,
    pilotWindowDays: payload.pilotWindowDays,
    successCriteria: payload.successCriteria,
    lockedAt: payload.lockedAt,
    provisionHref: adminOnboardingProvisionHref({
      name: payload.customerLegalName,
      email: payload.operatorEmail,
      slug: payload.workspaceSlug,
      handoff: payload.token,
    }),
    status,
  };
}

async function findOpenBySlug(slug: string) {
  const rows = await prisma.opsActivity.findMany({
    where: {
      kind: "OPS_GENERAL",
      status: { in: ["PLANNED", "IN_PROGRESS"] },
      sourceRef: { startsWith: ORDER_FORM_AGREED_SOURCE_PREFIX },
    },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });
  return rows.filter((row) => {
    const payload = parsePayload(row.outcome);
    return payload?.workspaceSlug === slug && !payload.revokedAt && !payload.consumedAt;
  });
}

export type MintOrderFormAgreedHandoffInput = {
  customerLegalName: string;
  operatorEmail: string;
  billingEmail?: string | null;
  workspaceSlug: string;
  pilotWindowDays?: number | null;
  successCriteria?: string[];
  lockedByUserId?: string | null;
};

/** Mint (or replace) an active AGREED handoff for a workspace slug. */
export async function mintOrderFormAgreedHandoff(
  input: MintOrderFormAgreedHandoffInput,
): Promise<OrderFormAgreedHandoff> {
  const customerLegalName = String(input.customerLegalName ?? "").trim();
  const operatorEmail = String(input.operatorEmail ?? "").trim().toLowerCase();
  const workspaceSlug = String(input.workspaceSlug ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  const billingEmail = String(input.billingEmail ?? "")
    .trim()
    .toLowerCase() || null;

  if (!customerLegalName || customerLegalName.length < 2) {
    throw new Error("Customer legal name is required for AGREED handoff.");
  }
  if (!operatorEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(operatorEmail)) {
    throw new Error("Client-owned operator email is required for AGREED handoff.");
  }
  if (!workspaceSlug) {
    throw new Error("Workspace slug is required for AGREED handoff.");
  }

  // Revoke any prior open handoffs for this slug (unlock/re-lock or re-AGREED).
  const prior = await findOpenBySlug(workspaceSlug);
  for (const row of prior) {
    const payload = parsePayload(row.outcome);
    if (!payload) continue;
    await prisma.opsActivity.update({
      where: { id: row.id },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
        outcome: JSON.stringify({
          ...payload,
          revokedAt: new Date().toISOString(),
          revokeReason: "Superseded by new AGREED lock",
        } satisfies OrderFormAgreedHandoffPayload),
      },
    });
  }

  const token = newToken();
  const lockedAt = new Date().toISOString();
  const successCriteria = (input.successCriteria ?? [])
    .map((c) => String(c ?? "").trim())
    .filter(Boolean)
    .slice(0, 3);
  const payload: OrderFormAgreedHandoffPayload = {
    v: 1,
    token,
    customerLegalName,
    operatorEmail,
    billingEmail,
    workspaceSlug,
    pilotWindowDays:
      typeof input.pilotWindowDays === "number" && Number.isFinite(input.pilotWindowDays)
        ? input.pilotWindowDays
        : null,
    successCriteria,
    lockedAt,
    lockedByUserId: input.lockedByUserId ?? null,
  };

  const provisionHref = adminOnboardingProvisionHref({
    name: customerLegalName,
    email: operatorEmail,
    slug: workspaceSlug,
    handoff: token,
  });

  const activity = await upsertOpsActivity({
    title: `AGREED · provision ${customerLegalName}`,
    kind: "OPS_GENERAL",
    status: "IN_PROGRESS",
    dueAt: new Date(Date.now() + HANDOFF_TTL_MS),
    ownerLabel: "Admin SoD",
    sourceRef: sourceRefForToken(token),
    href: provisionHref,
    priority: 1,
    synopsis: `Order form AGREED handoff · ${workspaceSlug} · ${operatorEmail}`,
    outcome: JSON.stringify(payload),
    nextActions: [
      { text: "Open prefilled Quick provision (SoD)", done: false },
      { text: "Mint Path B link; send only to client-owned operator email", done: false },
    ],
  });

  // upsertOpsActivity stores synopsis in notes; keep structured payload in outcome.
  await prisma.opsActivity.update({
    where: { id: activity.id },
    data: { outcome: JSON.stringify(payload) },
  });

  const handoff = await getOrderFormAgreedHandoffByToken(token);
  if (!handoff || handoff.status !== "active") {
    throw new Error("Failed to mint AGREED handoff.");
  }
  return handoff;
}

export async function getOrderFormAgreedHandoffByToken(
  tokenRaw: string,
): Promise<OrderFormAgreedHandoff | null> {
  const token = String(tokenRaw ?? "").trim();
  if (!token) return null;
  const row = await prisma.opsActivity.findFirst({
    where: { sourceRef: sourceRefForToken(token) },
  });
  if (!row) return null;
  return toHandoff(row);
}

export async function getActiveOrderFormAgreedHandoffBySlug(
  slugRaw: string,
): Promise<OrderFormAgreedHandoff | null> {
  const slug = String(slugRaw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  if (!slug) return null;
  const open = await findOpenBySlug(slug);
  for (const row of open) {
    const handoff = toHandoff(row);
    if (handoff?.status === "active") return handoff;
  }
  return null;
}

export async function revokeOrderFormAgreedHandoff(input: {
  token?: string | null;
  workspaceSlug?: string | null;
  reason: string;
}): Promise<{ revoked: number }> {
  const reason = String(input.reason ?? "").trim() || "Order form unlocked";
  const token = String(input.token ?? "").trim();
  const slug = String(input.workspaceSlug ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");

  const targets = token
    ? await prisma.opsActivity.findMany({
        where: { sourceRef: sourceRefForToken(token) },
        take: 1,
      })
    : slug
      ? await findOpenBySlug(slug)
      : [];

  let revoked = 0;
  for (const row of targets) {
    const payload = parsePayload(row.outcome);
    if (!payload) continue;
    if (payload.revokedAt || payload.consumedAt) continue;
    await prisma.opsActivity.update({
      where: { id: row.id },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
        outcome: JSON.stringify({
          ...payload,
          revokedAt: new Date().toISOString(),
          revokeReason: reason.slice(0, 240),
        } satisfies OrderFormAgreedHandoffPayload),
      },
    });
    revoked += 1;
  }
  return { revoked };
}

/** After successful Quick provision, mark handoff consumed (SoD baton complete). */
export async function consumeOrderFormAgreedHandoff(
  tokenRaw: string,
): Promise<OrderFormAgreedHandoff | null> {
  const handoff = await getOrderFormAgreedHandoffByToken(tokenRaw);
  if (!handoff) return null;
  const row = await prisma.opsActivity.findFirst({
    where: { sourceRef: sourceRefForToken(handoff.token) },
  });
  if (!row) return null;
  const payload = parsePayload(row.outcome);
  if (!payload) return null;
  await prisma.opsActivity.update({
    where: { id: row.id },
    data: {
      status: "DONE",
      completedAt: new Date(),
      outcome: JSON.stringify({
        ...payload,
        consumedAt: new Date().toISOString(),
      } satisfies OrderFormAgreedHandoffPayload),
    },
  });
  return getOrderFormAgreedHandoffByToken(handoff.token);
}

/**
 * Validate a handoff token for Quick provision.
 * Returns trusted party fields when active; otherwise an operator-facing error.
 */
export async function requireActiveOrderFormAgreedHandoff(tokenRaw: string): Promise<
  | { ok: true; handoff: OrderFormAgreedHandoff }
  | { ok: false; error: string }
> {
  const handoff = await getOrderFormAgreedHandoffByToken(tokenRaw);
  if (!handoff) {
    return {
      ok: false,
      error:
        "AGREED handoff not found. Re-lock the order form with AGREED to mint a fresh admin handoff.",
    };
  }
  if (handoff.status === "revoked") {
    return {
      ok: false,
      error:
        "Order form was unlocked — AGREED handoff revoked. Re-lock with AGREED before Quick provision.",
    };
  }
  if (handoff.status === "consumed") {
    return {
      ok: false,
      error: "This AGREED handoff was already used for provision. Mint a new lock if you need another.",
    };
  }
  if (handoff.status === "expired") {
    return {
      ok: false,
      error: "AGREED handoff expired. Re-lock the order form with AGREED.",
    };
  }
  return { ok: true, handoff };
}
