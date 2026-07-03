import { z } from 'zod';

const MAX_CANDIDATES_PER_RUN = 5;

export const discoveryCandidateSchema = z.object({
  companyName: z.string().trim().min(1),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/),
  websiteUrl: z.string().url().optional(),
  employeeCount: z.coerce.number().int().positive().max(15_000),
  compliancePressure: z.enum(['SOC2', 'ISO27001']),
  recentFunding: z.enum(['SEED', 'SERIES_A', 'NONE']).optional(),
  hasComplianceJob: z.boolean().optional(),
  securityStanceSummary: z.string().trim().min(1).optional(),
});

export const discoveryPayloadSchema = z.object({
  prospects: z.array(discoveryCandidateSchema).min(1).max(MAX_CANDIDATES_PER_RUN),
});

export type DiscoveryCandidate = z.infer<typeof discoveryCandidateSchema>;

function readString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function readNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number.parseInt(value.replace(/,/g, ''), 10);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function readBoolean(record: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return undefined;
}

/** Map sector-native framework labels from web search to stored SOC2 / ISO27001 pressure. */
export function coerceCompliancePressure(raw: string | undefined): 'SOC2' | 'ISO27001' | undefined {
  if (!raw?.trim()) return undefined;
  const upper = raw.trim().toUpperCase();
  if (upper.includes('SOC2') || upper.includes('SOC 2') || upper.includes('SOC-2')) return 'SOC2';
  if (upper.includes('ISO27001') || upper.includes('ISO 27001')) return 'ISO27001';
  if (
    /\b(FFIEC|GLBA|BSA|NERC|CIP|PCI|FEDRAMP|SOX|GDPR|PSD2|DORA|MAS TRM)\b/.test(upper)
  ) {
    return 'SOC2';
  }
  if (/\b(HIPAA|HITRUST|HITECH|PHI|HITECH)\b/.test(upper)) return 'ISO27001';
  if (upper.includes('ISO')) return 'ISO27001';
  return undefined;
}

export function coerceRecentFunding(raw: string | undefined): 'SEED' | 'SERIES_A' | 'NONE' | undefined {
  if (!raw?.trim()) return undefined;
  const upper = raw.trim().toUpperCase();
  if (upper === 'NONE' || upper === 'N/A' || upper === 'UNKNOWN') return 'NONE';
  if (upper === 'SEED' || upper.includes('PRE-SEED')) return 'SEED';
  if (upper.startsWith('SERIES') || upper === 'SERIES_A' || upper === 'SERIES_B' || upper === 'SERIES_C') {
    return 'SERIES_A';
  }
  return undefined;
}

function stripDomainFromUrl(value: string): string | undefined {
  try {
    const host = new URL(value.startsWith('http') ? value : `https://${value}`).hostname;
    return host.replace(/^www\./i, '').toLowerCase();
  } catch {
    return undefined;
  }
}

/** Normalize Gemini / web-search field aliases into canonical discovery candidate shape. */
export function normalizeDiscoveryCandidate(raw: unknown): DiscoveryCandidate | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const companyName = readString(record, [
    'companyName',
    'legalCompanyName',
    'legal_company_name',
    'Legal company name',
    'name',
  ]);
  let domain = readString(record, [
    'domain',
    'primaryWebsiteDomain',
    'primaryWebsiteDomainOnly',
    'primary_website_domain',
    'Primary website domain only',
    'websiteDomain',
  ]);
  const websiteUrl = readString(record, [
    'websiteUrl',
    'fullWebsiteURL',
    'fullWebsiteUrl',
    'Full website URL',
    'url',
  ]);
  if (!domain && websiteUrl) {
    domain = stripDomainFromUrl(websiteUrl);
  }
  const employeeCount = readNumber(record, [
    'employeeCount',
    'estimatedEmployeeCount',
    'Estimated employee count',
    'employees',
  ]);
  const compliancePressure = coerceCompliancePressure(
    readString(record, ['compliancePressure', 'compliance_pressure', 'framework']),
  );
  const recentFunding = coerceRecentFunding(
    readString(record, ['recentFunding', 'recent_funding', 'funding']),
  );
  const hasComplianceJob = readBoolean(record, [
    'hasComplianceJob',
    'has_compliance_job',
    'complianceHiring',
  ]);
  const securityStanceSummary = readString(record, [
    'securityStanceSummary',
    'security_stance_summary',
    'securitySummary',
  ]);

  if (!companyName || !domain || employeeCount == null || !compliancePressure) return null;

  const parsed = discoveryCandidateSchema.safeParse({
    companyName,
    domain,
    ...(websiteUrl ? { websiteUrl } : {}),
    employeeCount,
    compliancePressure,
    recentFunding: recentFunding ?? 'NONE',
    ...(hasComplianceJob != null ? { hasComplianceJob } : {}),
    ...(securityStanceSummary ? { securityStanceSummary } : {}),
  });
  return parsed.success ? parsed.data : null;
}

export function parseDiscoveryProspectsFromModelText(text: string): {
  candidates: DiscoveryCandidate[];
  parseErrors: string[];
} {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  let raw: unknown;
  try {
    const slice = fenced ?? text;
    const start = slice.indexOf('{');
    const end = slice.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('No JSON object found.');
    raw = JSON.parse(slice.slice(start, end + 1));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { candidates: [], parseErrors: [message] };
  }

  const prospectsRaw = Array.isArray(raw)
    ? raw
    : raw != null && typeof raw === 'object' && 'prospects' in (raw as object)
      ? (raw as { prospects: unknown }).prospects
      : null;

  if (!Array.isArray(prospectsRaw)) {
    return { candidates: [], parseErrors: ['Response JSON missing prospects array.'] };
  }

  const candidates: DiscoveryCandidate[] = [];
  const parseErrors: string[] = [];
  for (const [index, item] of prospectsRaw.entries()) {
    const normalized = normalizeDiscoveryCandidate(item);
    if (normalized) {
      candidates.push(normalized);
      continue;
    }
    parseErrors.push(`prospect[${index}] failed normalization`);
  }
  return { candidates: candidates.slice(0, MAX_CANDIDATES_PER_RUN), parseErrors };
}
