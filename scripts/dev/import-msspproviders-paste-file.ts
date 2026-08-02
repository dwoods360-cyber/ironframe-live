/**
 * Import a collector .paste.txt / CSV into Ironleads prospect-pool.
 * Usage:
 *   npx tsx --env-file=.env scripts/dev/import-msspproviders-paste-file.ts scripts/dev/out/msspproviders-websites.paste.txt
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  importMsspDirectoryAccounts,
  parseDirectoryImportPaste,
} from "../../app/lib/server/ironleadsMsspDirectoryImportCore";

async function main() {
  const file = resolve(process.argv[2] || "scripts/dev/out/msspproviders-websites.paste.txt");
  const raw = readFileSync(file, "utf8");
  // Strip CSV header if present
  const paste = raw.replace(/^company,website\s*\r?\n/i, "");
  const all = parseDirectoryImportPaste(paste);
  console.log(JSON.stringify({ file, parsed: all.length }, null, 2));

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
        directorySource: "msspproviders_public",
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
