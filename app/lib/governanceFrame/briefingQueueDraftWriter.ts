import "server-only";

import fs from "fs";
import path from "path";

import type { BoardContextPayload } from "@/app/lib/board/sharedBoardContext";
import { SYNTHETIC_DEMO_SEED_SLUGS } from "@/app/lib/board/boardMarketTruthMandate";
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
  /** True when narrate targeted a synthetic demo tenant and nothing was staged. */
  skippedSyntheticDemo?: boolean;
};

function isSyntheticDemoTenantSlug(slug: string): boolean {
  const normalized = slug.trim().toLowerCase();
  return (SYNTHETIC_DEMO_SEED_SLUGS as readonly string[]).includes(normalized);
}

/**
 * Persist nightly narrate output to `docs/briefing-queue/` with quarantine frontmatter
 * including exposure-threshold escalation flags.
 *
 * Synthetic demo seeds (medshield / vaultbank / gridcore) are never staged — illustrative
 * fixtures only, not public GF promote candidates.
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

  if (isSyntheticDemoTenantSlug(safeSlug || tenantSlug)) {
    const filename = `${operationalDate}-draft-${safeSlug || "tenant"}.md`;
    console.warn(
      `[BRIEFING DRAFT SKIP] ${filename}: synthetic demo tenant narrate — not staged to briefing-queue.`,
    );
    return {
      absolutePath: "",
      filename,
      requiresImmediatePromotion: false,
      currentExposureCents: currentExposureCents.toString(),
      thresholdCents: threshold.thresholdCents.toString(),
      skippedSyntheticDemo: true,
    };
  }

  const filename = `${operationalDate}-draft-${safeSlug || "tenant"}.md`;

  const title = `Governance Frame Briefing — ${operationalDate}`;
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
