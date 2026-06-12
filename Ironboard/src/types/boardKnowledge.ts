import { z } from 'zod';

export const BOARD_KNOWLEDGE_METRIC_TAG = 'board_knowledge' as const;
export const DOCS_MATRIX_CLASSIFICATION = 'Corporate Documentation Matrix Update' as const;
export const DOCS_INGESTED_UNITS_METRIC = 'docsIngestedUnits' as const;

/** Top-level matrix folders under /docs/ — doc_category derives from folder name. */
export const DOCS_MATRIX_CATEGORIES = [
  'stakeholder-deck',
  'external-relations',
  'end-user-manuals',
  'operations-support',
  'sales-enablement',
  'marketing-strategy',
  'training-academy',
] as const;

export type DocsMatrixCategory = (typeof DOCS_MATRIX_CATEGORIES)[number];

export const ironscribeOutlineItemSchema = z.object({
  index: z.number().int().positive(),
  text: z.string().min(1),
});

export const ironscribeSectionSchema = z.object({
  heading: z.string().min(1),
  level: z.number().int().min(2).max(4),
  body: z.string(),
  outlineItems: z.array(ironscribeOutlineItemSchema),
});

export const ironscribeParsedDocumentSchema = z.object({
  documentId: z.string().min(1),
  title: z.string().min(1),
  relativePath: z.string().min(1),
  docCategory: z.enum(DOCS_MATRIX_CATEGORIES),
  fileName: z.string().min(1),
  metadata: z.record(z.string(), z.string()),
  sections: z.array(ironscribeSectionSchema).min(1),
  bodyMarkdown: z.string().min(1),
  outlineFlat: z.array(z.string()),
  parsedBy: z.literal('Ironscribe-Agent-05'),
  parsedAt: z.string().datetime(),
});

export type IronscribeParsedDocument = z.infer<typeof ironscribeParsedDocumentSchema>;

export type BoardKnowledgeCrmEnvelope = {
  metricTag: typeof BOARD_KNOWLEDGE_METRIC_TAG;
  classification: typeof DOCS_MATRIX_CLASSIFICATION;
  sanitizedBy: 'Irongate-Agent-14';
  ingestedAt: string;
  tenantId: string;
  docCategory: DocsMatrixCategory;
  document: IronscribeParsedDocument;
};

export type DocsMatrixTelemetryEnvelope = {
  metricTag: typeof BOARD_KNOWLEDGE_METRIC_TAG;
  subMetric: typeof DOCS_INGESTED_UNITS_METRIC;
  classification: 'Docs Matrix Ingestion Telemetry';
  sanitizedBy: 'Irongate-Agent-14';
  ingestedAt: string;
  traceId: string;
  tenantId: string;
  statisticsUnits: {
    docsIngestedUnits: string;
    docsSkippedDuplicateUnits: string;
    pipelineDurationMsUnits: string;
  };
  categories: DocsMatrixCategory[];
};

export type DocsMatrixIngressResult = {
  traceId: string;
  docsIngestedUnits: bigint;
  docsSkippedDuplicateUnits: bigint;
  ingestedDocumentIds: string[];
  skippedDocumentIds: string[];
  telemetryInteractionId: string | null;
  pipelineDurationMsUnits: bigint;
};
