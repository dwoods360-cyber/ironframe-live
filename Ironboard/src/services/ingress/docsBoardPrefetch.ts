import {
  BOARD_KNOWLEDGE_METRIC_TAG,
  DOCS_INGESTED_UNITS_METRIC,
  type IronscribeParsedDocument,
} from '../../types/boardKnowledge.js';
import { fetchBoardKnowledgeDocuments } from '../crm/docsMatrixIngress.js';
import { resolveBoardOrgTenantId } from '../crm/strategicIntelIngress.js';
import { resolveDocsQueryIntent } from './docsQueryIntent.js';

export type DocsBoardPrefetchResult = {
  ok: boolean;
  enrichment: string;
  documents: IronscribeParsedDocument[];
  docsMatchedUnits: bigint;
};

function formatDocumentBlock(doc: IronscribeParsedDocument): string {
  const sectionSummaries = doc.sections
    .slice(0, 6)
    .map(section => {
      const outline =
        section.outlineItems.length > 0
          ? section.outlineItems.map(item => `${item.index}. ${item.text}`).join('; ')
          : section.body.slice(0, 280).replace(/\s+/g, ' ').trim();
      return `### ${section.heading}\n${outline}`;
    })
    .join('\n\n');

  return [
    `── ${doc.title} [${doc.docCategory}] (${doc.relativePath}) ──`,
    doc.metadata['Status'] ? `Status: ${doc.metadata['Status']}` : '',
    doc.metadata['Document Type'] ? `Type: ${doc.metadata['Document Type']}` : '',
    sectionSummaries,
    doc.bodyMarkdown.length > 1200
      ? `\nFull body excerpt:\n${doc.bodyMarkdown.slice(0, 1200)}…`
      : `\nFull body:\n${doc.bodyMarkdown}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildBoardKnowledgeEnrichment(
  documents: IronscribeParsedDocument[],
  traceHint?: string,
): string {
  if (!documents.length) {
    return [
      'CORPORATE DOCUMENTATION MATRIX (board_knowledge) — subsystem verified; no matching staged documents retrieved for this query.',
      'Do not answer with generic theory — state that the matrix category exists but returned zero hydrated rows for this intent.',
    ].join('\n');
  }

  return [
    'CORPORATE DOCUMENTATION MATRIX GROUND TRUTH (mandatory — cite staged /docs/ matrix content; never generic fallback prose):',
    `metricTag=${BOARD_KNOWLEDGE_METRIC_TAG}`,
    traceHint ? `prefetchTrace=${traceHint}` : '',
    `docsMatchedUnits=${BigInt(documents.length).toString()}`,
    `telemetryMetric=${DOCS_INGESTED_UNITS_METRIC}`,
    '',
    ...documents.map(formatDocumentBlock),
  ]
    .filter(Boolean)
    .join('\n');
}

export async function prefetchCorporateDocsForBoardQuery(
  query: string,
  tenantIdRaw?: string,
): Promise<DocsBoardPrefetchResult> {
  const intent = resolveDocsQueryIntent(query);
  if (!intent.matchesCorporateDocs) {
    return { ok: false, enrichment: '', documents: [], docsMatchedUnits: 0n };
  }

  const tenantId = tenantIdRaw?.trim() || resolveBoardOrgTenantId();

  try {
    const documents = await fetchBoardKnowledgeDocuments(tenantId, {
      docCategory: intent.docCategory ?? undefined,
      query,
      limit: intent.docCategory ? 8 : 6,
    });

    return {
      ok: documents.length > 0,
      enrichment: buildBoardKnowledgeEnrichment(documents, intent.titleHint ?? undefined),
      documents,
      docsMatchedUnits: BigInt(documents.length),
    };
  } catch (err) {
    console.warn('[IRONBOARD DOCS PREFETCH]', err);
    return {
      ok: false,
      enrichment: [
        'CORPORATE DOCUMENTATION MATRIX PREFETCH FAILED — report ingress/read error; do not substitute generic Product Vision or Sales Enablement prose.',
        err instanceof Error ? err.message : String(err),
      ].join('\n'),
      documents: [],
      docsMatchedUnits: 0n,
    };
  }
}
