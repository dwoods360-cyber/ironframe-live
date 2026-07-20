/**
 * Seed Ops Calendar with all 2026 project packs + open queue draft reviews.
 * Usage: npx tsx scripts/seed-ops-calendar.ts
 *
 * Prefer Ops Hub → Calendar → "Seed all projects" (same seed functions).
 * Every activity must carry a synopsis + href; open items get nextActions.
 */
import { PrismaClient, type OpsActivityKind } from "@prisma/client";
import fs from "fs";
import path from "path";

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
  type OpsScheduleSeedSpec,
} from "../app/lib/opsScheduleSeedSpecs";
import { hrefForQueueDraft } from "../app/lib/opsScheduleLinks";

const prisma = new PrismaClient();

async function persistHref(id: string, href: string) {
  await prisma.$executeRaw`
    UPDATE ops_activities SET href = ${href}, updated_at = NOW() WHERE id = ${id}
  `;
}

async function persistPriority(id: string, priority: number) {
  const rank = Math.max(1, Math.floor(priority));
  await prisma.$executeRaw`
    UPDATE ops_activities SET priority = ${rank}, updated_at = NOW() WHERE id = ${id}
  `;
}

async function persistOutcome(id: string, outcome: string | null) {
  await prisma.$executeRaw`
    UPDATE ops_activities SET outcome = ${outcome}, updated_at = NOW() WHERE id = ${id}
  `;
}

async function persistNextActions(id: string, actions: OpsChecklistItem[]) {
  const serialized = serializeNextActionItems(actions);
  await prisma.$executeRaw`
    UPDATE ops_activities SET next_actions = ${serialized || null}, updated_at = NOW() WHERE id = ${id}
  `;
}

async function readExtras(
  id: string,
): Promise<{ href: string; outcome: string; nextActions: string; priority: number }> {
  const rows = await prisma.$queryRaw<
    Array<{
      href: string | null;
      outcome: string | null;
      next_actions: string | null;
      priority: number | null;
    }>
  >`
    SELECT href, outcome, next_actions, priority FROM ops_activities WHERE id = ${id} LIMIT 1
  `;
  return {
    href: (rows[0]?.href ?? "").trim(),
    outcome: (rows[0]?.outcome ?? "").trim(),
    nextActions: (rows[0]?.next_actions ?? "").trim(),
    priority:
      typeof rows[0]?.priority === "number" && Number.isFinite(rows[0].priority)
        ? rows[0].priority
        : 50,
  };
}

async function upsertSeed(spec: OpsScheduleSeedSpec) {
  const nextSynopsis = spec.synopsis.trim();
  const nextHref = hrefForSeedSpec(spec);
  const nextOutcome = (spec.outcome ?? "").trim();
  const nextActionTexts = nextActionsForSeedSpec(spec);
  const nextPriority = Math.max(1, Math.floor(spec.priority ?? 50));
  const existing = await prisma.opsActivity.findFirst({
    where: { sourceRef: spec.sourceRef, kind: spec.kind },
  });
  if (existing) {
    const prev = await readExtras(existing.id);
    const prevItems = parseNextActionItems(prev.nextActions);
    const mergedItems = mergeNextActionItems(prevItems, nextActionTexts);
    const nextActionsSerialized = serializeNextActionItems(mergedItems);
    const prevActionsSerialized = serializeNextActionItems(prevItems);
    const statusChanged = existing.status !== spec.status;
    const nextDueAt = new Date(spec.dueAt);
    const dueChanged = existing.dueAt.getTime() !== nextDueAt.getTime();
    const priorityChanged = prev.priority !== nextPriority;
    const outcomeChanged = nextOutcome
      ? prev.outcome !== nextOutcome
      : Boolean(prev.outcome) &&
        (spec.status === "PLANNED" ||
          spec.status === "IN_PROGRESS" ||
          spec.status === "IN_REVIEW");
    if (
      (existing.notes ?? "").trim() !== nextSynopsis ||
      existing.title !== spec.title ||
      prev.href !== nextHref ||
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
      await persistHref(existing.id, nextHref);
      await persistPriority(existing.id, nextPriority);
      if (nextOutcome) await persistOutcome(existing.id, nextOutcome);
      else if (outcomeChanged) await persistOutcome(existing.id, null);
      await persistNextActions(existing.id, mergedItems);
      return { created: false, updated: true, id: existing.id, title: spec.title };
    }
    return { created: false, updated: false, id: existing.id, title: existing.title };
  }

  const row = await prisma.opsActivity.create({
    data: {
      title: spec.title,
      kind: spec.kind,
      status: spec.status,
      dueAt: new Date(spec.dueAt),
      ownerLabel: process.env.OPS_SCHEDULE_DEFAULT_OWNER?.trim() || "Ops",
      sourceRef: spec.sourceRef,
      notes: nextSynopsis,
      remindersSent: {},
      completedAt: spec.status === "DONE" || spec.status === "CANCELLED" ? new Date() : null,
    },
  });
  await persistHref(row.id, nextHref);
  await persistPriority(row.id, nextPriority);
  if (nextOutcome) await persistOutcome(row.id, nextOutcome);
  await persistNextActions(
    row.id,
    nextActionTexts.map((text) => ({ text, done: false })),
  );
  return { created: true, updated: false, id: row.id, title: row.title };
}

