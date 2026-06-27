import "server-only";

import fs from "node:fs";
import path from "node:path";

import {
  inferReadingLevelFromSlug,
  inferTitleFromMarkdown,
  normalizeAppDocumentSlug,
  type AppDocumentReadingLevel,
} from "@/lib/appDocumentSlug";
import { sanitizeAppDocumentContent } from "@/lib/appDocumentSanitizer";
import { isGovernanceBriefingDocSlug } from "@/lib/documentationCorpusPlanes";
import prisma from "@/lib/prisma";

const DOCS_ROOT = path.join(process.cwd(), "docs");

export type AppDocumentReaderRecord = {
  slug: string;
  title: string;
  content: string;
  readingLevel: AppDocumentReadingLevel;
  source: "database" | "filesystem";
};

function isOperatorFilesystemDocSlug(slug: string): boolean {
  return (
    slug === "readme" ||
    slug.startsWith("user-manuals/") ||
    slug.startsWith("training/") ||
    slug.startsWith("end-users/")
  );
}

/** Resolve docs/{slug}.md with case-insensitive filename matching (training index files). */
export function resolveDocsMarkdownAbsolutePath(normalizedSlug: string): string | null {
  if (normalizedSlug === "readme") {
    const readme = path.join(DOCS_ROOT, "README.md");
    return fs.existsSync(readme) ? readme : null;
  }

  const direct = path.join(DOCS_ROOT, `${normalizedSlug}.md`);
  if (fs.existsSync(direct)) {
    return direct;
  }

  const parentDir = path.dirname(direct);
  const targetName = `${path.basename(normalizedSlug)}.md`.toLowerCase();
  if (!fs.existsSync(parentDir)) {
    return null;
  }

  for (const entry of fs.readdirSync(parentDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;
    if (entry.name.toLowerCase() === targetName) {
      return path.join(parentDir, entry.name);
    }
  }

  return null;
}

export function loadAppDocumentFromFilesystem(slugInput: string): AppDocumentReaderRecord | null {
  const slug = normalizeAppDocumentSlug(slugInput);
  if (!slug || isGovernanceBriefingDocSlug(slug.split("/"))) {
    return null;
  }
  if (!isOperatorFilesystemDocSlug(slug)) {
    return null;
  }

  const absolutePath = resolveDocsMarkdownAbsolutePath(slug);
  if (!absolutePath) {
    return null;
  }

  const raw = fs.readFileSync(absolutePath, "utf8");
  const content = sanitizeAppDocumentContent(raw);
  return {
    slug,
    title: inferTitleFromMarkdown(content, slug),
    content,
    readingLevel: inferReadingLevelFromSlug(slug),
    source: "filesystem",
  };
}

/** Database first; operator manuals fall back to docs/ markdown on disk when unseeded. */
export async function loadAppDocumentForReader(
  slugInput: string,
): Promise<AppDocumentReaderRecord | null> {
  const slug = normalizeAppDocumentSlug(slugInput);
  if (!slug) {
    return null;
  }

  const docRecord = await prisma.appDocument.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      content: true,
      readingLevel: true,
    },
  });

  if (docRecord) {
    return {
      slug: docRecord.slug,
      title: docRecord.title,
      content: docRecord.content,
      readingLevel: docRecord.readingLevel as AppDocumentReadingLevel,
      source: "database",
    };
  }

  return loadAppDocumentFromFilesystem(slug);
}
