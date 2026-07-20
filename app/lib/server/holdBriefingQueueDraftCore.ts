import "server-only";

import {
  DRAFT_FILENAME_PATTERN,
  isNonPromotableBriefingDraft,
} from "@/app/lib/governanceFrame/briefingDraftValidation";
import prisma from "@/lib/prisma";

export type HoldBriefingQueueDraftResult =
  | { ok: true; filename: string; onHold: true }
  | { ok: false; error: string };

function normalizeQueueFilename(raw: string): string {
  return raw.trim().replace(/\\/g, "/").split("/").pop() ?? "";
}

/**
 * Operator hold gate — keep draft in quarantine for later reading.
 * Does not publish, does not deny, does not delete the file.
 */
export async function holdBriefingQueueDraftCore(input: {
  filename: string;
  operator: string;
  note?: string;
}): Promise<HoldBriefingQueueDraftResult> {
  const filename = normalizeQueueFilename(input.filename);
  if (!filename || !DRAFT_FILENAME_PATTERN.test(filename)) {
    return {
      ok: false,
      error: "Invalid filename — use YYYY-MM-DD-draft-{slug}.md.",
    };
  }
  if (isNonPromotableBriefingDraft(filename)) {
    return { ok: false, error: `${filename} is not a holdable queue draft.` };
  }

  const note = input.note?.trim() || null;
  await prisma.$executeRaw`
    INSERT INTO "briefing_queue_holds" ("filename", "note", "held_by", "created_at")
    VALUES (${filename}, ${note}, ${input.operator}, CURRENT_TIMESTAMP)
    ON CONFLICT ("filename") DO UPDATE SET
      "held_by" = EXCLUDED."held_by",
      "note" = EXCLUDED."note",
      "created_at" = CURRENT_TIMESTAMP
  `;

  console.log(
    `[AUDIT] ${JSON.stringify({
      event: "BRIEFING_QUEUE_HELD",
      filename,
      operator: input.operator,
    })}`,
  );

  return { ok: true, filename, onHold: true };
}

export async function clearBriefingQueueHold(filenameRaw: string): Promise<void> {
  const filename = normalizeQueueFilename(filenameRaw);
  if (!filename) return;
  try {
    await prisma.$executeRaw`
      DELETE FROM "briefing_queue_holds" WHERE "filename" = ${filename}
    `;
  } catch {
    // Table may not exist yet on older envs — hold is best-effort metadata.
  }
}

/**
 * Operator resume — remove hold so the draft returns to the active Approve/Deny desk.
 * Does not publish or deny.
 */
export async function resumeBriefingQueueDraftCore(input: {
  filename: string;
  operator: string;
}): Promise<{ ok: true; filename: string } | { ok: false; error: string }> {
  const filename = normalizeQueueFilename(input.filename);
  if (!filename || !DRAFT_FILENAME_PATTERN.test(filename)) {
    return {
      ok: false,
      error: "Invalid filename — use YYYY-MM-DD-draft-{slug}.md.",
    };
  }
  await clearBriefingQueueHold(filename);
  console.log(
    `[AUDIT] ${JSON.stringify({
      event: "BRIEFING_QUEUE_HOLD_RELEASED",
      filename,
      operator: input.operator,
    })}`,
  );
  return { ok: true, filename };
}

export async function listHeldBriefingFilenames(): Promise<Set<string>> {
  try {
    const rows = await prisma.$queryRaw<Array<{ filename: string }>>`
      SELECT "filename" FROM "briefing_queue_holds"
    `;
    return new Set(rows.map((row) => row.filename));
  } catch {
    return new Set();
  }
}
