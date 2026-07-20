import { NextRequest, NextResponse } from "next/server";
import type { OpsActivityKind, OpsActivityStatus } from "@prisma/client";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import {
  buildOpsScheduleSnapshot,
  seedSummer2026OpsSchedule,
  setOpsActivityChecklistItem,
  updateOpsActivityStatus,
  upsertOpsActivity,
} from "@/app/lib/server/opsScheduleCore";
import { operationsPortalErrorResponse } from "@/app/lib/server/operationsPortalHttp";

export const dynamic = "force-dynamic";

const KINDS = new Set<OpsActivityKind>([
  "BRIEFING_OUTLINE",
  "BRIEFING_DRAFT",
  "BRIEFING_REVIEW",
  "NEWSLETTER_DRAFT",
  "NEWSLETTER_REVIEW",
  "NEWSLETTER_SYNDICATE",
  "RESEARCH_PAPER",
  "OPS_GENERAL",
]);

const STATUSES = new Set<OpsActivityStatus>([
  "PLANNED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CANCELLED",
]);

export async function GET() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const schedule = await buildOpsScheduleSnapshot();
    return NextResponse.json({ ok: true, schedule });
  } catch (err) {
    return operationsPortalErrorResponse(err, "Ops schedule snapshot");
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: {
    action?: string;
    id?: string;
    title?: string;
    kind?: string;
    status?: string;
    dueAt?: string;
    ownerLabel?: string;
    sourceRef?: string | null;
    href?: string | null;
    synopsis?: string | null;
    notes?: string | null;
    outcome?: string | null;
    index?: number;
    done?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = (body.action ?? "upsert").trim().toLowerCase();

  try {
    if (action === "seed-summer-2026" || action === "seed-all-projects") {
      const result = await seedSummer2026OpsSchedule();
      return NextResponse.json({
        ok: true,
        action,
        ...result,
        operator: auth.userId,
        message: `Seeded ${result.created} new; updated ${result.updated} synopses; skipped ${result.skipped} unchanged.`,
      });
    }

    if (action === "set-status") {
      const id = body.id?.trim();
      const status = body.status?.trim() as OpsActivityStatus | undefined;
      if (!id || !status || !STATUSES.has(status)) {
        return NextResponse.json(
          { error: "set-status requires id and a valid status." },
          { status: 400 },
        );
      }
      if (
        (status === "DONE" || status === "CANCELLED") &&
        !(body.outcome ?? "").trim()
      ) {
        return NextResponse.json(
          {
            error:
              "set-status to DONE/CANCELLED requires outcome — record what was completed for review.",
          },
          { status: 400 },
        );
      }
      const activity = await updateOpsActivityStatus(id, status, body.outcome);
      return NextResponse.json({ ok: true, action, activity, operator: auth.userId });
    }

    if (action === "set-checklist-item") {
      const id = body.id?.trim();
      const index = typeof body.index === "number" ? body.index : Number(body.index);
      if (!id || !Number.isInteger(index) || typeof body.done !== "boolean") {
        return NextResponse.json(
          { error: "set-checklist-item requires id, index (integer), and done (boolean)." },
          { status: 400 },
        );
      }
      const activity = await setOpsActivityChecklistItem(id, index, body.done);
      return NextResponse.json({ ok: true, action, activity, operator: auth.userId });
    }

    const kind = body.kind?.trim() as OpsActivityKind | undefined;
    const synopsis = (body.synopsis ?? body.notes ?? "").trim();
    const href = (body.href ?? "").trim();
    if (!body.title?.trim() || !kind || !KINDS.has(kind) || !body.dueAt) {
      return NextResponse.json(
        { error: "upsert requires title, kind, and dueAt." },
        { status: 400 },
      );
    }
    if (!synopsis) {
      return NextResponse.json(
        { error: "upsert requires synopsis — a brief what/why for the calendar card." },
        { status: 400 },
      );
    }
    if (!href && !body.sourceRef?.trim()) {
      return NextResponse.json(
        { error: "upsert requires href (or sourceRef to derive a link)." },
        { status: 400 },
      );
    }
    if (body.status && !STATUSES.has(body.status as OpsActivityStatus)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const activity = await upsertOpsActivity({
      id: body.id?.trim() || undefined,
      title: body.title,
      kind,
      status: body.status as OpsActivityStatus | undefined,
      dueAt: body.dueAt,
      ownerLabel: body.ownerLabel,
      sourceRef: body.sourceRef,
      href: href || undefined,
      synopsis,
    });

    return NextResponse.json(
      { ok: true, action: "upsert", activity, operator: auth.userId },
      { status: body.id ? 200 : 201 },
    );
  } catch (err) {
    return operationsPortalErrorResponse(err, "Ops schedule mutation");
  }
}
