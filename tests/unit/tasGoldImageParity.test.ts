import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();

function sha256Hex(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("constitutional gold image parity", () => {
  it("docs/TAS.md SHA-256 matches storage/constitutional/TAS.md.gold", () => {
    const live = join(REPO_ROOT, "docs", "TAS.md");
    const gold = join(REPO_ROOT, "storage", "constitutional", "TAS.md.gold");
    expect(sha256Hex(live)).toBe(sha256Hex(gold));
  });
});
