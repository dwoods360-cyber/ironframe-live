#!/usr/bin/env npx tsx
/**
 * Create / replace Google Docs for the three quarantined industry research briefs.
 *
 *   npm run governance-frame:google-docs:briefs -- --mode=create
 *   npm run governance-frame:google-docs:briefs -- --mode=replace
 *
 * Does not promote, write Ops Hub metadata, or touch published_briefings.
 */
import fs from "fs";
import path from "path";

import type { drive_v3 } from "googleapis";

import { authorizeGoogle } from "./google-auth";
import { writeParsedDocument } from "./docs-formatting";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const QUEUE_DIR = path.join(REPO_ROOT, "docs/briefing-queue");
const STATE_DIR = path.join(__dirname, ".state");
const STATE_FILE = path.join(STATE_DIR, "industry-research-briefs-2026-07-15.json");

const FOLDER_ROOT = "Governance Frame";
const FOLDER_SERIES = "Industry Research Briefs";
const FOLDER_BATCH = "2026-07-15 — Quarantined Drafts";

type BriefSpec = {
  filename: string;
  docName: string;
};

const BRIEFS: BriefSpec[] = [
  {
    filename: "2026-07-15-draft-research-grc-current-pain.md",
    docName: "01 — Current GRC Pain Points and Control-First Alleviation Paths",
  },
  {
    filename: "2026-07-15-draft-research-grc-evolution.md",
    docName: "02 — Evolution of GRC: Persistent Pain Points and Historical Mitigations",
  },
  {
    filename: "2026-07-15-draft-research-stakeholder-benefit-map.md",
    docName: "03 — Stakeholder & Department Benefit Map",
  },
];

type BriefState = {
  batchId: string;
  folderId: string | null;
  folderPath: string;
  documents: Record<
    string,
    { id: string; name: string; sourceFile: string; createdBy: string; updatedAt: string }
  >;
  lastSyncAt: string | null;
};

type Drive = drive_v3.Drive;

function parseArgs(argv: string[]): { mode: "create" | "replace"; dryRun: boolean } {
  let mode: "create" | "replace" = "create";
  let dryRun = false;
  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    if (arg.startsWith("--mode=")) {
      const value = arg.slice("--mode=".length);
      if (value !== "create" && value !== "replace") {
        throw new Error(`Invalid --mode=${value}. Use create|replace.`);
      }
      mode = value;
    }
  }
  return { mode, dryRun };
}

function loadState(): BriefState {
  if (!fs.existsSync(STATE_FILE)) {
    return {
      batchId: "industry-research-briefs-2026-07-15",
      folderId: null,
      folderPath: `${FOLDER_ROOT}/${FOLDER_SERIES}/${FOLDER_BATCH}`,
      documents: {},
      lastSyncAt: null,
    };
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as BriefState;
}

function saveState(state: BriefState): void {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

async function findChildByName(
  drive: Drive,
  parentId: string | null,
  name: string,
  mimeType: string,
): Promise<string | null> {
  const escaped = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const parentClause = parentId
    ? `'${parentId}' in parents`
    : `'root' in parents`;
  const q = `${parentClause} and name='${escaped}' and mimeType='${mimeType}' and trashed=false`;
  const res = await drive.files.list({
    q,
    fields: "files(id, name)",
    spaces: "drive",
    pageSize: 10,
  });
  const files = res.data.files ?? [];
  if (files.length > 1) {
    throw new Error(`Drive lookup ambiguous — multiple items named "${name}".`);
  }
  return files[0]?.id ?? null;
}

async function ensureFolder(
  drive: Drive,
  parentId: string | null,
  name: string,
): Promise<string> {
  const existing = await findChildByName(
    drive,
    parentId,
    name,
    "application/vnd.google-apps.folder",
  );
  if (existing) return existing;
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    },
    fields: "id",
  });
  if (!created.data.id) {
    throw new Error(`Failed to create folder "${name}".`);
  }
  return created.data.id;
}

async function ensureDoc(
  drive: Drive,
  parentId: string,
  name: string,
): Promise<{ id: string; created: boolean }> {
  const existing = await findChildByName(
    drive,
    parentId,
    name,
    "application/vnd.google-apps.document",
  );
  if (existing) return { id: existing, created: false };
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.document",
      parents: [parentId],
    },
    fields: "id",
  });
  if (!created.data.id) {
    throw new Error(`Failed to create document "${name}".`);
  }
  return { id: created.data.id, created: true };
}

async function main(): Promise<void> {
  const { mode, dryRun } = parseArgs(process.argv.slice(2));

  for (const brief of BRIEFS) {
    const full = path.join(QUEUE_DIR, brief.filename);
    if (!fs.existsSync(full)) {
      throw new Error(`Missing queue draft: ${full}`);
    }
  }

  if (dryRun) {
    console.log("=== Industry research briefs Google Docs dry-run ===");
    console.log(`Mode: ${mode}`);
    console.log(`Drive path: ${FOLDER_ROOT}/${FOLDER_SERIES}/${FOLDER_BATCH}/`);
    for (const brief of BRIEFS) {
      console.log(`- ${brief.docName} ← ${brief.filename}`);
    }
    console.log("No Google API calls were made.");
    return;
  }

  const { drive, docs } = await authorizeGoogle();
  const rootId = await ensureFolder(drive, null, FOLDER_ROOT);
  const seriesId = await ensureFolder(drive, rootId, FOLDER_SERIES);
  const batchId = await ensureFolder(drive, seriesId, FOLDER_BATCH);
  console.log(`Drive folder ID: ${batchId}`);

  let state = loadState();
  state.folderId = batchId;
  state.folderPath = `${FOLDER_ROOT}/${FOLDER_SERIES}/${FOLDER_BATCH}`;

  for (const brief of BRIEFS) {
    const sourcePath = path.join(QUEUE_DIR, brief.filename);
    const markdown = fs.readFileSync(sourcePath, "utf8");
    const { id, created } = await ensureDoc(drive, batchId, brief.docName);
    const known = state.documents[brief.filename];

    // Claim orphans left by a prior failed write (doc exists in our batch folder,
    // but local state was never saved).
    const owned =
      created ||
      !known ||
      (known.id === id && known.createdBy === "governance-frame-google-docs");

    if (!owned) {
      throw new Error(
        `Replace blocked for "${brief.docName}" — Drive ID does not match utility state.`,
      );
    }

    if (mode === "create" && !created && known?.id === id) {
      console.log(`Skipped existing "${brief.docName}" (${id}) — mode=create`);
    } else {
      console.log(`${created ? "Writing" : "Replacing"} "${brief.docName}" (${id})`);
      await writeParsedDocument(docs, id, markdown, brief.filename, {
        includeCoverFromFrontmatter: false,
        forcePageBreaksForManuscript: false,
      });
    }

    state.documents[brief.filename] = {
      id,
      name: brief.docName,
      sourceFile: brief.filename,
      createdBy: "governance-frame-google-docs",
      updatedAt: new Date().toISOString(),
    };
    state.lastSyncAt = new Date().toISOString();
    // Persist after each doc so a later failure does not orphan earlier IDs.
    saveState(state);
    console.log(`Open: https://docs.google.com/document/d/${id}/edit`);
  }

  saveState(state);
  console.log("");
  console.log(`State saved: ${STATE_FILE}`);
  console.log("Quarantine status unchanged — drafts were not promoted.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
