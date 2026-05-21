import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";

import { assessTasMdIntegritySync, getTasMdAbsolutePath } from "@/app/lib/tasMdIntegrity";

describe("assessTasMdIntegritySync", () => {
  const path = getTasMdAbsolutePath();
  let hadBackup = false;
  let backup = "";

  afterEach(() => {
    if (hadBackup) {
      writeFileSync(path, backup, "utf8");
    }
  });

  it("returns ok with 64-char sha256 when TAS.md is present and non-empty", () => {
    const result = assessTasMdIntegritySync();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("returns EMPTY when TAS.md exists but has zero bytes", () => {
    if (!existsSync(path)) {
      mkdirSync(join(process.cwd(), "docs"), { recursive: true });
    }
    backup = existsSync(path) ? readFileSync(path, "utf8") : "# stub\n";
    hadBackup = true;
    writeFileSync(path, "", "utf8");
    const result = assessTasMdIntegritySync();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("EMPTY");
    }
  });
});
