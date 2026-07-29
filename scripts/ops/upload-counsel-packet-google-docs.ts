#!/usr/bin/env npx tsx
/**
 * Upload counsel-packet-export Markdown into Google Drive as Google Docs.
 *
 * Requires the same OAuth Desktop credentials as Governance Frame Docs sync:
 *   GOOGLE_OAUTH_CLIENT_FILE=./secrets/google-oauth-client.json
 *   GOOGLE_OAUTH_TOKEN_FILE=./secrets/google-oauth-token.json
 *
 * Dry-run:
 *   npx tsx scripts/ops/upload-counsel-packet-google-docs.ts --dry-run
 *
 * Live:
 *   GOOGLE_OAUTH_CLIENT_FILE=... GOOGLE_OAUTH_TOKEN_FILE=... \
 *     npx tsx scripts/ops/upload-counsel-packet-google-docs.ts [--replace]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { drive_v3 } from "googleapis";

import { authorizeGoogle } from "../governance-frame/google-docs/google-auth";
import { writeParsedDocument } from "../governance-frame/google-docs/docs-formatting";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const EXPORT_DIR = path.join(REPO_ROOT, "docs/sales/counsel-packet-export");
const STATE_FILE = path.join(__dirname, ".state", "counsel-packet-google-docs.json");

const ROOT_FOLDER = "Ironframe LegalCORPS Clinic";

const PACKET_FILES = [
  "00-counsel-review-packet-cover.md",
  "01-design-partner-order-form.md",
  "02-msa-terms-framework.md",
  "03-privacy-framework.md",
  "04-dpa-framework.md",
  "05-corporate-subprocessor-list.md",
  "06-data-residency-statement.md",
] as const;

type StateFile = {
  folderId: string | null;
  folderName: string;
  documents: Record<string, { id: string; name: string; updatedAt: string }>;
  lastSyncAt: string | null;
};

function docTitleFromFilename(filename: string): string {
  return filename.replace(/\.md$/i, "").replace(/-/g, " ");
}

async function findChildByName(
  drive: drive_v3.Drive,
  parentId: string | null,
  name: string,
  mimeType: string,
): Promise<drive_v3.Schema$File | null> {
  const escaped = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const parentClause = parentId ? `'${parentId}' in parents and ` : `'root' in parents and `;
  const q = `${parentClause}name='${escaped}' and mimeType='${mimeType}' and trashed=false`;
  const res = await drive.files.list({
    q,
    fields: "files(id, name, mimeType)",
    spaces: "drive",
    pageSize: 10,
  });
  return res.data.files?.[0] ?? null;
}

async function ensureFolder(drive: drive_v3.Drive, name: string): Promise<string> {
  const existing = await findChildByName(
    drive,
    null,
    name,
    "application/vnd.google-apps.folder",
  );
  if (existing?.id) return existing.id;
  const created = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder" },
    fields: "id, name",
  });
  if (!created.data.id) throw new Error(`Failed to create Drive folder "${name}"`);
  return created.data.id;
}

async function ensureDoc(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
): Promise<{ id: string; created: boolean }> {
  const existing = await findChildByName(
    drive,
    parentId,
    name,
    "application/vnd.google-apps.document",
  );
  if (existing?.id) return { id: existing.id, created: false };
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.document",
      parents: [parentId],
    },
    fields: "id, name",
  });
  if (!created.data.id) throw new Error(`Failed to create Google Doc "${name}"`);
  return { id: created.data.id, created: true };
}

function loadState(): StateFile {
  if (!fs.existsSync(STATE_FILE)) {
    return { folderId: null, folderName: ROOT_FOLDER, documents: {}, lastSyncAt: null };
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as StateFile;
}

function saveState(state: StateFile): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const replace = process.argv.includes("--replace");

  for (const file of PACKET_FILES) {
    const abs = path.join(EXPORT_DIR, file);
    if (!fs.existsSync(abs)) {
      throw new Error(`Missing export file: ${abs}`);
    }
  }

  if (dryRun) {
    console.log("=== Counsel packet Google Docs dry-run ===");
    console.log(`Folder: ${ROOT_FOLDER}`);
    for (const file of PACKET_FILES) {
      console.log(`  Doc: ${docTitleFromFilename(file)} ← ${file}`);
    }
    return;
  }

  const { drive, docs } = await authorizeGoogle();
  const folderId = await ensureFolder(drive, ROOT_FOLDER);
  console.log(`Drive folder: ${ROOT_FOLDER} (${folderId})`);

  const state = loadState();
  state.folderId = folderId;
  state.folderName = ROOT_FOLDER;

  for (const file of PACKET_FILES) {
    const title = docTitleFromFilename(file);
    const abs = path.join(EXPORT_DIR, file);
    const markdown = fs.readFileSync(abs, "utf8");
    const { id, created } = await ensureDoc(drive, folderId, title);

    const shouldWrite = created || replace || !state.documents[title];
    if (shouldWrite) {
      await writeParsedDocument(docs, id, markdown, file, {
        includeCoverFromFrontmatter: false,
        forcePageBreaksForManuscript: false,
      });
      console.log(
        `${created ? "Created" : "Updated"}: ${title} → https://docs.google.com/document/d/${id}/edit`,
      );
    } else {
      console.log(`Skipped (exists): ${title} → https://docs.google.com/document/d/${id}/edit`);
    }

    state.documents[title] = {
      id,
      name: title,
      updatedAt: new Date().toISOString(),
    };
  }

  state.lastSyncAt = new Date().toISOString();
  saveState(state);
  console.log(`\nOpen folder: https://drive.google.com/drive/folders/${folderId}`);
  console.log("Download each Doc as PDF (File → Download → PDF) for LegalCORPS.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
