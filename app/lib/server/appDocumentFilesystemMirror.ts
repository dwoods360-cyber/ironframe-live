import "server-only";

import fs from "node:fs";
import path from "node:path";

import { isGovernanceBriefingDocSlug } from "@/lib/documentationCorpusPlanes";
import { normalizeAppDocumentSlug } from "@/lib/appDocumentSlug";

const DOCS_ROOT = path.join(process.cwd(), "docs");

/**
 * Mirror APP_DOCS training/user-manuals/technical slugs to docs/ on disk for git tracking.
 */
export function mirrorAppDocumentToFilesystem(slugInput: string, content: string): string | null {
  const slug = normalizeAppDocumentSlug(slugInput);
  const segments = slug.split("/");

  if (isGovernanceBriefingDocSlug(segments)) {
    return null;
  }

  const allowed =
    slug === "readme" ||
    slug.startsWith("training/") ||
    slug.startsWith("user-manuals/") ||
    slug.startsWith("technical/");

  if (!allowed) {
    return null;
  }

  const relativePath = slug === "readme" ? "README.md" : `${slug}.md`;
  const absolutePath = path.join(DOCS_ROOT, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
  return relativePath;
}
