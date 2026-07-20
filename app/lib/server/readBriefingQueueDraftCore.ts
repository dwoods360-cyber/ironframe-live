import "server-only";

import fs from "fs";
import path from "path";

import {
  DRAFT_FILENAME_PATTERN,
  QUARANTINE_ALLOWLIST,
  validateBriefingQueueDraft,
} from "@/app/lib/governanceFrame/briefingDraftValidation";
import {
  BRIEFING_QUEUE_DIR,
  resolveDocsRoot,
} from "@/app/lib/governanceFrame/briefingFilesystemLedger";
import { parseTitleFromMarkdown } from "@/app/lib/governanceFrame/briefingMarkdown";

export type ReadBriefingQueueDraftResult =
  | {
      ok: true;
      filename: string;
      title: string;
      markdown: string;
      validationOk: boolean;
    }
  | { ok: false; error: string; status: 400 | 404 };

/**
 * Operator read of a quarantined draft — never compiles or publishes.
 */
export function readBriefingQueueDraftCore(rawFilename: string): ReadBriefingQueueDraftResult {
  const filename = rawFilename.trim();
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return { ok: false, error: "Invalid filename.", status: 400 };
  }
  if (!filename.endsWith(".md") || QUARANTINE_ALLOWLIST.has(filename.toLowerCase())) {
    return { ok: false, error: "Not a readable queue draft.", status: 400 };
  }
  if (!DRAFT_FILENAME_PATTERN.test(filename) && !/-draft-/i.test(filename)) {
    return { ok: false, error: "Filename does not match queue draft convention.", status: 400 };
  }

  const docsRoot = resolveDocsRoot();
  const queueDir = path.join(docsRoot, BRIEFING_QUEUE_DIR);
  const filePath = path.join(queueDir, filename);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(queueDir) + path.sep)) {
    return { ok: false, error: "Invalid filename.", status: 400 };
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return { ok: false, error: `Draft not found: ${filename}`, status: 404 };
  }

  const markdown = fs.readFileSync(resolved, "utf-8");
  const validation = validateBriefingQueueDraft(filename, markdown);
  return {
    ok: true,
    filename,
    title: parseTitleFromMarkdown(markdown, filename),
    markdown,
    validationOk: validation.ok,
  };
}
