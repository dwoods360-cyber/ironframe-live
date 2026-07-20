import "server-only";

import fs from "fs";
import path from "path";

import {
  DRAFT_FILENAME_PATTERN,
  isNonPromotableBriefingDraft,
} from "@/app/lib/governanceFrame/briefingDraftValidation";
import {
  BRIEFING_QUEUE_DIR,
  resolveDocsRoot,
} from "@/app/lib/governanceFrame/briefingFilesystemLedger";
import { clearBriefingQueueHold } from "@/app/lib/server/holdBriefingQueueDraftCore";
import prisma from "@/lib/prisma";

export type DenyBriefingQueueDraftResult =
  | {
      ok: true;
      filename: string;
      removedFromFilesystem: boolean;
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Operator deny gate — hide a quarantined draft from Ops Hub approve/deny desks.
 * Persists a denial receipt in Postgres (durable on Vercel) and best-effort unlinks the file.
 */
export async function denyBriefingQueueDraftCore(input: {
  filename: string;
  operator: string;
  reason?: string;
}): Promise<DenyBriefingQueueDraftResult> {
  const filename = input.filename.trim().replace(/\\/g, "/").split("/").pop() ?? "";
  if (!filename || !DRAFT_FILENAME_PATTERN.test(filename)) {
    return {
      ok: false,
      error: "Invalid filename — use YYYY-MM-DD-draft-{slug}.md.",
    };
  }
  if (isNonPromotableBriefingDraft(filename)) {
    return { ok: false, error: `${filename} is not a promotable queue draft.` };
  }

  const reason = input.reason?.trim() || null;
  await prisma.$executeRaw`
    INSERT INTO "briefing_queue_denials" ("filename", "reason", "denied_by", "created_at")
    VALUES (${filename}, ${reason}, ${input.operator}, CURRENT_TIMESTAMP)
    ON CONFLICT ("filename") DO UPDATE SET
      "denied_by" = EXCLUDED."denied_by",
      "reason" = EXCLUDED."reason"
  `;

  await clearBriefingQueueHold(filename);

  const docsRoot = resolveDocsRoot();
  const absolutePath = path.join(docsRoot, BRIEFING_QUEUE_DIR, filename);
  let removedFromFilesystem = false;
  if (fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
      removedFromFilesystem = true;
    } catch {
      removedFromFilesystem = false;
    }
  }

  console.log(
    `[AUDIT] ${JSON.stringify({
      event: "BRIEFING_QUEUE_DENIED",
      filename,
      operator: input.operator,
      removedFromFilesystem,
    })}`,
  );

  return { ok: true, filename, removedFromFilesystem };
}

export async function listDeniedBriefingFilenames(): Promise<Set<string>> {
  try {
    const rows = await prisma.$queryRaw<Array<{ filename: string }>>`
      SELECT "filename" FROM "briefing_queue_denials"
    `;
    return new Set(rows.map((row) => row.filename));
  } catch {
    return new Set();
  }
}
