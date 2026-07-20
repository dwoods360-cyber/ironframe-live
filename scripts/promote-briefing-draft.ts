#!/usr/bin/env npx tsx
/**
 * Human promotion gate: briefing-queue → published_briefings (PostgreSQL)
 * → filesystem mirror → RSS + Ironcast newsletter syndication.
 *
 * Usage:
 *   npx tsx scripts/promote-briefing-draft.ts --file 2026-06-17-draft-medshield.md --slug 2026-06-17-medshield-review
 *   npx tsx scripts/promote-briefing-draft.ts --file draft.md --slug my-briefing --operator "j.doe@corp.example"
 *   npx tsx scripts/promote-briefing-draft.ts --file draft.md --slug my-briefing --skip-syndication
 *   npx tsx scripts/promote-briefing-draft.ts --file draft.md --slug my-briefing --deploy
 *   IRONFRAME_BRIEFING_DATA_TEST_ACK=1 npx tsx scripts/promote-briefing-draft.ts --file draft.md --slug my-briefing
 */
import fs from "fs";
import path from "path";
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

import {
  assertBriefingDataTestAcknowledged,
  assertBriefingDeployAcknowledged,
  assertBriefingInfrastructureLocked,
  hasStagingPublishedBriefings,
} from "../app/lib/governanceFrame/briefingInfrastructureLock";
import {
  isNonPromotableBriefingDraft,
  parseBriefingDraftFrontmatter,
  validateBriefingQueueDraft,
} from "../app/lib/governanceFrame/briefingDraftValidation";
import {
  cleanBodyForPublication,
  extractQueueMetadata,
  mirrorPublishedBriefingToFilesystem,
  removePublishedFilesystemMirror,
  syndicatePublishedBriefing,
} from "../app/lib/governanceFrame/publishBriefingSyndication";
import { resolveDocsRoot } from "../app/lib/governanceFrame/briefingFilesystemLedger";

