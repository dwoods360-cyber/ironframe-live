#!/usr/bin/env npx tsx
/**
 * Create / sync Google Drive + Docs structure for GF-2026-001.
 *
 * Dry-run (default for safety when --dry-run is passed):
 *   npx tsx scripts/governance-frame/google-docs/create-research-paper.ts --dry-run
 *
 * Live create:
 *   GOOGLE_OAUTH_CLIENT_FILE=... GOOGLE_OAUTH_TOKEN_FILE=... \
 *     npx tsx scripts/governance-frame/google-docs/create-research-paper.ts --mode=create
 */
import fs from "fs";
import path from "path";

import { authorizeGoogle } from "./google-auth";
import {
  assertOwnedForReplace,
  createGoogleDoc,
  emptyPaperState,
  ensurePaperFolderTree,
  findDocInFolder,
  recordDocumentState,
} from "./drive-folders";
import { parseSourceFile, writeParsedDocument } from "./docs-formatting";
import {
  DOCUMENT_ROLES,
  FOLDER_NAMES,
  RESEARCH_PAPER_ID,
  SOURCE_FILE_BY_ROLE,
  type DocumentRole,
  type PaperStateFile,
  type PlannedOperation,
  type SyncMode,
} from "./types";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const PAPER_DIR = path.join(
  REPO_ROOT,
  "docs/governance-frame/research-papers/GF-2026-001-evolution-of-grc",
);
const STATE_DIR = path.join(__dirname, ".state");
const STATE_FILE = path.join(STATE_DIR, "GF-2026-001.json");
const REVIEW_TEMPLATE = path.join(__dirname, "templates/editorial-review-notes.md");

function parseArgs(argv: string[]): {
  mode: SyncMode;
  dryRun: boolean;
  writeMetadata: boolean;
} {
  let mode: SyncMode = "create";
  let dryRun = false;
  let writeMetadata = false;
  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    if (arg === "--write-metadata") writeMetadata = true;
    if (arg.startsWith("--mode=")) {
      const value = arg.slice("--mode=".length) as SyncMode;
      if (value !== "create" && value !== "replace" && value !== "append") {
        throw new Error(`Invalid --mode=${value}. Use create|replace|append.`);
      }
      mode = value;
    }
  }
  return { mode, dryRun, writeMetadata };
}

