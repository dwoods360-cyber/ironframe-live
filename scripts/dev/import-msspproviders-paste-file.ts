/**
 * Import a collector .paste.txt / CSV into Ironleads prospect-pool.
 * Usage:
 *   npx tsx --env-file=.env.local scripts/dev/import-msspproviders-paste-file.ts scripts/dev/out/msspproviders-websites.paste.txt
 *   npx tsx --env-file=.env.local scripts/dev/import-msspproviders-paste-file.ts scripts/dev/out/clutch-cybersecurity.paste.txt --source=clutch_public
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  importMsspDirectoryAccounts,
  parseDirectoryImportPaste,
} from "../../app/lib/server/ironleadsMsspDirectoryImportCore";

function arg(name: string, fallback: string | null = null): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  return fallback;
}

async function main() {
  const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const file = resolve(
    positional[0] ||
      arg("file") ||
      "scripts/dev/out/msspproviders-websites.paste.txt",
  );
  const directorySource =
    arg("source", "msspproviders_public") || "msspproviders_public";
  const raw = readFileSync(file, "utf8");
  // Strip CSV header if present
  const paste = raw.replace(/^company,website\s*\r?\n/i, "");
  const all = parseDirectoryImportPaste(paste);
  console.log(JSON.stringify({ file, parsed: all.length, directorySource }, null, 2));

  const chunkSize = 100;
  let created = 0;
  let deduped = 0;
  let skipped = 0;
  let parkedPending = 0;
  let keptActive = 0;

  for (let i = 0; i < all.length; i += chunkSize) {
    const chunk = all.slice(i, i + chunkSize);
    const result = await importMsspDirectoryAccounts(
      chunk.map((row) => ({
        ...row,
        directorySource: directorySource as
          | "clutch_public"
          | "msspproviders_public"
          | "google_public"
          | "manual_paste",
        notes: `${directorySource} collector import`,
      })),
    );
    created += result.created;
    deduped += result.deduped;
    skipped += result.skipped;
    parkedPending += result.parkedPending;
    keptActive += result.keptActive;
    console.log(
      JSON.stringify(
        {
          batch: `${i + 1}-${i + chunk.length}`,
          created: result.created,
          deduped: result.deduped,
          skipped: result.skipped,
          parkedPending: result.parkedPending,
          keptActive: result.keptActive,
        },
        null,
        2,
      ),
    );
  }

  console.log(
    JSON.stringify(
      { done: true, created, deduped, skipped, parkedPending, keptActive, total: all.length },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
