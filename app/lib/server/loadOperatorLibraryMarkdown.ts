import "server-only";

import { readFile } from "fs/promises";
import path from "path";

import { resolveMarkdownLibraryEntry } from "@/app/lib/operations/operatorLibraryCatalog";

export async function loadOperatorLibraryMarkdown(slug: string): Promise<{
  title: string;
  summary: string;
  markdown: string;
  file: string;
} | null> {
  const entry = resolveMarkdownLibraryEntry(slug);
  if (!entry) return null;

  // Prevent path escape — only basename under an allowed docs root.
  const base = path.basename(entry.file);
  if (base !== entry.file || !base.endsWith(".md")) return null;
  const root = entry.docsRoot === "qa" ? "qa" : "sales";

  const fullPath = path.join(process.cwd(), "docs", root, base);
  try {
    const markdown = await readFile(fullPath, "utf8");
    return {
      title: entry.title,
      summary: entry.summary,
      markdown,
      file: `docs/${root}/${base}`,
    };
  } catch {
    return null;
  }
}
