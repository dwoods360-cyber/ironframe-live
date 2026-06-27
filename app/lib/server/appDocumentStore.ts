import "server-only";

import prisma from "@/lib/prisma";
import { sanitizeAppDocumentContent } from "@/lib/appDocumentSanitizer";
import {
  assertAppDocsSlugAllowed,
  inferTitleFromMarkdown,
  normalizeAppDocumentSlug,
  type AppDocumentReadingLevel,
} from "@/lib/appDocumentSlug";

export type { AppDocumentReadingLevel } from "@/lib/appDocumentSlug";
export { dbKeyToSlugSegments, slugSegmentsToDbKey } from "@/lib/appDocumentSlug";

export type AppDocumentRecord = {
  id: string;
  slug: string;
  title: string;
  content: string;
  readingLevel: AppDocumentReadingLevel;
  updatedAt: Date;
};

export async function upsertAppDocument(input: {
  slug: string;
  title: string;
  content: string;
  readingLevel: AppDocumentReadingLevel;
}): Promise<AppDocumentRecord> {
  const slug = normalizeAppDocumentSlug(input.slug);
  assertAppDocsSlugAllowed(slug);

  const sanitizedContent = sanitizeAppDocumentContent(input.content);
  const title = input.title.trim() || inferTitleFromMarkdown(sanitizedContent, slug);

  const row = await prisma.appDocument.upsert({
    where: { slug },
    update: {
      title,
      content: sanitizedContent,
      readingLevel: input.readingLevel,
    },
    create: {
      slug,
      title,
      content: sanitizedContent,
      readingLevel: input.readingLevel,
    },
  });

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    content: row.content,
    readingLevel: row.readingLevel as AppDocumentReadingLevel,
    updatedAt: row.updatedAt,
  };
}

export async function findAppDocumentBySlug(slugInput: string): Promise<AppDocumentRecord | null> {
  const slug = normalizeAppDocumentSlug(slugInput);
  const row = await prisma.appDocument.findUnique({ where: { slug } });
  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    content: sanitizeAppDocumentContent(row.content),
    readingLevel: row.readingLevel as AppDocumentReadingLevel,
    updatedAt: row.updatedAt,
  };
}

export async function listAppDocumentSlugs(): Promise<string[]> {
  const rows = await prisma.appDocument.findMany({
    select: { slug: true },
    orderBy: { slug: "asc" },
  });
  return rows.map((row) => row.slug);
}
