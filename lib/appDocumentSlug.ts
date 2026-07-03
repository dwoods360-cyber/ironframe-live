import { isGovernanceBriefingDocSlug } from "@/lib/documentationCorpusPlanes";

export const APP_DOCUMENT_READING_LEVELS = ["LEVEL_1", "LEVEL_2", "TRAINING"] as const;
export type AppDocumentReadingLevel = (typeof APP_DOCUMENT_READING_LEVELS)[number];

export function normalizeAppDocumentSlug(slugInput: string): string {
  const trimmed = slugInput.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/\.md$/i, "");
  if (!trimmed || trimmed.toLowerCase() === "readme") return "readme";
  return trimmed.toLowerCase();
}

export function slugSegmentsToDbKey(slugSegments: string[]): string {
  if (slugSegments.length === 0) return "readme";
  const joined = slugSegments.join("/");
  if (joined.toUpperCase() === "README") return "readme";
  return normalizeAppDocumentSlug(joined);
}

export function dbKeyToSlugSegments(dbKey: string): string[] {
  if (dbKey === "readme") return ["README"];
  return dbKey.split("/");
}

export function inferReadingLevelFromSlug(slug: string): AppDocumentReadingLevel {
  const normalized = normalizeAppDocumentSlug(slug);
  if (normalized.startsWith("training/")) return "TRAINING";
  if (normalized.startsWith("technical/")) return "LEVEL_2";
  if (
    normalized.startsWith("user-manuals/") ||
    normalized.startsWith("end-users/") ||
    normalized === "readme"
  ) {
    return "LEVEL_1";
  }
  return "LEVEL_2";
}

export function inferTitleFromMarkdown(content: string, slug: string): string {
  const h1 = content.match(/^#\s+(.+)$/m);
  if (h1?.[1]?.trim()) return h1[1].trim();
  const leaf = slug.split("/").pop() ?? slug;
  return leaf.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function assertAppDocsSlugAllowed(slug: string): void {
  const segments = slug.split("/");
  if (isGovernanceBriefingDocSlug(segments)) {
    throw new Error(`Governance briefing slugs are forbidden on APP_DOCS plane: ${slug}`);
  }
}