const BRIEFING_QUEUE_DIR = "briefing-queue";
const TENANT_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = "true";
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const file = args.file?.trim();
  const slug = args.slug?.trim().toLowerCase();
  const operator = args.operator?.trim() || process.env.USER || process.env.USERNAME || "unknown-operator";
  const skipSyndication = args["skip-syndication"] === "true";
  const deployBrief = args.deploy === "true";
  const skipInfraLock = args["skip-infra-lock"] === "true";

  if (!file || !slug) {
    console.error(
      "Usage: --file <queue-filename.md> --slug <published-slug> [--operator name] [--skip-syndication] [--skip-infra-lock] [--deploy]",
    );
    process.exit(1);
  }

  if (slug.includes("..") || slug.includes("/") || !/^[a-z0-9-]+$/.test(slug)) {
    console.error("Invalid slug — use lowercase letters, digits, and hyphens only.");
    process.exit(1);
  }

  const docsRoot = resolveDocsRoot();

  if (!skipInfraLock) {
    assertBriefingInfrastructureLocked({ docsRoot });
    console.log("[INFRA LOCK] Perimeter checks passed.");
  } else {
    console.log("[INFRA LOCK] Skipped (--skip-infra-lock).");
  }

  assertBriefingDataTestAcknowledged();

  const queuePath = path.join(docsRoot, BRIEFING_QUEUE_DIR, file);

  if (!fs.existsSync(queuePath)) {
    console.error(`Queue draft not found: ${queuePath}`);
    process.exit(1);
  }

  if (isNonPromotableBriefingDraft(file)) {
    console.error(
      `Promotion blocked — ${file} is an internal glossary artifact, not a Governance Frame briefing.`,
    );
    process.exit(1);
  }

  const markdown = fs.readFileSync(queuePath, "utf-8");
  const validation = validateBriefingQueueDraft(file, markdown, { promotion: true });

  for (const issue of validation.issues) {
    const prefix = issue.severity === "error" ? "ERROR" : "WARN";
    console.log(`[${prefix}] ${issue.code}: ${issue.message}`);
  }

  if (!validation.ok) {
    console.error("Promotion blocked — fix errors and re-run.");
    process.exit(1);
  }

  const parsedFrontmatter = parseBriefingDraftFrontmatter(markdown, slug);
  if (!parsedFrontmatter) {
    console.error("Promotion blocked — frontmatter must include tenantId.");
    process.exit(1);
  }

  const validatedTenantUuid = parsedFrontmatter.tenantId.trim();
  if (!TENANT_UUID_PATTERN.test(validatedTenantUuid)) {
    console.error("Promotion blocked — tenantId must be a valid UUID.");
    process.exit(1);
  }

  const cleanMarkdownBody = cleanBodyForPublication(markdown);
  const publishedAtIso = new Date().toISOString();
  const queueMeta = extractQueueMetadata(markdown);
  const prisma = new PrismaClient();
  let recordId: string | null = null;

  try {
    const existing = await prisma.publishedBriefing.findUnique({ where: { slug } });
    if (existing) {
      console.error(`Published slug already exists in database: ${slug}`);
      process.exit(1);
    }

    const record = await prisma.publishedBriefing.create({
      data: {
        tenantId: validatedTenantUuid,
        slug,
        title: parsedFrontmatter.title,
        content: cleanMarkdownBody,
        exposureCents: parsedFrontmatter.activeExposureCents,
        doraScore: parsedFrontmatter.doraScore,
        publishedBy: operator,
      },
    });
    recordId = record.id;

    const auditLine = JSON.stringify({
      event: "BRIEFING_PROMOTED",
      at: publishedAtIso,
      operator,
      sourceQueueFile: file,
      publishedSlug: slug,
      publishedBriefingId: record.id,
      tenantId: validatedTenantUuid,
    });
    console.log(`[AUDIT] ${auditLine}`);
    console.log("[PROMOTE] PostgreSQL receipt stamped.");

    if (skipSyndication) {
      console.log("[SYNDICATE] Skipped (--skip-syndication). Mirror RSS and newsletter manually.");
      try {
        fs.unlinkSync(queuePath);
        console.log(`[QUEUE] Removed ${file} after promote.`);
      } catch {
        console.log(`[QUEUE] Could not remove ${file} — delete manually if still listed.`);
      }
      return;
    }

    try {
      const mirrorPath = mirrorPublishedBriefingToFilesystem(
        {
          slug,
          title: parsedFrontmatter.title,
          bodyMarkdown: cleanMarkdownBody,
          publishedAtIso,
          operator,
          queueMarkdown: markdown,
          classification: queueMeta.classification,
          summary: queueMeta.summary,
        },
        docsRoot,
      );
      console.log(`[SYNDICATE] Filesystem mirror: ${mirrorPath}`);

      const syndication = syndicatePublishedBriefing(slug, docsRoot);
      console.log(`[SYNDICATE] RSS feed (${syndication.rssItemCount} items): ${syndication.rssPath}`);
      if (syndication.newsletterHtmlPath) {
        console.log(`[SYNDICATE] Ironcast newsletter HTML: ${syndication.newsletterHtmlPath}`);
      }

      if (deployBrief) {
        assertBriefingDeployAcknowledged();
        if (hasStagingPublishedBriefings(docsRoot)) {
          console.error(
            "[DEPLOY] Blocked — published-briefings contains INTERNAL STAGING classification. Remove or reclassify before deploy.",
          );
          process.exit(1);
        }
        console.log("[DEPLOY] Running npm run sync:brief:gcs ...");
        execSync("npm run sync:brief:gcs", { stdio: "inherit", cwd: process.cwd() });
        console.log("[DEPLOY] brief.ironframegrc.com static sync complete.");
      } else {
        console.log("[DEPLOY] Skipped (pass --deploy to run sync:brief:gcs).");
      }

      try {
        fs.unlinkSync(queuePath);
        console.log(`[QUEUE] Removed ${file} after promote.`);
      } catch {
        console.log(`[QUEUE] Could not remove ${file} — delete manually if still listed.`);
      }

      console.log("[COMPLETE] Promotion + syndication finished.");
    } catch (syndicationError) {
      removePublishedFilesystemMirror(slug, docsRoot);
      console.error(
        "[ROLLBACK] Filesystem mirror removed after syndication failure. PostgreSQL receipt remains — delete manually if needed.",
      );
      throw syndicationError;
    }
  } finally {
    await prisma.$disconnect();
  }

  if (!recordId) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Promotion failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
