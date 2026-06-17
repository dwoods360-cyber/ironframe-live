import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const IRONBOARD_ROOT = path.resolve(MODULE_DIR, "../..");

/** Monorepo `docs/` root — shared with IronBoard federation. */
export function resolveDocsRoot(): string {
  const candidates = [
    path.resolve(IRONBOARD_ROOT, "../docs"),
    path.resolve(process.cwd(), "docs"),
    path.resolve(process.cwd(), "../docs"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "TAS.md"))) return dir;
  }
  return candidates[0];
}
