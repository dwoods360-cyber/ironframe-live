import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Vitest is often invoked as `npx vitest run` (skips npm `pretest`). Ensure the
 * Prisma client exists before any suite imports `@prisma/client` or `lib/prisma`.
 */
export default function globalSetup(): void {
  const clientIndex = join(process.cwd(), "node_modules", ".prisma", "client", "index.js");
  if (existsSync(clientIndex)) return;
  execSync("npx prisma generate", { stdio: "inherit", env: process.env });
}
