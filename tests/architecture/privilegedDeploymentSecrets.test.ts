import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const deployWorkflow = readFileSync(join(root, ".github", "workflows", "deploy.yml"), "utf8");
const bootstrap = readFileSync(
  join(root, "scripts", "gcp", "bootstrap-production-secrets.mjs"),
  "utf8",
);

describe("privileged deployment secret wiring", () => {
  for (const key of ["PRIVILEGED_DATABASE_URL", "SUPABASE_WORM_STORAGE_SECRET_KEY"]) {
    it(`wires ${key} into Cloud Run and production secret bootstrap`, () => {
      expect(deployWorkflow).toContain(`${key}=\${{ secrets.${key} }}`);
      expect(bootstrap).toContain(`"${key}"`);
    });
  }
});
