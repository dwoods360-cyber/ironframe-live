import "server-only";

import fs from "fs";
import path from "path";

import type { BoardContextPayload } from "@/app/lib/board/sharedBoardContext";
import {
  buildBriefingDraftFrontmatter,
  evaluateAlertThresholds,
} from "@/app/lib/governanceFrame/briefingDraftValidation";
import { BRIEFING_QUEUE_DIR } from "@/app/lib/governanceFrame/briefingLoader";

function resolveDocsRoot(): string {
  const candidates = [
    path.join(process.cwd(), "docs"),
    path.join(process.cwd(), "..", "docs"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "TAS.md"))) return dir;
  }
  return candidates[0];
}

export type WriteBriefingQueueDraftResult = {
  absolutePath: string;
  filename: string;
  requiresImmediatePromotion: boolean;
  currentExposureCents: string;
  thresholdCents: string;
};

/**
 * Persist nightly narrate output to `docs/briefing-queue/` with quarantine frontmatter
 * including exposure-threshold escalation flags.
 */
export function writeBriefingQueueDraftFromNarrate(
  payload: BoardContextPayload,
  narrativeMarkdown: string,
  operationalDate: string,
): WriteBriefingQueueDraftResult {
  const currentExposureCents = payload.financials.currentExposureCents;
  const threshold = evaluateAlertThresholds(currentExposureCents);
  const tenantSlug = payload.financials.display.activeTenant.slug || "tenant";
  const safeSlug = String(tenantSlug)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const filename = `${operationalDate}-draft-${safeSlug || "tenant"}.md`;

  const title = `Automated Governance Triad Narrative — ${payload.financials.display.activeTenant.companyName}`;
  const frontmatter = buildBriefingDraftFrontmatter({
    title,
    dateIso: new Date().toISOString(),
    tenantId: payload.tenantId,
    tenantSlug: safeSlug || "tenant",
    currentExposureCents,
    requiresImmediatePromotion: threshold.requiresImmediatePromotion,
  });

  const docsRoot = resolveDocsRoot();
  const queueDir = path.join(docsRoot, BRIEFING_QUEUE_DIR);
  fs.mkdirSync(queueDir, { recursive: true });

  const absolutePath = path.join(queueDir, filename);
  const body = narrativeMarkdown.startsWith("#")
    ? narrativeMarkdown
    : `# ${title}\n\n${narrativeMarkdown}`;
  fs.writeFileSync(absolutePath, `${frontmatter}\n${body}\n`, "utf-8");

  if (threshold.requiresImmediatePromotion) {
    console.warn(
      `[BRIEFING DRAFT WARN] ${filename}: URGENT — exposure ${currentExposureCents.toString()} ¢ >= threshold ${threshold.thresholdCents.toString()} ¢; awaiting promote-briefing-draft.ts signature.`,
    );
  }

  return {
    absolutePath,
    filename,
    requiresImmediatePromotion: threshold.requiresImmediatePromotion,
    currentExposureCents: currentExposureCents.toString(),
    thresholdCents: threshold.thresholdCents.toString(),
  };
}
