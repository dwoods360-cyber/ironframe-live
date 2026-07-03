import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  loadAppDocumentFromFilesystem,
  resolveDocsMarkdownAbsolutePath,
} from "@/app/lib/server/loadAppDocumentForReader";

describe("loadAppDocumentForReader filesystem fallback", () => {
  const docsRoot = path.join(process.cwd(), "docs");

  it("resolves quickstart markdown from docs/user-manuals", () => {
    const absolute = resolveDocsMarkdownAbsolutePath("user-manuals/quickstart");
    expect(absolute).toBe(path.join(docsRoot, "user-manuals", "quickstart.md"));
    expect(fs.existsSync(absolute!)).toBe(true);
  });

  it("loads operator quickstart content when present on disk", () => {
    const record = loadAppDocumentFromFilesystem("user-manuals/quickstart");
    expect(record).not.toBeNull();
    expect(record?.slug).toBe("user-manuals/quickstart");
    expect(record?.content).toContain("Command Post Dashboard");
    expect(record?.source).toBe("filesystem");
  });

  it("resolves training index slugs case-insensitively", () => {
    const absolute = resolveDocsMarkdownAbsolutePath("training/level1-student-index");
    expect(absolute?.toLowerCase()).toContain("level1-student-index.md");
    expect(fs.existsSync(absolute!)).toBe(true);
  });
});
