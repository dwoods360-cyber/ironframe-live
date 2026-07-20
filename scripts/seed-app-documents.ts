/**
 * Walk docs/user-manuals/, docs/technical/, and docs/training/ and upsert APP_DOCS rows.
 * Invoked by prisma/seed-docs.ts after canonical master documents.
 */
import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import {
  assertAppDocsSlugAllowed,
  inferReadingLevelFromSlug,
  inferTitleFromMarkdown,
  normalizeAppDocumentSlug,
} from "../lib/appDocumentSlug";
import { sanitizeAppDocumentContent } from "../lib/appDocumentSanitizer";
import { APP_DOCS_REPOSITORY_PREFIXES } from "../lib/documentationCorpusPlanes";

const prisma = new PrismaClient();
const DOCS_ROOT = path.join(process.cwd(), "docs");

/** Author/ops artifacts under user-manuals/ that must not enter partner-facing AppDocument. */
const APP_DOCS_SEED_EXCLUDE = new Set([
  "user-manuals/get-started-orientation-audio-script.md",
  "user-manuals/get-started-welcome-audio-script.md",
  "user-manuals/platform-sync.md",
]);

function collectMarkdownFiles(absoluteDir: string, relativePrefix: string): string[] {
  if (!fs.existsSync(absoluteDir)) return [];

  const results: string[] = [];
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = `${relativePrefix}${entry.name}`.replace(/\\/g, "/");
    const absolutePath = path.join(absoluteDir, entry.name);

    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(absolutePath, `${relativePath}/`));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      if (APP_DOCS_SEED_EXCLUDE.has(relativePath)) continue;
      results.push(relativePath);
    }
  }

  return results;
}

async function main(): Promise<void> {
  const relativePaths: string[] = [];

  for (const prefix of APP_DOCS_REPOSITORY_PREFIXES) {
    const absolutePrefixDir = path.join(DOCS_ROOT, prefix);
    relativePaths.push(...collectMarkdownFiles(absolutePrefixDir, prefix));
  }

  const uniquePaths = [...new Set(relativePaths)].sort((a, b) => a.localeCompare(b));
  if (uniquePaths.length === 0) {
    console.warn("[seed-app-documents] No markdown files found under APP_DOCS prefixes.");
    return;
  }

  let upserted = 0;
  for (const relativePath of uniquePaths) {
    const slug = normalizeAppDocumentSlug(relativePath);
    assertAppDocsSlugAllowed(slug);

    const raw = fs.readFileSync(path.join(DOCS_ROOT, relativePath), "utf8");
    const content = sanitizeAppDocumentContent(raw);
    const title = inferTitleFromMarkdown(content, slug);
    const readingLevel = inferReadingLevelFromSlug(slug);

    await prisma.appDocument.upsert({
      where: { slug },
      update: {
        title,
        content,
        readingLevel,
        updatedAt: new Date(),
      },
      create: {
        slug,
        title,
        content,
        readingLevel,
      },
    });

    upserted += 1;
    console.log(`[seed-app-documents] upserted: ${slug}`);
  }

  let removed = 0;
  for (const relativePath of APP_DOCS_SEED_EXCLUDE) {
    const slug = normalizeAppDocumentSlug(relativePath);
    const result = await prisma.appDocument.deleteMany({ where: { slug } });
    removed += result.count;
    if (result.count > 0) {
      console.log(`[seed-app-documents] removed excluded slug: ${slug}`);
    }
  }

  console.log(
    `[seed-app-documents] Completed — ${upserted} slug(s) from docs/; removed ${removed} excluded.`,
  );
}

main()
  .catch((error) => {
    console.error("[seed-app-documents] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
