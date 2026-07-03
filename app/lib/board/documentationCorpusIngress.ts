import "server-only";

import fs from "node:fs";
import path from "node:path";

import prisma from "@/lib/prisma";
import {
  APP_DOCS_REPOSITORY_PREFIXES,
  DOCUMENTATION_CORPUS_PLANES,
} from "@/lib/documentationCorpusPlanes";

const REPO_ROOT = process.cwd();
const MAX_BRIEF_DOC_CHARS = 12_000;
const MAX_PRIORITY_DOC_CHARS = 24_000;
const MAX_GLOSSARY_EXCERPT_CHARS = 28_000;
const MAX_TAS_EXCERPT_CHARS = 18_000;
const MAX_BRIEF_DOCUMENT_ROWS = 64;

export type DocumentationCorpusBriefDocument = {
  slug: string;
  title: string;
  readingLevel: string;
  content: string;
  updatedAt: string;
  truncated: boolean;
};

export type DocumentationProvidingAgent = {
  agentId: string;
  ironframeName: string;
  supplies: string;
};

/** Ironframe workforce agents that feed the documentation brief (not IronBoard board-trainer/writer). */
export const DOCUMENTATION_PROVIDING_AGENTS: DocumentationProvidingAgent[] = [
  {
    agentId: "01",
    ironframeName: "Ironcore",
    supplies: "Board shared-context orchestration, route manifest, documentation execute gateway",
  },
  {
    agentId: "03",
    ironframeName: "Irontrust",
    supplies: "BigInt ALE baselines, tenant exposure cents, financial display strings",
  },
  {
    agentId: "05",
    ironframeName: "Ironscribe",
    supplies: "Audit markdown lineage, feature glossary corpus, Level 1/2 doc anchors",
  },
  {
    agentId: "09",
    ironframeName: "Ironlogic",
    supplies: "Governance Frame triad narrative cache for operational context",
  },
  {
    agentId: "12",
    ironframeName: "Ironguard",
    supplies: "Tenant isolation gate on GET /api/board/shared-context",
  },
  {
    agentId: "13",
    ironframeName: "Ironwatch",
    supplies: "Command-post telemetry heartbeat signals in board payload",
  },
  {
    agentId: "17",
    ironframeName: "Ironbloom",
    supplies: "Sustainability physical units (kWh, liters) for training accuracy",
  },
  {
    agentId: "19",
    ironframeName: "Irontally",
    supplies: "Framework readiness percentages (DORA, CMMC, EU AI Act, etc.)",
  },
];

export type DocumentationFullAccessBundle = {
  enabled: true;
  reviewNote: string;
  providingAgents: DocumentationProvidingAgent[];
  corpusPlanePrefixes: readonly string[];
  routeManifest: unknown | null;
  featureGlossaryExcerpt: string;
  tasExcerpt: string;
  documents: DocumentationCorpusBriefDocument[];
};

function readRepoExcerpt(relativePath: string, maxChars: number): string {
  const absolute = path.join(REPO_ROOT, relativePath);
  if (!fs.existsSync(absolute)) return "";
  const raw = fs.readFileSync(absolute, "utf8");
  if (raw.length <= maxChars) return raw;
  return `${raw.slice(0, maxChars)}\n\n[… truncated for brief ingress …]`;
}

function loadRouteManifest(): unknown | null {
  const manifestPath = path.join(REPO_ROOT, "config", "route-manifest.v0.1.0-ga-epic17.json");
  if (!fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function truncateContent(content: string, maxChars: number): { text: string; truncated: boolean } {
  if (content.length <= maxChars) {
    return { text: content, truncated: false };
  }
  return {
    text: `${content.slice(0, maxChars)}\n\n[… truncated for brief ingress …]`,
    truncated: true,
  };
}

function isPriorityCorpusSlug(slug: string, prioritySlugs: readonly string[]): boolean {
  const normalized = slug.toLowerCase();
  return prioritySlugs.some((target) => {
    const t = target.replace(/\.md$/i, "").toLowerCase();
    return normalized === t || normalized.endsWith(`/${t}`);
  });
}

export async function buildDocumentationFullAccessBundle(input: {
  trainerPlacementTargets: readonly string[];
  writerPlacementTargets: readonly string[];
}): Promise<DocumentationFullAccessBundle> {
  const prioritySlugs = [...input.trainerPlacementTargets, ...input.writerPlacementTargets];

  const rows = await prisma.appDocument.findMany({
    orderBy: { updatedAt: "desc" },
    take: MAX_BRIEF_DOCUMENT_ROWS,
    select: {
      slug: true,
      title: true,
      readingLevel: true,
      content: true,
      updatedAt: true,
    },
  });

  const documents: DocumentationCorpusBriefDocument[] = rows.map((row) => {
    const maxChars = isPriorityCorpusSlug(row.slug, prioritySlugs)
      ? MAX_PRIORITY_DOC_CHARS
      : MAX_BRIEF_DOC_CHARS;
    const { text, truncated } = truncateContent(row.content, maxChars);
    return {
      slug: row.slug,
      title: row.title,
      readingLevel: row.readingLevel,
      content: text,
      updatedAt: row.updatedAt.toISOString(),
      truncated,
    };
  });

  return {
    enabled: true,
    reviewNote:
      "Full documentation ingress enabled for IronBoard board-trainer and board-writer. Product Owner review window: 2–3 weeks.",
    providingAgents: DOCUMENTATION_PROVIDING_AGENTS,
    corpusPlanePrefixes: APP_DOCS_REPOSITORY_PREFIXES,
    routeManifest: loadRouteManifest(),
    featureGlossaryExcerpt: readRepoExcerpt(
      "docs/qa/complete-feature-glossary.md",
      MAX_GLOSSARY_EXCERPT_CHARS,
    ),
    tasExcerpt: readRepoExcerpt("docs/TAS.md", MAX_TAS_EXCERPT_CHARS),
    documents,
  };
}

export function resolveCorpusDocument(
  bundle: DocumentationFullAccessBundle,
  slugInput: string,
): DocumentationCorpusBriefDocument | null {
  const normalized = slugInput.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/\.md$/i, "").toLowerCase();
  return bundle.documents.find((doc) => doc.slug.toLowerCase() === normalized) ?? null;
}

export const APP_DOCS_READER_ROUTE = DOCUMENTATION_CORPUS_PLANES.APP_DOCS.readerRoute;