function loadState(): PaperStateFile {
  if (!fs.existsSync(STATE_FILE)) {
    return emptyPaperState(RESEARCH_PAPER_ID);
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as PaperStateFile;
}

function saveState(state: PaperStateFile): void {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function requireSourceFiles(): void {
  for (const role of Object.keys(SOURCE_FILE_BY_ROLE) as Array<
    keyof typeof SOURCE_FILE_BY_ROLE
  >) {
    const file = path.join(PAPER_DIR, SOURCE_FILE_BY_ROLE[role]);
    if (!fs.existsSync(file)) {
      throw new Error(`Missing source file: ${file}`);
    }
  }
  if (!fs.existsSync(REVIEW_TEMPLATE)) {
    throw new Error(`Missing editorial review template: ${REVIEW_TEMPLATE}`);
  }
}

function sourceMarkdownForRole(role: DocumentRole): { file: string | null; markdown: string } {
  if (role === "05 — Editorial Review Notes") {
    return {
      file: REVIEW_TEMPLATE,
      markdown: fs.readFileSync(REVIEW_TEMPLATE, "utf8"),
    };
  }
  const relative = SOURCE_FILE_BY_ROLE[role];
  const file = path.join(PAPER_DIR, relative);
  return { file, markdown: fs.readFileSync(file, "utf8") };
}

function planOperations(mode: SyncMode, existingNames: Set<DocumentRole>): PlannedOperation[] {
  const ops: PlannedOperation[] = [
    { kind: "ensure_folder", name: FOLDER_NAMES.root, parent: "root" },
    {
      kind: "ensure_folder",
      name: FOLDER_NAMES.researchPapers,
      parent: FOLDER_NAMES.root,
    },
    {
      kind: "ensure_folder",
      name: FOLDER_NAMES.paper,
      parent: FOLDER_NAMES.researchPapers,
    },
  ];

  for (const role of DOCUMENT_ROLES) {
    const source =
      role === "05 — Editorial Review Notes"
        ? "templates/editorial-review-notes.md"
        : SOURCE_FILE_BY_ROLE[role];
    if (!existingNames.has(role)) {
      ops.push({
        kind: "create_doc",
        name: role,
        parentFolder: FOLDER_NAMES.paper,
        sourceFile: source,
      });
      continue;
    }
    if (mode === "create") {
      ops.push({
        kind: "skip_doc",
        name: role,
        reason: "already exists (mode=create)",
      });
    } else if (mode === "replace") {
      ops.push({
        kind: "replace_doc",
        name: role,
        documentId: "(resolved at runtime)",
        sourceFile: source,
      });
    } else {
      ops.push({
        kind: "append_doc",
        name: role,
        documentId: "(resolved at runtime)",
        sourceFile: source,
      });
    }
  }
  return ops;
}

function writeGoogleDocIdToManuscript(documentId: string): void {
  const manuscriptPath = path.join(PAPER_DIR, "manuscript.md");
  const original = fs.readFileSync(manuscriptPath, "utf8");
  if (!original.startsWith("---")) {
    throw new Error("manuscript.md missing YAML frontmatter; refusing metadata write.");
  }
  const end = original.indexOf("\n---", 3);
  if (end === -1) {
    throw new Error("manuscript.md frontmatter is malformed; refusing metadata write.");
  }
  const fm = original.slice(0, end + 4);
  const body = original.slice(end + 4);
  let updatedFm: string;
  if (/^googleDocId:\s*/m.test(fm)) {
    updatedFm = fm.replace(/^googleDocId:\s*.*$/m, `googleDocId: "${documentId}"`);
  } else {
    updatedFm = fm.replace(/\n---\s*$/, `\ngoogleDocId: "${documentId}"\n---`);
  }
  fs.writeFileSync(manuscriptPath, `${updatedFm}${body}`, "utf8");
  console.log(`Updated googleDocId in ${manuscriptPath}`);
}

async function main(): Promise<void> {
  const { mode, dryRun, writeMetadata } = parseArgs(process.argv.slice(2));
  requireSourceFiles();

  // Validate Markdown parse before any Google calls.
  for (const role of DOCUMENT_ROLES) {
    const { file, markdown } = sourceMarkdownForRole(role);
    const parsed = parseSourceFile(markdown, file ?? role);
    if (parsed.unsupported.length > 0) {
      for (const issue of parsed.unsupported) {
        console.warn(`[WARN] ${issue.file}:${issue.line} — ${issue.detail}`);
      }
    }
  }

  const state = loadState();
  const knownExisting = new Set(
    DOCUMENT_ROLES.filter((role) => Boolean(state.documents[role]?.id)),
  ) as Set<DocumentRole>;

  if (dryRun) {
    console.log("=== Governance Frame Google Docs dry-run ===");
    console.log(`Research ID: ${RESEARCH_PAPER_ID}`);
    console.log(`Mode: ${mode}`);
    console.log(`Paper directory: ${PAPER_DIR}`);
    console.log(`State file: ${STATE_FILE}`);
    console.log("");
    console.log("Intended Drive path:");
    console.log(
      `  ${FOLDER_NAMES.root}/${FOLDER_NAMES.researchPapers}/${FOLDER_NAMES.paper}/`,
    );
    console.log("");
    const ops = planOperations(mode, knownExisting);
    for (const op of ops) {
      console.log(`- ${JSON.stringify(op)}`);
    }
    console.log("");
    console.log("No Google API calls were made.");
    return;
  }

  const { drive, docs } = await authorizeGoogle();
  const folders = await ensurePaperFolderTree(drive, false);
  console.log(`Drive folder ID: ${folders.paperFolderId}`);

  let nextState: PaperStateFile = {
    ...state,
    folderId: folders.paperFolderId,
    folderPath: `${FOLDER_NAMES.root}/${FOLDER_NAMES.researchPapers}/${FOLDER_NAMES.paper}`,
  };

  let masterManuscriptId: string | null = null;

  for (const role of DOCUMENT_ROLES) {
    const { file, markdown } = sourceMarkdownForRole(role);
    let documentId = await findDocInFolder(drive, folders.paperFolderId, role);
    const known = nextState.documents[role];

    if (!documentId) {
      documentId = await createGoogleDoc(drive, folders.paperFolderId, role);
      console.log(`Created document "${role}" → ${documentId}`);
      nextState = recordDocumentState(
        nextState,
        role,
        documentId,
        folders.paperFolderId,
      );
      await writeParsedDocument(docs, documentId, markdown, file ?? role, {
        includeCoverFromFrontmatter: role === "01 — Master Manuscript",
        forcePageBreaksForManuscript: role === "01 — Master Manuscript",
      });
    } else if (mode === "create") {
      console.log(`Skipped existing "${role}" (${documentId}) — mode=create`);
      if (!known) {
        // Record discovery without overwriting content.
        nextState = recordDocumentState(
          nextState,
          role,
          documentId,
          folders.paperFolderId,
        );
      }
    } else if (mode === "replace") {
      assertOwnedForReplace(nextState, role, documentId);
      console.log(`Replacing "${role}" (${documentId})`);
      await writeParsedDocument(docs, documentId, markdown, file ?? role, {
        includeCoverFromFrontmatter: role === "01 — Master Manuscript",
        forcePageBreaksForManuscript: role === "01 — Master Manuscript",
      });
      nextState = recordDocumentState(
        nextState,
        role,
        documentId,
        folders.paperFolderId,
      );
    } else {
      // append
      if (known && known.id !== documentId) {
        throw new Error(
          `Append blocked for "${role}" — Drive ID does not match utility state.`,
        );
      }
      console.log(`Appending to "${role}" (${documentId})`);
      await writeParsedDocument(docs, documentId, markdown, file ?? role, {
        append: true,
      });
      nextState = recordDocumentState(
        nextState,
        role,
        documentId,
        folders.paperFolderId,
      );
    }

    if (role === "01 — Master Manuscript") {
      masterManuscriptId = documentId;
    }
  }

  saveState(nextState);

  if (!masterManuscriptId) {
    throw new Error("Master Manuscript was not created or resolved — refusing success.");
  }

  console.log("");
  console.log(`Master Manuscript Google document ID: ${masterManuscriptId}`);
  console.log(`Drive folder ID: ${folders.paperFolderId}`);
  console.log(
    `Open: https://docs.google.com/document/d/${masterManuscriptId}/edit`,
  );

  if (writeMetadata) {
    writeGoogleDocIdToManuscript(masterManuscriptId);
  } else {
    console.log(
      "Tip: re-run with --write-metadata to set googleDocId in manuscript.md frontmatter.",
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
