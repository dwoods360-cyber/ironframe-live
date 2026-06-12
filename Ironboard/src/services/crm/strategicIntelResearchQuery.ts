import type {
  IndustryProfileResearchContext,
  StrategicIntelResearchManifest,
} from '../../types/strategicIntelResearch.js';
import { fetchLatestStrategicIntelManifest } from './strategicIntelIngress.js';

function normalizeIndustryKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, ' ');
}

function industryKeysMatch(manifestKey: string, uiLabel: string): boolean {
  const a = normalizeIndustryKey(manifestKey);
  const b = normalizeIndustryKey(uiLabel);
  if (a === b) return true;
  if (b === 'public sector' && a === 'public sector') return true;
  if (b.startsWith('state') && a === 'public sector') return true;
  if (b.startsWith('federal') && a === 'public sector') return true;
  return false;
}

function collectProfiles(manifest: StrategicIntelResearchManifest, uiIndustry: string) {
  const matches: Array<{
    profile: StrategicIntelResearchManifest['documents'][number]['industryProfiles'][number];
    documentTitle: string;
  }> = [];

  for (const doc of manifest.documents) {
    for (const profile of doc.industryProfiles) {
      if (industryKeysMatch(profile.industryKey, uiIndustry)) {
        matches.push({ profile, documentTitle: doc.title });
      }
    }
  }
  return matches;
}

export async function getIndustryProfileResearchContext(
  tenantId: unknown,
  uiIndustry: string,
): Promise<IndustryProfileResearchContext | null> {
  const manifest = await fetchLatestStrategicIntelManifest(tenantId);
  if (!manifest) return null;

  const matches = collectProfiles(manifest, uiIndustry);
  if (matches.length === 0) return null;

  const primary = matches[0].profile;
  const ragExcerpts = manifest.ragChunks
    .filter(chunk =>
      chunk.tags.some(tag => tag.includes('industry') || tag.includes('continuous-audit')),
    )
    .slice(0, 4)
    .map(chunk => chunk.text);

  return {
    manifestId: manifest.manifestId,
    ingestedAt: manifest.generatedAt,
    industryKey: primary.industryKey,
    displayName: primary.displayName,
    peerAleBaselineCents: primary.peerAleBaselineCents,
    regulatoryPressureIndex: primary.regulatoryPressureIndex,
    saasDisruptionExposureIndex: primary.saasDisruptionExposureIndex,
    continuousAuditPriority: primary.continuousAuditPriority,
    narrativeSummary: primary.narrativeSummary,
    sourceDocuments: matches.map(m => m.documentTitle),
    ragExcerpts,
  };
}

export function buildBoardReportStrategicIntelSnippet(
  manifest: StrategicIntelResearchManifest | null,
): string {
  if (!manifest) {
    return 'Strategic Intel Update corpus not yet ingested — LP-10/LP-16 board sections use live readiness only.';
  }

  const workday = manifest.documents.find(
    d => d.sourceType === 'GRC_PROFESSIONAL_WORKDAY_ANALYSIS',
  );
  const saas = manifest.documents.find(d => d.sourceType === 'SAAS_DISRUPTION_MEMORANDUM');
  const ironintelChunks = manifest.ragChunks
    .filter(c => c.priorityAgents.includes('Ironintel'))
    .map(c => c.text)
    .slice(0, 2);
  const ironscribeChunks = manifest.ragChunks
    .filter(c => c.priorityAgents.includes('Ironscribe'))
    .map(c => c.text)
    .slice(0, 2);

  return [
    `STRATEGIC INTEL UPDATE (${manifest.manifestId}) — Infasys Knowledge Base`,
    workday ? `Workday analysis: ${workday.executiveSummary}` : '',
    saas ? `SaaS disruption: ${saas.executiveSummary}` : '',
    'Ironintel (Agent 11) priority excerpts:',
    ...ironintelChunks.map(line => `- ${line}`),
    'Ironscribe (Agent 05) LP-10/LP-16 priority excerpts:',
    ...ironscribeChunks.map(line => `- ${line}`),
  ]
    .filter(Boolean)
    .join('\n');
}
