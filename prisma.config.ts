import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

/**
 * Load env the same way as local Next/Vitest workflows: `.env` then `.env.local` (override).
 * Prisma CLI reads this file before resolving `env("…")` below.
 */
const root = process.cwd();
loadEnv({ path: resolve(root, ".env") });
loadEnv({ path: resolve(root, ".env.local"), override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
    ...(process.env.DIRECT_URL?.trim()
      ? { directUrl: env("DIRECT_URL") }
      : {}),
  },
});
