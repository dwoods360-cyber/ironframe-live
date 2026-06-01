#!/usr/bin/env node
/**
 * Ephemeral Postgres bootstrap for GitHub Actions (Ironframe CI + Sovereign Deploy).
 * Applies schema from prisma migrate diff + ironguard GUC (same as Playwright workflow).
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const host = process.env.CI_PG_HOST ?? "127.0.0.1";
const password = process.env.PGPASSWORD ?? "postgres_password";
const user = process.env.PGUSER ?? "postgres";
const database = process.env.PGDATABASE ?? "ironframe_test";

if (!process.env.DATABASE_URL?.trim()) {
  console.error("ci-bootstrap-postgres: DATABASE_URL is required");
  process.exit(1);
}

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: { ...process.env, PGPASSWORD: password }, ...opts });
}

for (let i = 1; i <= 30; i++) {
  try {
    execSync(`pg_isready -h ${host} -p 5432 -U ${user}`, { stdio: "pipe" });
    console.log("Postgres is ready.");
    break;
  } catch {
    if (i === 30) {
      console.error("Postgres did not become ready in time.");
      process.exit(1);
    }
    console.log(`Waiting for Postgres (${i}/30)...`);
    execSync("sleep 2", { stdio: "inherit", shell: true });
  }
}

run("npx prisma generate");

run(
  "npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script 2>prisma-diff.err > prisma-schema.sql",
  { shell: true },
);

if (!existsSync("prisma-schema.sql")) {
  console.error("ci-bootstrap-postgres: prisma-schema.sql was not created");
  process.exit(1);
}

const sedCmd =
  process.platform === "darwin"
    ? `sed -i '' 's/"governed_impact" BIGINT NOT NULL DEFAULT ((base_impact_cents \\* governance_impact_multiplier) \\/ 100),/"governed_impact" BIGINT NOT NULL GENERATED ALWAYS AS (((base_impact_cents * governance_impact_multiplier) \\/ 100)) STORED,/' prisma-schema.sql`
    : `sed -i 's/"governed_impact" BIGINT NOT NULL DEFAULT ((base_impact_cents \\* governance_impact_multiplier) \\/ 100),/"governed_impact" BIGINT NOT NULL GENERATED ALWAYS AS (((base_impact_cents * governance_impact_multiplier) \\/ 100)) STORED,/' prisma-schema.sql`;

run(sedCmd, { shell: true });

run(`psql -h ${host} -U ${user} -d ${database} -v ON_ERROR_STOP=1 -f prisma-schema.sql`, {
  shell: true,
});

run(
  `psql -h ${host} -U ${user} -d ${database} -v ON_ERROR_STOP=1 -f prisma/migrations/20260507200000_ironguard_session_tenant_guc/migration.sql`,
  { shell: true },
);

console.log("ci-bootstrap-postgres: schema applied.");
