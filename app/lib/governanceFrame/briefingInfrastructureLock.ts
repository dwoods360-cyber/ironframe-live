import fs from "fs";
import path from "path";

import {
  QUARANTINE_ALLOWLIST,
  isNonPromotableBriefingDraft,
} from "@/app/lib/governanceFrame/briefingDraftValidation";
import {
  BRIEFING_QUEUE_DIR,
  PUBLISHED_BRIEFINGS_DIR,
  enforceBriefingQuarantine,
  loadPublishedBriefingsFromFilesystem,
  resolveDocsRoot,
} from "@/app/lib/governanceFrame/briefingFilesystemLedger";
import { parseFrontmatterField } from "@/app/lib/governanceFrame/briefingMarkdown";
import { scanPublicBriefingDeclassification } from "@/app/lib/governanceFrame/publicBriefingDeclassification";
import { scanPublishedBriefingsForRss } from "../../../scripts/compile-rss";

export type BriefingInfrastructureLockIssue = {
  code: string;
  message: string;
  severity: "error" | "warn";
  scope?: string;
};

export type BriefingInfrastructureLockResult = {
  ok: boolean;
  issues: BriefingInfrastructureLockIssue[];
};

export type BriefingInfrastructureLockOptions = {
  docsRoot?: string;
  /** When true, published ledger must contain zero public declassification errors. */
  strictPublishedLedger?: boolean;
  /** When true, RSS scan must not include queue slugs even if files were misplaced. */
  verifyRssIsolation?: boolean;
};

const STAGING_CLASSIFICATION_PATTERN = /\bstaging\b/i;

function issue(
  code: string,
  message: string,
  severity: "error" | "warn",
  scope?: string,
): BriefingInfrastructureLockIssue {
  return { code, message, severity, scope };
}

function listMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);
}

function isStagingPublishedBriefing(markdown: string): boolean {
  const classification = parseFrontmatterField(markdown, "classification") ?? "";
  return STAGING_CLASSIFICATION_PATTERN.test(classification);
}

/** Scan published ledger for quarantine markers and public declassification violations. */
export function scanPublishedLedgerExposure(
  docsRoot = resolveDocsRoot(),
): BriefingInfrastructureLockIssue[] {
  const issues: BriefingInfrastructureLockIssue[] = [];
  const publishedDir = path.join(docsRoot, PUBLISHED_BRIEFINGS_DIR);

  for (const filename of listMarkdownFiles(publishedDir)) {
    const scope = `${PUBLISHED_BRIEFINGS_DIR}/${filename}`;
    const markdown = fs.readFileSync(path.join(publishedDir, filename), "utf8");
    const status = parseFrontmatterField(markdown, "status");

    if (status?.toUpperCase() === "QUARANTINED_DRAFT") {
      issues.push(
        issue(
          "PUBLISHED_QUARANTINE_MARKER",
          "Published ledger file still carries QUARANTINED_DRAFT status.",
          "error",
          scope,
        ),
      );
    }

    if (isStagingPublishedBriefing(markdown)) {
      issues.push(
        issue(
          "PUBLISHED_STAGING_CLASSIFICATION",
          "Published ledger file is classified for internal staging — exclude from RSS/deploy.",
          "warn",
          scope,
        ),
      );
      continue;
    }

    const profile =
      parseFrontmatterField(markdown, "classification")?.toLowerCase().includes("emerging threat")
        ? "emerging-threats-notice"
        : "governance-triad";

    for (const finding of scanPublicBriefingDeclassification(markdown, { profile })) {
      if (finding.severity !== "error") continue;
      issues.push(
        issue(
          `PUBLISHED_${finding.code}`,
          finding.message,
          "error",
          scope,
        ),
      );
    }
  }

  return issues;
}

/** Verify RSS compiler only surfaces slugs from the published filesystem ledger. */
export function verifyRssCompilerIsolation(
  docsRoot = resolveDocsRoot(),
): BriefingInfrastructureLockIssue[] {
  const issues: BriefingInfrastructureLockIssue[] = [];
  const rssItems = scanPublishedBriefingsForRss(docsRoot);
  const publishedSlugs = new Set(
    loadPublishedBriefingsFromFilesystem(docsRoot).map((briefing) => briefing.slug.toLowerCase()),
  );

  for (const item of rssItems) {
    if (!publishedSlugs.has(item.slug.toLowerCase())) {
      issues.push(
        issue(
          "RSS_UNPUBLISHED_SLUG",
          `RSS item slug is absent from published-briefings ledger: ${item.slug}`,
          "error",
          "public/rss.xml",
        ),
      );
    }
  }

  return issues;
}

