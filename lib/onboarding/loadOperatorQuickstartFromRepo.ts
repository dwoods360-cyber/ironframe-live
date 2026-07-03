import fs from "node:fs";
import path from "node:path";

/** Resolve canonical Bucket B operator orientation markdown on disk. */
export function resolveOperatorQuickstartMarkdownPath(): string {
  const candidates = [
    path.join(process.cwd(), "docs", "user-manuals", "quickstart.md"),
    path.join(process.cwd(), "..", "docs", "user-manuals", "quickstart.md"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error("operator quickstart markdown not found (docs/user-manuals/quickstart.md)");
}

export function loadOperatorQuickstartMarkdown(): string {
  return fs.readFileSync(resolveOperatorQuickstartMarkdownPath(), "utf8").trim();
}
