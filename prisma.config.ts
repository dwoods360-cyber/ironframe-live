import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

/**
 * Load env the same way as local Next/Vitest workflows: `.env` then `.env.local` (override).
 * Prisma CLI reads this file before resolving `env("…")` below.
 */
const root = process.cwd();
const CI_PLACEHOLDER_DATABASE_URL =
  "postgresql://postgres:postgres_password@127.0.0.1:5432/ironframe_test";

// CI / Docker image build: no committed .env — use placeholder for `prisma generate` only.
const useBuildPlaceholder =
  process.env.GITHUB_ACTIONS === "true" || process.env.NEXT_BUILD_PHASE === "true";

if (useBuildPlaceholder) {
  if (!process.env.DATABASE_URL?.trim()) {
    process.env.DATABASE_URL = CI_PLACEHOLDER_DATABASE_URL;
  }
  if (!process.env.DIRECT_URL?.trim()) {
    process.env.DIRECT_URL = process.env.DATABASE_URL;
  }
} else {
  loadEnv({ path: resolve(root, ".env") });
  loadEnv({ path: resolve(root, ".env.local"), override: true });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx ts-node --project prisma/tsconfig.seed.json prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
    ...(process.env.DIRECT_URL?.trim()
      ? { directUrl: env("DIRECT_URL") }
      : {}),
  },
});