/** Block glossary/internal cron artifacts from entering promotion workflow. */
export function scanNonPromotableQueueDrafts(
  docsRoot = resolveDocsRoot(),
): BriefingInfrastructureLockIssue[] {
  const issues: BriefingInfrastructureLockIssue[] = [];
  const queueDir = path.join(docsRoot, BRIEFING_QUEUE_DIR);

  for (const filename of listMarkdownFiles(queueDir)) {
    if (QUARANTINE_ALLOWLIST.has(filename.toLowerCase())) continue;
    if (!isNonPromotableBriefingDraft(filename)) continue;

    issues.push(
      issue(
        "QUEUE_NON_PROMOTABLE_ARTIFACT",
        `${filename} is an internal ops artifact and must never be promoted.`,
        "error",
        `${BRIEFING_QUEUE_DIR}/${filename}`,
      ),
    );
  }

  return issues;
}


export function evaluateBriefingInfrastructureLock(
  options: BriefingInfrastructureLockOptions = {},
): BriefingInfrastructureLockResult {
  const docsRoot = options.docsRoot ?? resolveDocsRoot();
  const issues: BriefingInfrastructureLockIssue[] = [];

  if (!fs.existsSync(path.join(docsRoot, "TAS.md"))) {
    issues.push(
      issue(
        "DOCS_ROOT_MISSING",
        `Governance docs root not found at ${docsRoot}`,
        "error",
        docsRoot,
      ),
    );
    return { ok: false, issues };
  }

  enforceBriefingQuarantine(docsRoot);
  issues.push(...scanNonPromotableQueueDrafts(docsRoot));

  if (options.strictPublishedLedger !== false) {
    issues.push(...scanPublishedLedgerExposure(docsRoot));
  }

  if (options.verifyRssIsolation !== false) {
    issues.push(...verifyRssCompilerIsolation(docsRoot));
  }

  const ok = !issues.some((entry) => entry.severity === "error");
  return { ok, issues };
}

export function assertBriefingInfrastructureLocked(
  options: BriefingInfrastructureLockOptions = {},
): void {
  const result = evaluateBriefingInfrastructureLock(options);
  for (const entry of result.issues) {
    const prefix = entry.severity === "error" ? "[INFRA LOCK ERROR]" : "[INFRA LOCK WARN]";
    console.log(`${prefix} ${entry.code}${entry.scope ? ` (${entry.scope})` : ""}: ${entry.message}`);
  }

  if (!result.ok) {
    throw new Error("Briefing infrastructure lock failed — resolve errors before promotion or data tests.");
  }
}

export function assertBriefingDataTestAcknowledged(): void {
  const ack = process.env.IRONFRAME_BRIEFING_DATA_TEST_ACK?.trim();
  if (ack === "1" || ack?.toLowerCase() === "true") return;
  throw new Error(
    "Data-test promotion blocked — set IRONFRAME_BRIEFING_DATA_TEST_ACK=1 after infrastructure lock passes.",
  );
}

export function assertBriefingDeployAcknowledged(): void {
  const ack = process.env.IRONFRAME_BRIEFING_DEPLOY_ACK?.trim();
  if (ack === "1" || ack?.toLowerCase() === "true") return;
  throw new Error(
    "Deploy blocked — set IRONFRAME_BRIEFING_DEPLOY_ACK=1 to sync brief.ironframegrc.com.",
  );
}

export function hasStagingPublishedBriefings(docsRoot = resolveDocsRoot()): boolean {
  const publishedDir = path.join(docsRoot, PUBLISHED_BRIEFINGS_DIR);
  return listMarkdownFiles(publishedDir).some((filename) => {
    const markdown = fs.readFileSync(path.join(publishedDir, filename), "utf8");
    return isStagingPublishedBriefing(markdown);
  });
}
