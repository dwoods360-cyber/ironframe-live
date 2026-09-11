import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(absolute));
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) files.push(absolute);
  }
  return files;
}

describe("WORM storage privilege boundary", () => {
  it("allows the privileged storage client only inside the immutable storage module", () => {
    const repository = process.cwd();
    const imports = ["app", "lib", "src"]
      .flatMap((directory) => sourceFiles(path.join(repository, directory)))
      .filter((file) => fs.readFileSync(file, "utf8").includes("@/lib/supabase/wormStorageAdmin"))
      .map((file) => path.relative(repository, file).replace(/\\/g, "/"));

    expect(imports).toEqual(["app/lib/evidence/supabaseWormStorage.ts"]);
  });
});
