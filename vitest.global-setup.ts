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

type PerimeterSqliteBootstrap = {
  packageDir: string;
  dbFileName: string;
  envVar: string;
};

/**
 * Perimeter workers use local SQLite scratchpads. Skip `db:generate` when a client
 * already exists — Windows often EPERMs renaming the query engine DLL while locked.
 */
function ensurePerimeterSqliteSchema(opts: PerimeterSqliteBootstrap): void {
  const packageRoot = join(process.cwd(), opts.packageDir);
  const schema = join(packageRoot, "prisma", "schema.prisma");
  if (!existsSync(schema)) return;

  const dataDir = join(packageRoot, "data");
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const dbPath = join(dataDir, opts.dbFileName).replace(/\\/g, "/");
  if (!process.env[opts.envVar]?.trim()) {
    process.env[opts.envVar] = `file:${dbPath}`;
  }

  const clientIndex = join(packageRoot, "generated", "client", "index.js");
  if (!existsSync(clientIndex)) {
    execSync("npm run db:generate", { cwd: packageRoot, stdio: "inherit", env: process.env });
  }
  execSync("npx prisma db push --schema prisma/schema.prisma --skip-generate", {
    cwd: packageRoot,
    stdio: "inherit",
    env: process.env,
  });
}

export default function globalSetup(): void {
  ensureRootPrismaClient();
  ensurePerimeterSqliteSchema({
    packageDir: "Ironleads",
    dbFileName: "ironleads.db",
    envVar: "IRONLEADS_DATABASE_URL",
  });
  ensurePerimeterSqliteSchema({
    packageDir: "SalesTeam",
    dbFileName: "salesteam.db",
    envVar: "SALESTEAM_DATABASE_URL",
  });
  ensurePerimeterSqliteSchema({
    packageDir: "SuccessTeam",
    dbFileName: "successteam.db",
    envVar: "SUCCESS_TEAM_DATABASE_URL",
  });
  ensurePerimeterSqliteSchema({
    packageDir: "SupportTeam",
    dbFileName: "supportteam.db",
    envVar: "SUPPORT_TEAM_DATABASE_URL",
  });
}
