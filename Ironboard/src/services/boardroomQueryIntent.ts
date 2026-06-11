/** Terms that indicate the user wants internal flywheel / CRM data. */
const WORKSPACE_QUERY_TERMS = [
  'prospect',
  'prospects',
  'flywheel',
  'outreach',
  'pipeline',
  'icp score',
  'harvest',
  'outreach history',
  'flywheel log',
  'active lead',
  'active leads',
  'our clients',
  'querylocalworkspace',
] as const;

/** Signals that the user needs live or global (non-CRM) information. */
const EXTERNAL_INFO_TERMS = [
  'time',
  'timezone',
  'weather',
  'news',
  'latest',
  'current',
  'today',
  'regulation',
  'compliance',
  'fca',
  'market intel',
  'broken',
  'who is',
  'what is',
  'where is',
  'when is',
  'how much',
  'world',
  'global',
  'international',
  'around the world',
] as const;

export function needsExternalInfo(query: string): boolean {
  const q = query.toLowerCase();
  return EXTERNAL_INFO_TERMS.some(term => q.includes(term));
}

export function shouldPrefetchProspects(query: string): boolean {
  const q = query.toLowerCase();
  if (WORKSPACE_QUERY_TERMS.some(term => q.includes(term))) return true;
  if (/\b(our|active|local|my)\b[\s\S]{0,40}\b(london|singapore)\b/.test(q)) return true;
  if (/\b(london|singapore)\b[\s\S]{0,40}\b(prospect|prospects|pipeline|lead|leads|flywheel|outreach|harvest|icp)\b/.test(q)) {
    return true;
  }
  return false;
}

/** Prefetch live web grounding unless the query is strictly internal CRM data. */
export function shouldPrefetchWeb(query: string): boolean {
  return !isWorkspaceOnlyQuery(query);
}

export function isWorkspaceOnlyQuery(query: string): boolean {
  return shouldPrefetchProspects(query) && !needsExternalInfo(query);
}

export function inferRegionFromQuery(query: string, activeHub: string): string | undefined {
  const q = query.toLowerCase();
  if (q.includes('singapore')) return 'Singapore';
  if (q.includes('london')) return 'London';
  const hubKey = String(activeHub ?? '').trim().toUpperCase();
  if (hubKey === 'LONDON') return 'London';
  if (hubKey === 'SINGAPORE') return 'Singapore';
  return undefined;
}
