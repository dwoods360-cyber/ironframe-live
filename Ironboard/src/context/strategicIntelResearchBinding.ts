import type { StrategicIntelResearchManifest } from '../types/strategicIntelResearch.js';
import { loadGrcProfessionalManifestOptional } from '../services/crm/strategicIntelManifestLoader.js';

const BOARD_REPORT_AGENTS = {
  ironintel: { index: 11, name: 'Ironintel', boardSections: ['LP-10', 'LP-16'] },
  ironscribe: { index: 5, name: 'Ironscribe', boardSections: ['LP-10', 'LP-16'] },
} as const;

function formatRagPriorityBlock(manifest: StrategicIntelResearchManifest): string {
  const lines: string[] = [
    '=== STRATEGIC INTEL RESEARCH BINDING (Infasys KB — Board Report Priority) ===',
    '',
    'When generating Board Reports (LP-10 config churn, LP-16 meta-audit), Ironintel and Ironscribe MUST prioritize this discovery corpus over generic theory.',
    '',
    `Manifest: ${manifest.manifestId} (${manifest.classification})`,
    '',
  ];

  for (const doc of manifest.documents) {
    lines.push(`DOCUMENT: ${doc.title} [${doc.sourceType}]`);
    lines.push(doc.executiveSummary);
    lines.push('Key findings:');
    for (const finding of doc.keyFindings) {
      lines.push(`- ${finding}`);
    }
    lines.push('');
  }

  lines.push('RAG CHUNKS (retrieval priority):');
  for (const chunk of manifest.ragChunks) {
    lines.push(
      `- [${chunk.chunkId}] agents=${chunk.priorityAgents.join('/')} tags=${chunk.tags.join(',')}`,
    );
    lines.push(`  ${chunk.text}`);
  }

  lines.push('');
  lines.push('AGENT BINDING:');
  lines.push(
    `- ${BOARD_REPORT_AGENTS.ironintel.name} (Agent ${BOARD_REPORT_AGENTS.ironintel.index}): OSINT correlation, Industry Profile, SaaS disruption indices — sections ${BOARD_REPORT_AGENTS.ironintel.boardSections.join(', ')}.`,
  );
  lines.push(
    `- ${BOARD_REPORT_AGENTS.ironscribe.name} (Agent ${BOARD_REPORT_AGENTS.ironscribe.index}): Immutable export hashes, audit trail citations — sections ${BOARD_REPORT_AGENTS.ironscribe.boardSections.join(', ')}.`,
  );
  lines.push('');
  lines.push('FINANCIAL INTEGRITY: All risk metrics from this corpus are BIGINT whole-cent integers — never emit floats or decimals in ALE rollups.');

  return lines.join('\n');
}

export function buildStrategicIntelResearchBinding(
  manifest?: StrategicIntelResearchManifest | null,
): string {
  const resolved = manifest ?? loadGrcProfessionalManifestOptional();
  if (!resolved) {
    return [
      '=== STRATEGIC INTEL RESEARCH BINDING ===',
      'GRC Professional / SaaS Disruption corpus pending ingress. Board agents defer to live CRM Strategic Intel Update when available.',
    ].join('\n');
  }
  return formatRagPriorityBlock(resolved);
}

export function buildIronintelBoardReportDirective(manifest?: StrategicIntelResearchManifest | null): string {
  const binding = buildStrategicIntelResearchBinding(manifest);
  return `${binding}\n\nIRONINTEL DIRECTIVE: Lead LP-10 strategic narrative with Industry Profile peer ALE baselines (integer cents) and continuous-audit priority from Infasys KB.`;
}

export function buildIronscribeBoardReportDirective(manifest?: StrategicIntelResearchManifest | null): string {
  const binding = buildStrategicIntelResearchBinding(manifest);
  return `${binding}\n\nIRONSCRIBE DIRECTIVE: LP-16 meta-audit rows must cite immutable export hashes; reject float ALE in board packet tables.`;
}
