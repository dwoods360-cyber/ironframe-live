import { z } from 'zod';

export const STRATEGIC_INTEL_UPDATE_CLASSIFICATION = 'Strategic Intel Update' as const;

const centsStringSchema = z.string().regex(/^\d+$/, 'risk metrics must be whole-cent integer strings');

export const industryProfileSchema = z.object({
  industryKey: z.string().min(1),
  displayName: z.string().min(1),
  peerAleBaselineCents: centsStringSchema,
  regulatoryPressureIndex: z.number().int().min(0).max(100),
  saasDisruptionExposureIndex: z.number().int().min(0).max(100),
  continuousAuditPriority: z.enum(['CRITICAL', 'HIGH', 'ELEVATED', 'STANDARD']),
  narrativeSummary: z.string().min(1),
});

export const researchDocumentSchema = z.object({
  documentId: z.string().min(1),
  title: z.string().min(1),
  sourceType: z.enum(['GRC_PROFESSIONAL_WORKDAY_ANALYSIS', 'SAAS_DISRUPTION_MEMORANDUM']),
  executiveSummary: z.string().min(1),
  keyFindings: z.array(z.string().min(1)).min(1),
  industryProfiles: z.array(industryProfileSchema).min(1),
  riskMetricsCents: z.object({
    medianAnnualGrcProgramCents: centsStringSchema,
    medianAuditRemediationLagCents: centsStringSchema,
    saasConsolidationSavingsOpportunityCents: centsStringSchema,
    boardReportingOverheadCents: centsStringSchema,
  }),
});

export const ragChunkSchema = z.object({
  chunkId: z.string().min(1),
  documentId: z.string().min(1),
  section: z.string().min(1),
  text: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
  priorityAgents: z.array(z.enum(['Ironintel', 'Ironscribe', 'Ironwatch'])).min(1),
});

export const strategicIntelResearchManifestSchema = z.object({
  manifestVersion: z.literal('1.0.0'),
  classification: z.literal(STRATEGIC_INTEL_UPDATE_CLASSIFICATION),
  sourceCorpus: z.literal('Infasys Knowledge Base'),
  manifestId: z.string().min(1),
  generatedAt: z.string().datetime(),
  documents: z.array(researchDocumentSchema).length(2),
  ragChunks: z.array(ragChunkSchema).min(4),
});

export type IndustryProfileResearch = z.infer<typeof industryProfileSchema>;
export type ResearchDocument = z.infer<typeof researchDocumentSchema>;
export type RagChunk = z.infer<typeof ragChunkSchema>;
export type StrategicIntelResearchManifest = z.infer<typeof strategicIntelResearchManifestSchema>;

export type StrategicIntelInteractionEnvelope = {
  classification: typeof STRATEGIC_INTEL_UPDATE_CLASSIFICATION;
  manifestId: string;
  manifestVersion: '1.0.0';
  sanitizedBy: 'Irongate-Agent-14';
  ingestedAt: string;
  manifest: StrategicIntelResearchManifest;
};

export type IndustryProfileResearchContext = {
  manifestId: string;
  ingestedAt: string;
  industryKey: string;
  displayName: string;
  peerAleBaselineCents: string;
  regulatoryPressureIndex: number;
  saasDisruptionExposureIndex: number;
  continuousAuditPriority: string;
  narrativeSummary: string;
  sourceDocuments: string[];
  ragExcerpts: string[];
};
