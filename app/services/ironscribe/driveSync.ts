import "server-only";

import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import {
  IRONSCRIBE_DRIVE_DEFAULT_FOLDER,
  IRONSCRIBE_DRIVE_MIRROR_PATH,
} from "@/app/config/industryScoutFeeds";
import {
  readIndustryScoutSeenIds,
  writeIndustryScoutSeenIds,
} from "@/app/lib/regulatoryIngestionState";
import { ironscribeForensicIngest } from "@/app/services/ironscribe/forensicIngestor";
import { processIngestedRegulation } from "@/app/services/regulatoryPipeline";

const MIRROR_PATH = IRONSCRIBE_DRIVE_MIRROR_PATH;

const PROCESSED_MANIFEST = join(process.cwd(), "storage", "constitutional", "ironscribe-drive-processed.json");

function readProcessedHashes(): Set<string> {
  try {
    if (!existsSync(PROCESSED_MANIFEST)) return new Set();
    const raw = JSON.parse(readFileSync(PROCESSED_MANIFEST, "utf8")) as { hashes?: string[] };
    return new Set(raw.hashes ?? []);
  } catch {
    return new Set();
  }
}

function writeProcessedHashes(hashes: Set<string>): void {
  const dir = join(process.cwd(), "storage", "constitutional");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(
    PROCESSED_MANIFEST,
    JSON.stringify({ folder: IRONSCRIBE_DRIVE_DEFAULT_FOLDER, hashes: [...hashes].slice(-300) }, null, 2),
    "utf8",
  );
}

function resolveMirrorDir(): string {
  const rel = MIRROR_PATH.replace(/^\//, "");
  return join(process.cwd(), rel);
}

export type DriveSyncResult = {
  ok: boolean;
  folder: string;
  mirrorPath: string;
  filesScanned: number;
  newlyIngested: number;
  errors: string[];
};

/**
 * Ironscribe Drive sync — monitor mirrored Governance/Regulations folder (or local drive-inbox).
 * Set IRONSCRIBE_DRIVE_MIRROR_PATH to sync from Google Drive desktop / rclone mount.
 */
export async function runIronscribeDriveSync(): Promise<DriveSyncResult> {
  const mirrorPath = resolveMirrorDir();
  if (!existsSync(mirrorPath)) mkdirSync(mirrorPath, { recursive: true });

  const processed = readProcessedHashes();
  const seen = readIndustryScoutSeenIds();
  const errors: string[] = [];
  let newlyIngested = 0;

  const entries = readdirSync(mirrorPath).filter((f) => /\.(pdf|md|txt|html?)$/i.test(f));

  for (const filename of entries) {
    const fullPath = join(mirrorPath, filename);
    try {
      const stat = statSync(fullPath);
      if (!stat.isFile()) continue;
      const buffer = readFileSync(fullPath);
      const sha256 = createHash("sha256").update(buffer).digest("hex");
      if (processed.has(sha256)) continue;

      const authority = /nist/i.test(filename)
        ? "NIST"
        : /sec|reg.?s-?p|safeguard/i.test(filename)
          ? "SEC"
          : /colorado|sb24|sb189/i.test(filename)
            ? "Colorado"
            : "ISO";

      const { blocks } = await ironscribeForensicIngest({
        buffer,
        filename,
        mimeType: filename.endsWith(".pdf") ? "application/pdf" : "text/plain",
        authority,
        sourceUrl: `drive://${IRONSCRIBE_DRIVE_DEFAULT_FOLDER}${filename}`,
      });

      const id = sha256.slice(0, 16);
      seen.add(id);

      await processIngestedRegulation({
        source: "ironscribe_drive",
        authority,
        title: filename,
        sourceUrl: `drive://${filename}`,
        localPath: fullPath,
        sha256,
        mimeType: filename.endsWith(".pdf") ? "application/pdf" : "text/plain",
        blocks,
      });

      processed.add(sha256);
      newlyIngested += 1;
    } catch (e) {
      errors.push(`${filename}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  writeProcessedHashes(processed);
  writeIndustryScoutSeenIds(seen);

  return {
    ok: true,
    folder: IRONSCRIBE_DRIVE_DEFAULT_FOLDER,
    mirrorPath,
    filesScanned: entries.length,
    newlyIngested,
    errors,
  };
}
