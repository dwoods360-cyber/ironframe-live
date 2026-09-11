import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public environment build guard", () => {
  it("runs before every production build and checks Supabase public variables", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    const guard = readFileSync("scripts/check-public-env-secrets.mjs", "utf8");

    expect(packageJson.scripts.prebuild).toMatch(/^npm run check:public-env/);
    expect(packageJson.scripts["check:public-env"]).toBe(
      "node scripts/check-public-env-secrets.mjs",
    );
    expect(guard).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(guard).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(guard).toContain("sb_secret_");
    expect(guard).toContain('role === "service_role"');
    expect(guard).toContain("not a recognized Supabase publishable/anon key");
  });
});
