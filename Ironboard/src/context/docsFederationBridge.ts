import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

export interface FederatedDocsPayload {
  tasContent: string;
  technicalRequirements: string;
  hubIndex: string;
  hasLoadedAllDocs: boolean;
  metadataCount: number;
}

/** Resolve repo-root docs/ whether IronBoard runs from Ironboard/ or monorepo root. */
function resolvePlatformDocsDir(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(moduleDir, '../../../docs'),
    path.resolve(process.cwd(), 'docs'),
    path.resolve(process.cwd(), '../docs'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'TAS.md'))) return dir;
  }
  return candidates[0];
}

function readDocFile(filePath: string, missingLabel: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Platform documentation federation bridge.
 * Reads authoritative markdown from core /docs via native fs — no vector DB, no Prisma.
 * Pre-load at startup; read-only; out-of-band from production data plane.
 */
export function compilePlatformDocumentation(): FederatedDocsPayload {
  console.log('[IRONBOARD DOCS BRIDGE] Initiating local repository scan...');

  const rootDocsDir = resolvePlatformDocsDir();
  const tasFilePath = path.join(rootDocsDir, 'TAS.md');
  const techReqFilePath = path.join(rootDocsDir, 'stakeholders', 'technical-requirements.md');
  const hubFilePath = path.join(rootDocsDir, 'hub.md');

  let tasContent =
    'Authoritative Architecture specification (TAS.md) file not found in directory path.';
  let technicalRequirements =
    'Authoritative Technical Requirements specification file not found in directory path.';
  let hubIndex = 'Documentation hub index (hub.md) file not found in directory path.';
  let fileCount = 0;

  try {
    const tas = readDocFile(tasFilePath, 'TAS.md');
    if (tas) {
      tasContent = tas;
      fileCount++;
      console.log('[IRONBOARD DOCS BRIDGE] Successfully loaded core platform TAS.md specs.');
    }

    const techReq = readDocFile(techReqFilePath, 'technical-requirements.md');
    if (techReq) {
      technicalRequirements = techReq;
      fileCount++;
      console.log('[IRONBOARD DOCS BRIDGE] Successfully loaded stakeholder technical requirements.');
    }

    const hub = readDocFile(hubFilePath, 'hub.md');
    if (hub) {
      hubIndex = hub;
      fileCount++;
      console.log('[IRONBOARD DOCS BRIDGE] Successfully loaded documentation hub index.');
    }
  } catch (error) {
    console.error('[IRONBOARD DOCS BRIDGE CRITICAL LACK OF ACCESS]:', error);
  }

  return {
    tasContent,
    technicalRequirements,
    hubIndex,
    hasLoadedAllDocs: fileCount >= 2,
    metadataCount: fileCount,
  };
}

/** Inline block for Gemini system instructions (static federation — no live DB). */
export function formatFederatedDocsContext(payload: FederatedDocsPayload): string {
  return [
    'AUTHORITATIVE CORE ARCHITECTURE COMPLIANCE SPECIFICATIONS (docs/TAS.md):',
    payload.tasContent,
    '',
    'STAKEHOLDER TECHNICAL SPECIFICATIONS (docs/stakeholders/technical-requirements.md):',
    payload.technicalRequirements,
    '',
    'DOCUMENTATION HUB INDEX (docs/hub.md):',
    payload.hubIndex,
  ].join('\n');
}