async function main() {
  let created = 0;
  let skipped = 0;
  let updated = 0;
  const slate: OpsScheduleSeedSpec[] = allProjects2026SeedSpecs();
  for (const spec of slate) {
    if (!spec.synopsis?.trim()) {
      throw new Error(`Seed spec missing synopsis: ${spec.sourceRef}`);
    }
    const result = await upsertSeed(spec);
    if (result.created) {
      created += 1;
      console.log("created", result.title);
    } else if (result.updated) {
      updated += 1;
      console.log("updated ", result.title);
      for (const step of nextActionsForSeedSpec(spec)) {
        console.log("         -", step);
      }
    } else {
      skipped += 1;
      console.log("exists ", result.title);
    }
  }

  const queueDir = path.join(process.cwd(), "docs", "briefing-queue");
  const files = fs.existsSync(queueDir)
    ? fs
        .readdirSync(queueDir)
        .filter(
          (f) =>
            f.endsWith(".md") &&
            f.toLowerCase() !== "readme.md" &&
            /draft|newsletter|briefing|research|medshield/i.test(f),
        )
    : [];

  for (const filename of files) {
    const isNewsletter = /newsletter/i.test(filename);
    const kind: OpsActivityKind = isNewsletter ? "NEWSLETTER_REVIEW" : "BRIEFING_REVIEW";
    const synopsis = synopsisForQueueDraft(filename);
    const href = hrefForQueueDraft(filename);
    const title = `Review ${isNewsletter ? "newsletter" : "briefing"} draft: ${filename}`;
    const actionTexts = defaultNextActionsFor({
      kind,
      status: "IN_REVIEW",
      title,
      sourceRef: filename,
    });
    const existing = await prisma.opsActivity.findFirst({
      where: { sourceRef: filename },
    });
    if (existing) {
      const notes = (existing.notes ?? "").trim();
      const prev = await readExtras(existing.id);
      if (!notes) {
        await prisma.opsActivity.update({
          where: { id: existing.id },
          data: { notes: synopsis },
        });
      }
      if (!prev.href) await persistHref(existing.id, href);
      // Only backfill empty checklists. Slate seeds own nextActions for known drafts —
      // do not replace an explicit Ops checklist with generic queue defaults.
      if (
        !["DONE", "CANCELLED"].includes(existing.status) &&
        !prev.nextActions.trim()
      ) {
        const items = actionTexts.map((text) => ({ text, done: false }));
        await persistNextActions(existing.id, items);
        updated += 1;
        console.log("filled queue nextActions", filename);
        continue;
      }
      console.log("queue covered", filename);
      continue;
    }
    const due = new Date();
    due.setUTCDate(due.getUTCDate() + 1);
    while (due.getUTCDay() === 0 || due.getUTCDay() === 6) due.setUTCDate(due.getUTCDate() + 1);
    due.setUTCHours(17, 0, 0, 0);
    const row = await prisma.opsActivity.create({
      data: {
        title,
        kind,
        status: "IN_REVIEW",
        dueAt: due,
        ownerLabel: process.env.OPS_SCHEDULE_DEFAULT_OWNER?.trim() || "Ops",
        sourceRef: filename,
        notes: synopsis,
        remindersSent: {},
      },
    });
    await persistHref(row.id, href);
    await persistNextActions(
      row.id,
      actionTexts.map((text) => ({ text, done: false })),
    );
    created += 1;
    console.log("created queue-review", filename);
  }

  const missingOpenActions = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM ops_activities
    WHERE status IN ('PLANNED', 'IN_PROGRESS', 'IN_REVIEW')
      AND (next_actions IS NULL OR BTRIM(next_actions) = '')
  `;
  console.log(
    JSON.stringify(
      {
        created,
        updated,
        skipped,
        missingOpenNextActions: Number(missingOpenActions[0]?.count ?? 0),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
