export type SyncMode = "create" | "replace" | "append";

export type InlineSpan = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

export type HeadingLevel = 1 | 2 | 3;

export type ContentBlock =
  | { type: "title"; spans: InlineSpan[]; line: number }
  | { type: "subtitle"; spans: InlineSpan[]; line: number }
  | { type: "heading"; level: HeadingLevel; spans: InlineSpan[]; line: number }
  | { type: "paragraph"; spans: InlineSpan[]; line: number }
  | { type: "blockquote"; spans: InlineSpan[]; line: number }
  | { type: "ordered_list"; items: InlineSpan[][]; line: number }
  | { type: "unordered_list"; items: InlineSpan[][]; line: number }
  | { type: "table"; headers: string[]; rows: string[][]; line: number }
  | { type: "page_break"; line: number }
  | { type: "toc_placeholder"; line: number };

export type ManuscriptFrontmatter = {
  researchId?: string;
  title?: string;
  subtitle?: string;
  version?: string;
  status?: string;
  classification?: string;
  publisher?: string;
  canonicalRepositoryPath?: string;
  googleDocId?: string;
  [key: string]: unknown;
};

export type ParsedMarkdownDocument = {
  frontmatter: ManuscriptFrontmatter;
  blocks: ContentBlock[];
  unsupported: UnsupportedMarkdownIssue[];
};

export type UnsupportedMarkdownIssue = {
  file: string;
  line: number;
  detail: string;
};

export type DocumentRole =
  | "01 — Master Manuscript"
  | "02 — Reference Ledger"
  | "03 — Source Verification Ledger"
  | "04 — Revision History"
  | "05 — Editorial Review Notes";

export type PaperDocumentState = {
  id: string;
  name: DocumentRole;
  createdBy: "governance-frame-google-docs";
  updatedAt: string;
};

export type PaperStateFile = {
  researchId: string;
  folderId: string | null;
  folderPath: string;
  documents: Partial<Record<DocumentRole, PaperDocumentState>>;
  lastSyncAt: string | null;
};

export type PlannedOperation =
  | { kind: "ensure_folder"; name: string; parent: string }
  | { kind: "create_doc"; name: DocumentRole; parentFolder: string; sourceFile: string | null }
  | { kind: "skip_doc"; name: DocumentRole; reason: string }
  | { kind: "replace_doc"; name: DocumentRole; documentId: string; sourceFile: string | null }
  | { kind: "append_doc"; name: DocumentRole; documentId: string; sourceFile: string | null };

export const RESEARCH_PAPER_ID = "GF-2026-001";

export const FOLDER_NAMES = {
  root: "Governance Frame",
  researchPapers: "Research Papers",
  paper: "GF-2026-001 — Evolution of GRC",
} as const;

export const DOCUMENT_ROLES: DocumentRole[] = [
  "01 — Master Manuscript",
  "02 — Reference Ledger",
  "03 — Source Verification Ledger",
  "04 — Revision History",
  "05 — Editorial Review Notes",
];

export const SOURCE_FILE_BY_ROLE: Record<
  Exclude<DocumentRole, "05 — Editorial Review Notes">,
  string
> = {
  "01 — Master Manuscript": "manuscript.md",
  "02 — Reference Ledger": "references.md",
  "03 — Source Verification Ledger": "source-ledger.md",
  "04 — Revision History": "revision-history.md",
};

export const OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive.file",
] as const;
