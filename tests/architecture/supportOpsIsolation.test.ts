import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { FORBIDDEN_TENANT_SUPPORT_FETCH_PREFIXES } from "@/app/lib/support/supportApiBoundary";

const REPO_ROOT = join(__dirname, "..", "..");

const FORBIDDEN_URL_LITERALS = [...FORBIDDEN_TENANT_SUPPORT_FETCH_PREFIXES, "operations-hub"] as const;

const CLIENT_SUPPORT_ROOTS = [
  join(REPO_ROOT, "app", "api", "support"),
  join(REPO_ROOT, "app", "components", "support"),
  join(REPO_ROOT, "app", "(dashboard)", "dashboard", "support"),
] as const;

const SERVER_SUPPORT_CORES = [
  join(REPO_ROOT, "app", "lib", "server", "supportPortalCore.ts"),
  join(REPO_ROOT, "app", "lib", "server", "customerServiceConsoleCore.ts"),
] as const;

function collectFiles(entryPath: string): string[] {
  const stat = statSync(entryPath);
  if (stat.isFile()) return [entryPath];
  if (!stat.isDirectory()) return [];

  const files: string[] = [];
  for (const name of readdirSync(entryPath)) {
    files.push(...collectFiles(join(entryPath, name)));
  }
  return files;
}

describe("support vs ops isolation", () => {
  it("tenant support UI and APIs do not reference worker ops endpoints", () => {
    const offenders: string[] = [];

    for (const root of CLIENT_SUPPORT_ROOTS) {
      for (const filePath of collectFiles(root)) {
        if (!/\.(ts|tsx)$/.test(filePath)) continue;
        const content = readFileSync(filePath, "utf8");
        for (const literal of FORBIDDEN_URL_LITERALS) {
          if (content.includes(literal)) {
            offenders.push(`${relative(REPO_ROOT, filePath)} → ${literal}`);
          }
        }
        if (content.includes("IronSupportTeam") || content.includes(":8086")) {
          offenders.push(`${relative(REPO_ROOT, filePath)} → worker branding`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("support server cores do not call operations-hub or ingress worker routes", () => {
    const offenders: string[] = [];

    for (const filePath of SERVER_SUPPORT_CORES) {
      const content = readFileSync(filePath, "utf8");
      for (const literal of FORBIDDEN_URL_LITERALS) {
        if (content.includes(literal)) {
          offenders.push(`${relative(REPO_ROOT, filePath)} → ${literal}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
