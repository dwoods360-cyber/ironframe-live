import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateStrategicIntelManifest } from './strategicIntelSanitizer.js';
import type { StrategicIntelResearchManifest } from '../../types/strategicIntelResearch.js';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

export function resolveGrcProfessionalManifestPath(): string {
  return path.resolve(MODULE_DIR, '../../knowledge/grcProfessionalResearch.manifest.json');
}

export function loadGrcProfessionalManifestFromDisk(): StrategicIntelResearchManifest {
  const manifestPath = resolveGrcProfessionalManifestPath();
  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as unknown;
  return validateStrategicIntelManifest(raw);
}

export function loadGrcProfessionalManifestOptional(): StrategicIntelResearchManifest | null {
  try {
    return loadGrcProfessionalManifestFromDisk();
  } catch {
    return null;
  }
}
