import fs from "fs";
import path from "path";

import {
  computeReadyForHumanOperator,
  emptyDeskReview,
  type DeskReviewChecklist,
} from "./types";

export const DESK_REVIEW_DIRNAME = ".desk-reviews" as const;

export function deskReviewFilenameForDraft(draftFilename: string): string {
  const base = draftFilename.replace(/\.md$/i, "").trim();
  return `${base}.desk.json`;
}

export function resolveDeskReviewPath(docsRoot: string, draftFilename: string): string {
  return path.join(
    docsRoot,
    "briefing-queue",
    DESK_REVIEW_DIRNAME,
    deskReviewFilenameForDraft(draftFilename),
  );
}

export function readDeskReview(
  docsRoot: string,
  draftFilename: string,
): DeskReviewChecklist | null {
  const absolute = resolveDeskReviewPath(docsRoot, draftFilename);
  if (!fs.existsSync(absolute)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(absolute, "utf-8")) as DeskReviewChecklist;
    if (parsed?.schemaVersion !== 1 || typeof parsed.filename !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDeskReview(
  docsRoot: string,
  review: DeskReviewChecklist,
): { ok: true; absolutePath: string } | { ok: false; error: string } {
  const absolute = resolveDeskReviewPath(docsRoot, review.filename);
  try {
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    const next: DeskReviewChecklist = {
      ...review,
      updatedAt: new Date().toISOString(),
      readyForHumanOperator: computeReadyForHumanOperator(review),
    };
    fs.writeFileSync(absolute, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
    return { ok: true, absolutePath: absolute };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to write desk review.",
    };
  }
}

export function ensureDeskReview(docsRoot: string, draftFilename: string): DeskReviewChecklist {
  return readDeskReview(docsRoot, draftFilename) ?? emptyDeskReview(draftFilename);
}
