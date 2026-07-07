import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Vitest is often invoked as `npx vitest run` (skips npm `pretest`). Ensure the
 * Prisma client exists before any suite imports `@prisma/client` or `lib/prisma`.
 */
function ensureRootPrismaClient(): void {
  const clientIndex = join(process.cwd(), "node_modules", ".prisma", "client", "index.js");
  if (existsSync(clientIndex)) return;
  execSync("npx prisma generate", { stdio: "inherit", env: process.env });
}

/** Ironleads graph tests use a local SQLite scratchpad — bootstrap schema when absent. */
function ensureIronleadsSqliteSchema(): void {
  const ironleadsRoot = join(process.cwd(), "Ironleads");
  const ironleadsSchema = join(ironleadsRoot, "prisma", "schema.prisma");
  if (!existsSync(ironleadsSchema)) return;

  const dataDir = join(ironleadsRoot, "data");
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const dbPath = join(dataDir, "ironleads.db").replace(/\\/g, "/");
  if (!process.env.IRONLEADS_DATABASE_URL?.trim()) {
    process.env.IRONLEADS_DATABASE_URL = `file:${dbPath}`;
  }

  execSync("npm run db:generate", { cwd: ironleadsRoot, stdio: "inherit", env: process.env });
  execSync("npx prisma db push --schema prisma/schema.prisma --skip-generate", {
    cwd: ironleadsRoot,
    stdio: "inherit",
    env: process.env,
  });
}

/** SalesTeam poll worker scratchpad — bootstrap when package present. */
function ensureSalesTeamSqliteSchema(): void {
  const salesTeamRoot = join(process.cwd(), "SalesTeam");
  const salesTeamSchema = join(salesTeamRoot, "prisma", "schema.prisma");
  if (!existsSync(salesTeamSchema)) return;

  const dataDir = join(salesTeamRoot, "data");
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const dbPath = join(dataDir, "salesteam.db").replace(/\\/g, "/");
  if (!process.env.SALESTEAM_DATABASE_URL?.trim()) {
    process.env.SALESTEAM_DATABASE_URL = `file:${dbPath}`;
  }

  execSync("npm run db:generate", { cwd: salesTeamRoot, stdio: "inherit", env: process.env });
  execSync("npx prisma db push --schema prisma/schema.prisma --skip-generate", {
    cwd: salesTeamRoot,
    stdio: "inherit",
    env: process.env,
  });
}

function ensureSuccessTeamSqliteSchema(): void {
  const successTeamRoot = join(process.cwd(), "SuccessTeam");
  const successTeamSchema = join(successTeamRoot, "prisma", "schema.prisma");
  if (!existsSync(successTeamSchema)) return;

  const dataDir = join(successTeamRoot, "data");
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const dbPath = join(dataDir, "successteam.db").replace(/\\/g, "/");
  if (!process.env.SUCCESS_TEAM_DATABASE_URL?.trim()) {
    process.env.SUCCESS_TEAM_DATABASE_URL = `file:${dbPath}`;
  }

  execSync("npm run db:generate", { cwd: successTeamRoot, stdio: "inherit", env: process.env });
  execSync("npx prisma db push --schema prisma/schema.prisma --skip-generate", {
    cwd: successTeamRoot,
    stdio: "inherit",
    env: process.env,
  });
}

/** SupportTeam poll worker scratchpad — bootstrap when package present. */
function ensureSupportTeamSqliteSchema(): void {
  const supportTeamRoot = join(process.cwd(), "SupportTeam");
  const supportTeamSchema = join(supportTeamRoot, "prisma", "schema.prisma");
  if (!existsSync(supportTeamSchema)) return;

  const dataDir = join(supportTeamRoot, "data");
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const dbPath = join(dataDir, "supportteam.db").replace(/\\/g, "/");
  if (!process.env.SUPPORT_TEAM_DATABASE_URL?.trim()) {
    process.env.SUPPORT_TEAM_DATABASE_URL = `file:${dbPath}`;
  }

  execSync("npm run db:generate", { cwd: supportTeamRoot, stdio: "inherit", env: process.env });
  execSync("npx prisma db push --schema prisma/schema.prisma --skip-generate", {
    cwd: supportTeamRoot,
    stdio: "inherit",
    env: process.env,
  });
}

export default function globalSetup(): void {
  ensureRootPrismaClient();
  ensureIronleadsSqliteSchema();
  ensureSalesTeamSqliteSchema();
  ensureSuccessTeamSqliteSchema();
  ensureSupportTeamSqliteSchema();
}
