import "server-only";

import fs from "fs";
import path from "path";

import {
  assertBriefingDataTestAcknowledged,
  assertBriefingInfrastructureLocked,
} from "@/app/lib/governanceFrame/briefingInfrastructureLock";
import {
  isNonPromotableBriefingDraft,
  parseBriefingDraftFrontmatter,
  validateBriefingQueueDraft,
  type BriefingDraftValidationIssue,
} from "@/app/lib/governanceFrame/briefingDraftValidation";
import {
  BRIEFING_QUEUE_DIR,
  resolveDocsRoot,
} from "@/app/lib/governanceFrame/briefingFilesystemLedger";
import {
  cleanBodyForPublication,
  extractQueueMetadata,
  mirrorPublishedBriefingToFilesystem,
  removePublishedFilesystemMirror,
  syndicatePublishedBriefing,
} from "@/app/lib/governanceFrame/publishBriefingSyndication";
import prisma from "@/lib/prisma";

const TENANT_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PromoteBriefingDraftInput = {
  filename: string;
  slug: string;
  operator: string;
  skipSyndication?: boolean;
  skipInfraLock?: boolean;
};

export type PromoteBriefingDraftResult =
  | {
      ok: true;
      publishedBriefingId: string;
      slug: string;
      mirrorPath?: string;
      rssPath?: string;
      newsletterHtmlPath?: string | null;
    }
  | {
      ok: false;
      error: string;
      issues?: BriefingDraftValidationIssue[];
    };

export async function promoteBriefingDraftCore(
  input: PromoteBriefingDraftInput,
): Promise<PromoteBriefingDraftResult> {
  const file = input.filename.trim();
  const slug = input.slug.trim().toLowerCase();
  const operator = input.operator.trim() || "operations-hub";

  if (!file || !slug) {
    return { ok: false, error: "filename and slug are required." };
  }

  if (slug.includes("..") || slug.includes("/") || !/^[a-z0-9-]+$/.test(slug)) {
    return { ok: false, error: "Invalid slug — use lowercase letters, digits, and hyphens only." };
  }

  const docsRoot = resolveDocsRoot();

  if (!input.skipInfraLock) {
    try {
      assertBriefingInfrastructureLocked({ docsRoot });
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Briefing infrastructure lock failed.",
      };
    }
  }

  try {
    assertBriefingDataTestAcknowledged();
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Briefing data-test acknowledgement required.",
    };
  }

  const queuePath = path.join(docsRoot, BRIEFING_QUEUE_DIR, file);
  if (!fs.existsSync(queuePath)) {
    return { ok: false, error: `Queue draft not found: ${file}` };
  }

  if (isNonPromotableBriefingDraft(file)) {
    return { ok: false, error: `${file} is not a promotable Governance Frame briefing.` };
  }

  const markdown = fs.readFileSync(queuePath, "utf-8");
  const validation = validateBriefingQueueDraft(file, markdown, { promotion: true });
  if (!validation.ok) {
    return {
      ok: false,
      error: "Promotion blocked — fix validation errors.",
      issues: validation.issues,
    };
  }

  const parsedFrontmatter = parseBriefingDraftFrontmatter(markdown, slug);
  if (!parsedFrontmatter) {
    return { ok: false, error: "Promotion blocked — frontmatter must include tenantId." };
  }

  const validatedTenantUuid = parsedFrontmatter.tenantId.trim();
  if (!TENANT_UUID_PATTERN.test(validatedTenantUuid)) {
    return { ok: false, error: "Promotion blocked — tenantId must be a valid UUID." };
  }

  const existing = await prisma.publishedBriefing.findUnique({ where: { slug } });
  if (existing) {
    return { ok: false, error: `Published slug already exists: ${slug}` };
  }

  const cleanMarkdownBody = cleanBodyForPublication(markdown);
  const publishedAtIso = new Date().toISOString();
  const queueMeta = extractQueueMetadata(markdown);

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

  if (input.skipSyndication) {
    return { ok: true, publishedBriefingId: record.id, slug };
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
    const syndication = syndicatePublishedBriefing(slug, docsRoot);
    return {
      ok: true,
      publishedBriefingId: record.id,
      slug,
      mirrorPath,
      rssPath: syndication.rssPath,
      newsletterHtmlPath: syndication.newsletterHtmlPath ?? null,
    };
  } catch (err) {
    removePublishedFilesystemMirror(slug, docsRoot);
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Syndication failed (DB record retained): ${err.message}`
          : "Syndication failed (DB record retained).",
    };
  }
}
