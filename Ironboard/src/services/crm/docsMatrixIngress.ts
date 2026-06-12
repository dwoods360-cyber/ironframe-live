import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Prisma } from '@prisma/client';
import {
  BOARD_KNOWLEDGE_METRIC_TAG,
  DOCS_INGESTED_UNITS_METRIC,
  DOCS_MATRIX_CATEGORIES,
  DOCS_MATRIX_CLASSIFICATION,
  type BoardKnowledgeCrmEnvelope,
  type DocsMatrixCategory,
  type DocsMatrixIngressResult,
  type DocsMatrixTelemetryEnvelope,
  type IronscribeParsedDocument,
} from '../../types/boardKnowledge.js';
import { parseIronscribeMarkdownDocument } from '../ironscribe/markdownOutlineParser.js';
import { resolveBoardOrgTenantId } from './strategicIntelIngress.js';
import { runIronboardCrmTransaction } from './crmTenantContext.js';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const IRONBOARD_ROOT = path.resolve(MODULE_DIR, '../../..');

/** Core governance files excluded from matrix scan (root-level only). */
export const DOCS_MATRIX_EXCLUDED_ROOT_FILES = new Set([
  'TAS.md',
  'infrastructure.md',
  'testing.md',
]);

export type ScannedMatrixDocument = {
  relativePath: string;
  docCategory: DocsMatrixCategory;
  rawMarkdown: string;
};

function resolveDocsRoot(): string {
  const candidates = [
    path.resolve(IRONBOARD_ROOT, '../docs'),
    path.resolve(process.cwd(), 'docs'),
    path.resolve(process.cwd(), '../docs'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'TAS.md'))) return dir;
  }
  return candidates[0];
}

function isMatrixCategory(name: string): name is DocsMatrixCategory {
  return (DOCS_MATRIX_CATEGORIES as readonly string[]).includes(name);
}

/** Recursive scan of matrix category folders under /docs/. */
export function scanDocsMatrixFromDisk(docsRoot = resolveDocsRoot()): ScannedMatrixDocument[] {
  const documents: ScannedMatrixDocument[] = [];

  for (const category of DOCS_MATRIX_CATEGORIES) {
    const categoryDir = path.join(docsRoot, category);
    if (!fs.existsSync(categoryDir)) continue;

    const stack: string[] = [categoryDir];
    while (stack.length) {
      const current = stack.pop()!;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(fullPath);
          continue;
        }
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) continue;

        const relativePath = path.relative(docsRoot, fullPath).replace(/\\/g, '/');
        const rootFile = relativePath.split('/').pop() ?? relativePath;
        if (!relativePath.includes('/') && DOCS_MATRIX_EXCLUDED_ROOT_FILES.has(rootFile)) {
          continue;
        }

        documents.push({
          relativePath,
          docCategory: category,
          rawMarkdown: fs.readFileSync(fullPath, 'utf-8'),
        });
      }
    }
  }

  return documents.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export function parseScannedMatrixDocuments(
  scanned: ScannedMatrixDocument[],
  parsedAt?: string,
): IronscribeParsedDocument[] {
  return scanned.map(doc =>
    parseIronscribeMarkdownDocument({
      relativePath: doc.relativePath,
      docCategory: doc.docCategory,
      rawMarkdown: doc.rawMarkdown,
      parsedAt,
    }),
  );
}

