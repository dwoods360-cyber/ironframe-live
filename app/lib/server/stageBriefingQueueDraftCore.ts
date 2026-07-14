import "server-only";

import fs from "fs";
import path from "path";

import {
  DRAFT_FILENAME_PATTERN,
  isNonPromotableBriefingDraft,
  validateBriefingQueueDraft,
  type BriefingDraftValidationIssue,
} from "@/app/lib/governanceFrame/briefingDraftValidation";
import {
  BRIEFING_QUEUE_DIR,
  resolveDocsRoot,
} from "@/app/lib/governanceFrame/briefingFilesystemLedger";

export type StageBriefingQueueDraftInput = {
  filename: string;
  markdown: string;
  /** When true, overwrite an existing queue file with the same name. */
  overwrite?: boolean;
};

export type StageBriefingQueueDraftResult =
  | {
      ok: true;
      filename: string;
      absolutePath: string;
      validationOk: boolean;
      issues: BriefingDraftValidationIssue[];
    }
  | {
      ok: false;
      error: string;
      issues?: BriefingDraftValidationIssue[];
    };

/**
 * Operator staging gate — write a governance draft into `docs/briefing-queue/` for
 * Ops Hub review / promote. Does not publish or syndicate.
 */
export function stageBriefingQueueDraftCore(
  input: StageBriefingQueueDraftInput,
): StageBriefingQueueDraftResult {
  const filename = input.filename.trim().replace(/\\/g, "/").split("/").pop() ?? "";
  const markdown = String(input.markdown ?? "").trim();

  if (!filename || !markdown) {
    return { ok: false, error: "filename and markdown are required." };
  }

  if (filename.includes("..") || !DRAFT_FILENAME_PATTERN.test(filename)) {
    return {
      ok: false,
      error:
        "Invalid filename — use YYYY-MM-DD-draft-{slug}.md (lowercase letters, digits, hyphens).",
    };
  }

  if (isNonPromotableBriefingDraft(filename)) {
    return {
      ok: false,
      error: `${filename} matches a non-promotable ops artifact pattern.`,
    };
  }

  const docsRoot = resolveDocsRoot();
  const queueDir = path.join(docsRoot, BRIEFING_QUEUE_DIR);
  const absolutePath = path.join(queueDir, filename);

  if (fs.existsSync(absolutePath) && input.overwrite !== true) {
    return {
      ok: false,
      error: `Queue draft already exists: ${filename}. Pass overwrite=true to replace.`,
    };
  }

  const validation = validateBriefingQueueDraft(filename, markdown, { promotion: false });
  const hardErrors = validation.issues.filter((issue) => issue.severity === "error");
  if (hardErrors.length > 0) {
    return {
      ok: false,
      error: "Staging blocked — fix validation errors.",
      issues: validation.issues,
    };
  }

  fs.mkdirSync(queueDir, { recursive: true });
  fs.writeFileSync(absolutePath, `${markdown.replace(/\s+$/, "")}\n`, "utf-8");

  return {
    ok: true,
    filename,
    absolutePath,
    validationOk: validation.ok,
    issues: validation.issues,
  };
}

export type StageBriefingQueueBatchResult = {
  ok: boolean;
  staged: Array<Extract<StageBriefingQueueDraftResult, { ok: true }>>;
  failed: Array<{ filename: string; error: string; issues?: BriefingDraftValidationIssue[] }>;
};

export function stageBriefingQueueDraftBatch(
  drafts: StageBriefingQueueDraftInput[],
): StageBriefingQueueBatchResult {
  const staged: StageBriefingQueueBatchResult["staged"] = [];
  const failed: StageBriefingQueueBatchResult["failed"] = [];

  for (const draft of drafts) {
    const result = stageBriefingQueueDraftCore(draft);
    if (result.ok) {
      staged.push(result);
    } else {
      failed.push({
        filename: draft.filename.trim() || "(missing)",
        error: result.error,
        issues: result.issues,
      });
    }
  }

  return {
    ok: failed.length === 0 && staged.length > 0,
    staged,
    failed,
  };
}
