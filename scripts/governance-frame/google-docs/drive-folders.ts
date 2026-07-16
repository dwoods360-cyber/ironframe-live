import type { drive_v3 } from "googleapis";

import {
  DOCUMENT_ROLES,
  FOLDER_NAMES,
  type DocumentRole,
  type PaperDocumentState,
  type PaperStateFile,
} from "./types";

type Drive = drive_v3.Drive;

async function findChildByName(
  drive: Drive,
  parentId: string,
  name: string,
  mimeType?: string,
): Promise<drive_v3.Schema$File | null> {
  const escaped = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const mimeClause = mimeType ? ` and mimeType='${mimeType}'` : "";
  const q = `'${parentId}' in parents and name='${escaped}' and trashed=false${mimeClause}`;
  const res = await drive.files.list({
    q,
    fields: "files(id, name, mimeType)",
    spaces: "drive",
    pageSize: 10,
  });
  const files = res.data.files ?? [];
  if (files.length > 1) {
    throw new Error(
      `Drive lookup ambiguous — multiple items named "${name}" under parent ${parentId}.`,
    );
  }
  return files[0] ?? null;
}

async function ensureFolder(
  drive: Drive,
  parentId: string | null,
  name: string,
  dryRun: boolean,
): Promise<{ id: string; created: boolean }> {
  if (dryRun) {
    return { id: `dry-run-folder:${name}`, created: false };
  }

  if (!parentId) {
    // Search root-level by name (drive.file scope: only files created by this app).
    const escaped = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const res = await drive.files.list({
      q: `name='${escaped}' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`,
      fields: "files(id, name)",
      pageSize: 10,
    });
    const existing = res.data.files?.[0];
    if (existing?.id) {
      return { id: existing.id, created: false };
    }
    try {
      const created = await drive.files.create({
        requestBody: {
          name,
          mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id, name",
      });
      if (!created.data.id) {
        throw new Error(`Drive permission failure — folder "${name}" created without an ID.`);
      }
      return { id: created.data.id, created: true };
    } catch (err) {
      throw new Error(
        `Drive permission failure creating folder "${name}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  const existing = await findChildByName(
    drive,
    parentId,
    name,
    "application/vnd.google-apps.folder",
  );
  if (existing?.id) {
    return { id: existing.id, created: false };
  }

  try {
    const created = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      fields: "id, name",
    });
    if (!created.data.id) {
      throw new Error(`Drive permission failure — folder "${name}" created without an ID.`);
    }
    return { id: created.data.id, created: true };
  } catch (err) {
    throw new Error(
      `Drive permission failure creating folder "${name}": ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

export type PaperDriveStructure = {
  rootFolderId: string;
  researchPapersFolderId: string;
  paperFolderId: string;
  documents: Partial<Record<DocumentRole, { id: string; created: boolean }>>;
};

export async function ensurePaperFolderTree(
  drive: Drive,
  dryRun: boolean,
): Promise<{
  rootFolderId: string;
  researchPapersFolderId: string;
  paperFolderId: string;
}> {
  const root = await ensureFolder(drive, null, FOLDER_NAMES.root, dryRun);
  const research = await ensureFolder(
    drive,
    root.id,
    FOLDER_NAMES.researchPapers,
    dryRun,
  );
  const paper = await ensureFolder(drive, research.id, FOLDER_NAMES.paper, dryRun);
  return {
    rootFolderId: root.id,
    researchPapersFolderId: research.id,
    paperFolderId: paper.id,
  };
}

export async function findDocInFolder(
  drive: Drive,
  parentId: string,
  name: DocumentRole,
): Promise<string | null> {
  const existing = await findChildByName(
    drive,
    parentId,
    name,
    "application/vnd.google-apps.document",
  );
  return existing?.id ?? null;
}

export async function createGoogleDoc(
  drive: Drive,
  parentId: string,
  name: DocumentRole,
): Promise<string> {
  try {
    const created = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.document",
        parents: [parentId],
      },
      fields: "id, name",
    });
    if (!created.data.id) {
      throw new Error(`Document "${name}" was not created — API returned no document ID.`);
    }
    return created.data.id;
  } catch (err) {
    throw new Error(
      `Drive permission failure creating document "${name}": ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

export function emptyPaperState(researchId: string): PaperStateFile {
  return {
    researchId,
    folderId: null,
    folderPath: `${FOLDER_NAMES.root}/${FOLDER_NAMES.researchPapers}/${FOLDER_NAMES.paper}`,
    documents: {},
    lastSyncAt: null,
  };
}

export function recordDocumentState(
  state: PaperStateFile,
  role: DocumentRole,
  documentId: string,
  folderId: string,
): PaperStateFile {
  const entry: PaperDocumentState = {
    id: documentId,
    name: role,
    createdBy: "governance-frame-google-docs",
    updatedAt: new Date().toISOString(),
  };
  return {
    ...state,
    folderId,
    documents: {
      ...state.documents,
      [role]: entry,
    },
    lastSyncAt: new Date().toISOString(),
  };
}

export function assertOwnedForReplace(
  state: PaperStateFile,
  role: DocumentRole,
  documentId: string,
): void {
  const known = state.documents[role];
  if (!known || known.id !== documentId || known.createdBy !== "governance-frame-google-docs") {
    throw new Error(
      `Replace blocked for "${role}" — document ID is not recorded as created by this utility. Refusing to overwrite an unknown Doc.`,
    );
  }
}

export { DOCUMENT_ROLES };