function parseKnowledgeEnvelope(summary: string): BoardKnowledgeCrmEnvelope | null {
  try {
    const parsed = JSON.parse(summary) as BoardKnowledgeCrmEnvelope;
    if (parsed.metricTag !== BOARD_KNOWLEDGE_METRIC_TAG) return null;
    if (parsed.classification !== DOCS_MATRIX_CLASSIFICATION) return null;
    if (!parsed.document?.documentId) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function findExistingDocumentInteraction(
  tx: Prisma.TransactionClient,
  tenantId: string,
  documentId: string,
): Promise<{ id: string; ingestedAt: string } | null> {
  const rows = await tx.ironboardCrmInteraction.findMany({
    where: {
      tenantId,
      channel: 'NOTE',
      summary: { contains: DOCS_MATRIX_CLASSIFICATION },
    },
    orderBy: { occurredAt: 'desc' },
    take: 64,
    select: { id: true, summary: true },
  });

  for (const row of rows) {
    const envelope = parseKnowledgeEnvelope(row.summary);
    if (envelope?.document.documentId === documentId) {
      return { id: row.id, ingestedAt: envelope.ingestedAt };
    }
  }
  return null;
}

export async function persistBoardKnowledgeDocument(
  tenantIdRaw: unknown,
  document: IronscribeParsedDocument,
): Promise<{ interactionId: string; ingestedAt: string; skippedDuplicate: boolean }> {
  return runIronboardCrmTransaction(tenantIdRaw, async (tx, tenantId) => {
    const existing = await findExistingDocumentInteraction(tx, tenantId, document.documentId);
    if (existing) {
      return {
        interactionId: existing.id,
        ingestedAt: existing.ingestedAt,
        skippedDuplicate: true,
      };
    }

    const ingestedAt = new Date().toISOString();
    const envelope: BoardKnowledgeCrmEnvelope = {
      metricTag: BOARD_KNOWLEDGE_METRIC_TAG,
      classification: DOCS_MATRIX_CLASSIFICATION,
      sanitizedBy: 'Irongate-Agent-14',
      ingestedAt,
      tenantId,
      docCategory: document.docCategory,
      document,
    };

    const row = await tx.ironboardCrmInteraction.create({
      data: {
        id: randomUUID(),
        tenantId,
        dealId: null,
        contactId: null,
        channel: 'NOTE',
        summary: JSON.stringify(envelope),
        occurredAt: new Date(ingestedAt),
      },
    });

    return {
      interactionId: row.id,
      ingestedAt,
      skippedDuplicate: false,
    };
  });
}

async function persistDocsMatrixTelemetry(
  tenantIdRaw: unknown,
  traceId: string,
  stats: {
    docsIngestedUnits: bigint;
    docsSkippedDuplicateUnits: bigint;
    pipelineDurationMsUnits: bigint;
    categories: DocsMatrixCategory[];
  },
): Promise<string> {
  return runIronboardCrmTransaction(tenantIdRaw, async (tx, tenantId) => {
    const ingestedAt = new Date().toISOString();
    const interactionId = randomUUID();
    const envelope: DocsMatrixTelemetryEnvelope = {
      metricTag: BOARD_KNOWLEDGE_METRIC_TAG,
      subMetric: DOCS_INGESTED_UNITS_METRIC,
      classification: 'Docs Matrix Ingestion Telemetry',
      sanitizedBy: 'Irongate-Agent-14',
      ingestedAt,
      traceId,
      tenantId,
      statisticsUnits: {
        docsIngestedUnits: stats.docsIngestedUnits.toString(),
        docsSkippedDuplicateUnits: stats.docsSkippedDuplicateUnits.toString(),
        pipelineDurationMsUnits: stats.pipelineDurationMsUnits.toString(),
      },
      categories: stats.categories,
    };

    await tx.ironboardCrmInteraction.create({
      data: {
        id: interactionId,
        tenantId,
        dealId: null,
        contactId: null,
        channel: 'OTHER',
        summary: JSON.stringify(envelope),
        occurredAt: new Date(ingestedAt),
      },
    });

    return interactionId;
  });
}

export async function ingestCorporateDocumentationMatrix(
  tenantIdRaw?: unknown,
): Promise<DocsMatrixIngressResult> {
  const pipelineStart = Date.now();
  const traceId = randomUUID();
  const tenantId = tenantIdRaw ?? resolveBoardOrgTenantId();
  const parsedAt = new Date().toISOString();

  const scanned = scanDocsMatrixFromDisk();
  const parsedDocuments = parseScannedMatrixDocuments(scanned, parsedAt);

  const ingestedDocumentIds: string[] = [];
  const skippedDocumentIds: string[] = [];

  for (const document of parsedDocuments) {
    const result = await persistBoardKnowledgeDocument(tenantId, document);
    if (result.skippedDuplicate) {
      skippedDocumentIds.push(document.documentId);
    } else {
      ingestedDocumentIds.push(document.documentId);
    }
  }

  const docsIngestedUnits = BigInt(ingestedDocumentIds.length);
  const docsSkippedDuplicateUnits = BigInt(skippedDocumentIds.length);
  const pipelineDurationMsUnits = BigInt(Date.now() - pipelineStart);
  const categories = [...new Set(parsedDocuments.map(doc => doc.docCategory))];

  let telemetryInteractionId: string | null = null;
  try {
    telemetryInteractionId = await persistDocsMatrixTelemetry(tenantId, traceId, {
      docsIngestedUnits,
      docsSkippedDuplicateUnits,
      pipelineDurationMsUnits,
      categories,
    });
  } catch (err) {
    console.warn('[DOCS MATRIX TELEMETRY]', err);
  }

  console.info(
    `[IRONBOARD DOCS MATRIX] docsIngestedUnits=${docsIngestedUnits.toString()} skipped=${docsSkippedDuplicateUnits.toString()} traceId=${traceId}`,
  );

  return {
    traceId,
    docsIngestedUnits,
    docsSkippedDuplicateUnits,
    ingestedDocumentIds,
    skippedDocumentIds,
    telemetryInteractionId,
    pipelineDurationMsUnits,
  };
}

export async function fetchBoardKnowledgeDocuments(
  tenantIdRaw: unknown,
  options?: {
    docCategory?: DocsMatrixCategory;
    query?: string;
    limit?: number;
  },
): Promise<IronscribeParsedDocument[]> {
  const limit = Math.min(Math.max(options?.limit ?? 12, 1), 32);
  const queryTokens = (options?.query ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(token => token.length > 3);

  return runIronboardCrmTransaction(tenantIdRaw, async (tx, tenantId) => {
    const rows = await tx.ironboardCrmInteraction.findMany({
      where: {
        tenantId,
        channel: 'NOTE',
        summary: { contains: DOCS_MATRIX_CLASSIFICATION },
      },
      orderBy: { occurredAt: 'desc' },
      take: 128,
      select: { summary: true },
    });

    const byId = new Map<string, IronscribeParsedDocument>();

    for (const row of rows) {
      const envelope = parseKnowledgeEnvelope(row.summary);
      if (!envelope) continue;
      if (options?.docCategory && envelope.docCategory !== options.docCategory) continue;

      const doc = envelope.document;
      if (queryTokens.length) {
        const haystack = [
          doc.title,
          doc.docCategory,
          doc.relativePath,
          doc.bodyMarkdown,
          ...doc.outlineFlat,
          ...doc.sections.map(section => section.heading),
        ]
          .join(' ')
          .toLowerCase();
        if (!queryTokens.some(token => haystack.includes(token))) continue;
      }

      if (!byId.has(doc.documentId)) {
        byId.set(doc.documentId, doc);
      }
    }

    return [...byId.values()].slice(0, limit);
  });
}
