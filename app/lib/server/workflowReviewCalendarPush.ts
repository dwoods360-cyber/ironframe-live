import "server-only";

import { createHash } from "crypto";

import type { OpsActivitySummary } from "@/app/lib/server/opsScheduleCore";
import { upsertOpsActivity } from "@/app/lib/server/opsScheduleCore";
import type {
  WorkflowReviewActionItem,
  WorkflowReviewCallRecap,
} from "@/app/lib/server/workflowReviewCallAssistCore";
import prisma from "@/lib/prisma";

export function dueAtForRecapPriority(
  priority: WorkflowReviewActionItem["priority"],
  now = new Date(),
): Date {
  const due = new Date(now.getTime());
  if (priority === "now") {
    due.setHours(due.getHours() + 4);
    return due;
  }
  if (priority === "this_week") {
    due.setDate(due.getDate() + 3);
    due.setUTCHours(17, 0, 0, 0);
    return due;
  }
  due.setDate(due.getDate() + 14);
  due.setUTCHours(17, 0, 0, 0);
  return due;
}

export function sourceRefForRecapAction(company: string, text: string): string {
  const slug = company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const hash = createHash("sha256").update(text.trim().toLowerCase()).digest("hex").slice(0, 12);
  return `wf-recap:${slug || "prospect"}:${hash}`;
}

function ownerLabelFor(owner: WorkflowReviewActionItem["owner"]): string {
  if (owner === "prospect") return "Prospect";
  if (owner === "shared") return "Sales+Prospect";
  return "Sales";
}

function priorityRank(priority: WorkflowReviewActionItem["priority"]): number {
  if (priority === "now") return 8;
  if (priority === "this_week") return 25;
  return 45;
}

export async function pushWorkflowReviewRecapToCalendar(
  recap: WorkflowReviewCallRecap,
): Promise<{
  created: number;
  updated: number;
  activities: OpsActivitySummary[];
}> {
  let created = 0;
  let updated = 0;
  const activities: OpsActivitySummary[] = [];
  const company = recap.company.trim() || "Prospect";

  for (const item of recap.actionItems) {
    const sourceRef = sourceRefForRecapAction(company, item.text);
    const title = `[WF review] ${company}: ${item.text}`.slice(0, 180);
    const synopsis = [
      `From workflow-review recap (${recap.closeReadiness.band} · ${recap.closeReadiness.score}/100).`,
      recap.contactName ? `Contact: ${recap.contactName}.` : null,
      `Owner: ${item.owner}. Priority: ${item.priority}.`,
      recap.pathBAsk,
    ]
      .filter(Boolean)
      .join(" ");

    const existing = await prisma.opsActivity.findFirst({
      where: { sourceRef, kind: "OPS_GENERAL" },
      select: { id: true },
    });

    const activity = await upsertOpsActivity({
      id: existing?.id,
      title,
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: dueAtForRecapPriority(item.priority),
      ownerLabel: ownerLabelFor(item.owner),
      sourceRef,
      priority: priorityRank(item.priority),
      href: "/dashboard/operations/workflow-review",
      synopsis,
      nextActions: [
        { text: item.text, done: false },
        { text: "Update deal notes / Path B status after done", done: false },
      ],
    });

    if (existing?.id) updated += 1;
    else created += 1;
    activities.push(activity);
  }

  return { created, updated, activities };
}
