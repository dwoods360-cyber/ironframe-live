import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

/**
 * Academic Fellowship Prisma config — isolated from primary Path B migrations.
 * Uses FELLOWS_DATABASE_URL (must target schema academic_fellows and preferably a dedicated role).
 */
const root = process.cwd();
const CI_PLACEHOLDER_FELLOWS_DATABASE_URL =
  "postgresql://postgres:postgres_password@127.0.0.1:5432/ironframe_fellows_test?schema=academic_fellows";

const useBuildPlaceholder =
  process.env.GITHUB_ACTIONS === "true" || process.env.NEXT_BUILD_PHASE === "true";

if (useBuildPlaceholder) {
  if (!process.env.FELLOWS_DATABASE_URL?.trim()) {
    process.env.FELLOWS_DATABASE_URL = CI_PLACEHOLDER_FELLOWS_DATABASE_URL;
  }
  if (!process.env.FELLOWS_DIRECT_URL?.trim()) {
    process.env.FELLOWS_DIRECT_URL = process.env.FELLOWS_DATABASE_URL;
  }
} else {
  loadEnv({ path: resolve(root, ".env") });
  loadEnv({ path: resolve(root, ".env.local"), override: true });
}

if (!process.env.FELLOWS_DIRECT_URL?.trim() && process.env.FELLOWS_DATABASE_URL?.trim()) {
  process.env.FELLOWS_DIRECT_URL = process.env.FELLOWS_DATABASE_URL;
}

export default defineConfig({
  schema: "prisma/fellows/schema.prisma",
  migrations: {
    path: "prisma/fellows/migrations",
  },
  datasource: {
    url: env("FELLOWS_DATABASE_URL"),
    ...(process.env.FELLOWS_DIRECT_URL?.trim()
      ? { directUrl: env("FELLOWS_DIRECT_URL") }
      : {}),
  },
});
