/**
 * Public broadcast mirror — programmatic boundary between engine room and
 * brief.ironframegrc.com. Internal metadata is redacted; industry intelligence is permitted.
 */

export type PublicDeclassificationIssue = {
  code: string;
  message: string;
  severity: "error" | "warn";
};

export type PublicBriefingProfile = "governance-triad" | "emerging-threats-notice";

type DeclassificationRule = {
  code: string;
  pattern: RegExp;
  message: string;
  /** When set, rule applies only to these profiles. */
  profiles?: readonly PublicBriefingProfile[];
  /** When set, rule is skipped for these profiles. */
  skipProfiles?: readonly PublicBriefingProfile[];
};

const ALL_PROFILES: readonly PublicBriefingProfile[] = [
  "governance-triad",
  "emerging-threats-notice",
];

/** Patterns that must not appear in public-facing briefing bodies (all profiles). */
export const PUBLIC_BRIEFING_INTERNAL_REFERENCE_RULES: readonly DeclassificationRule[] = [
  {
    code: "WINDOWS_FILE_PATH",
    pattern: /[A-Z]:\\(?:Users|Program Files|Windows)[^\s`]*/i,
    message: "Remove local Windows file paths from public copy.",
  },
  {
    code: "UNIX_REPO_PATH",
    pattern: /\b(?:app|Ironboard|lib|prisma|scripts|config)\/(?:\([^)]+\)|[a-z0-9_./[\]-]+)/i,
    message: "Remove repository source paths from public copy.",
  },
  {
    code: "SOURCE_FILE_EXTENSION",
    pattern: /\b[\w./-]+\.(?:tsx?|jsx?|mjs|cjs|ps1|sh)\b/i,
    message: "Remove source file names and extensions from public copy.",
  },
  {
    code: "INTERNAL_API_ROUTE",
    pattern: /\/api\/[a-z0-9/_-]+/i,
    message: "Remove internal API routes — cite external regulator or public Ironframe URLs only.",
  },
  {
    code: "TELEMETRY_JSON_PATH",
    pattern: /\bfinancials\.display\b/i,
    message: "Remove internal telemetry JSON paths from public copy.",
  },
  {
    code: "INTERNAL_DOCS_PATH",
    pattern: /\bdocs\/(?:qa|briefing-queue|operations-support|published-briefings|TAS\.md)\b/i,
    message: "Remove internal documentation paths from public copy.",
  },
  {
    code: "DATABASE_ARTIFACT",
    pattern: /\b(?:prisma|supabase|governance_frame_triad_snapshots|published_briefings|cron_job_artifacts|market_prospects)\b/i,
    message: "Remove internal database or ORM references from public copy.",
  },
  {
    code: "ENGINEERING_METRIC_FIELD",
    pattern: /\b(?:activeExposureCents|tenantId|requiresImmediatePromotion|rawBaselineCents)\b/i,
    message: "Remove raw engineering metric field names from public copy.",
  },
  {
    code: "GIT_COMMIT_HASH",
    pattern: /\b(?:commit|revision|hash)\s+[0-9a-f]{7,40}\b/i,
    message: "Remove Git commit hash references from public copy.",
  },
  {
    code: "TENANT_UUID_LITERAL",
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
    message: "Remove raw tenant or asset UUID literals from public copy.",
  },
  {
    code: "SYNTHETIC_DEMO_TENANT",
    pattern: /\b(?:medshield|vaultbank|gridcore)\b/i,
    message:
      "Remove engineering demo tenant slugs — use industry segments (e.g., regulated healthcare, regional banking).",
  },
  {
    code: "SYNTHETIC_DEMO_MARKER",
    pattern: /\bSYNTHETIC_DEMO_SEED\b/i,
    message: "Remove internal demo seed classifications from public copy.",
  },
  {
    code: "INTERNAL_AGENT_RECEIPT",
    pattern: /\b(?:Ironintel|Irontally|Ironboard|Ironcast|Irongate|Ironwatch|Ironlogic)\b/i,
    message: "Remove internal agent names from public copy — use Ironframe Governance Frame voice only.",
  },
  {
    code: "INTERNAL_RUNTIME_PORT",
    pattern: /\bport\s*(?:3000|8082)\b/i,
    message: "Remove internal service port references from public copy.",
  },
  {
    code: "ENV_SECRET_REFERENCE",
    pattern: /\bIRONFRAME_[A-Z0-9_]+\b/,
    message: "Remove environment variable names from public copy.",
  },
  {
    code: "QUARANTINE_WORKFLOW",
    pattern: /\b(?:briefing-queue|promote-briefing-draft|daily_code_diff)\b/i,
    message: "Remove internal editorial workflow markers from public copy.",
  },
  {
    code: "RAW_CENT_INTEGER",
    pattern: /\b\d{7,}\s*cents?\b/i,
    message: "Use formatted USD strings only — never raw cent integers in public copy.",
  },
  {
    code: "CVE_LITERAL",
    pattern: /\bCVE-\d{4}-\d+/i,
    message: "Translate CVE identifiers into perimeter-classified threat descriptions.",
    profiles: ["governance-triad"],
  },
] as const;

export const PUBLIC_BROADCAST_SANITIZATION_MANDATE = `
[PUBLIC BROADCAST MIRROR — NON-NEGOTIABLE]
Output is a sanitized broadcast for brief.ironframegrc.com subscribers — never a window into the engine room.

FORBIDDEN (strictly redact — never output):
- File system paths (Windows or Unix), repository trees, script names, .ts/.tsx extensions
- Database UUIDs, tenant IDs, Prisma/Supabase references, engineering field names (activeExposureCents)
- Internal APIs, telemetry JSON paths, agent codenames, environment variables, Git commit hashes
- Demo tenant slugs (medshield, vaultbank, gridcore)

PERMITTED (GTM intelligence persona):
- Globally recognized CVE identifiers (Emerging Threats Notice only)
- Malware/ransomware families, threat actor tactics, regulator frameworks (FFIEC, HIPAA, NERC, CISA BOD)
- Formatted USD, industry segments, actionable institutional mitigation guidance
- External URLs (CISA KEV, NIST, https://brief.ironframegrc.com)
- One soft Ironframe solution bridge when mapping is genuine (Mitigation section only)
`.trim();

export const PUBLIC_BRIEFING_DECLASSIFICATION_MANDATE = `
[PUBLIC BRIEFING DE-CLASSIFICATION — MANDATORY]
Audience: prospects, design partners, and subscribers at brief.ironframegrc.com — not engineers or operators.
1. Never reference internal APIs, repository paths, database tables, agent names, tenant UUIDs, demo tenant slugs, or editorial workflow paths.
2. Governance Frame triads: no raw CVE tokens — use perimeter descriptions. Emerging Threats Notices: CVE identifiers permitted.
3. Section V citations must use external regulator primary sources and https://brief.ironframegrc.com only.
4. Describe regulated industries generically — never engineering fixtures as company names.
`.trim();

function bodyWithoutFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---")) return markdown;
  const end = markdown.indexOf("---", 3);
  if (end === -1) return markdown;
  return markdown.slice(end + 3);
}

function parseFrontmatterField(markdown: string, key: string): string | null {
  const match = markdown.match(new RegExp(`^${key}:\\s*(.+)$`, "im"));
  if (!match?.[1]) return null;
  return match[1].trim().replace(/^["']|["']$/g, "");
}

export function resolvePublicBriefingProfile(
  markdown: string,
  filename?: string,
): PublicBriefingProfile {
  const classification = parseFrontmatterField(markdown, "classification")?.toLowerCase() ?? "";
  if (classification.includes("emerging threats")) {
    return "emerging-threats-notice";
  }
  const lowerFile = filename?.toLowerCase() ?? "";
  if (lowerFile.includes("emerging-threats")) {
    return "emerging-threats-notice";
  }
  return "governance-triad";
}

function ruleApplies(rule: DeclassificationRule, profile: PublicBriefingProfile): boolean {
  if (rule.skipProfiles?.includes(profile)) return false;
  if (rule.profiles && !rule.profiles.includes(profile)) return false;
  return true;
}

export function scanPublicBriefingDeclassification(
  markdown: string,
  options?: { profile?: PublicBriefingProfile; filename?: string },
): PublicDeclassificationIssue[] {
  const profile = options?.profile ?? resolvePublicBriefingProfile(markdown, options?.filename);
  const body = bodyWithoutFrontmatter(markdown);
  const issues: PublicDeclassificationIssue[] = [];

  for (const rule of PUBLIC_BRIEFING_INTERNAL_REFERENCE_RULES) {
    if (!ruleApplies(rule, profile)) continue;
    if (rule.pattern.test(body)) {
      issues.push({
        code: rule.code,
        message: rule.message,
        severity: "error",
      });
    }
  }

  return issues;
}

export function assertPublicBroadcastMirror(
  markdown: string,
  options?: { profile?: PublicBriefingProfile; filename?: string; label?: string },
): void {
  const issues = scanPublicBriefingDeclassification(markdown, options);
  if (issues.length === 0) return;
  const label = options?.label ?? "public draft";
  const summary = issues.map((i) => `${i.code}: ${i.message}`).join("; ");
  throw new Error(`Public broadcast mirror violation (${label}): ${summary}`);
}

export function validatePublicBriefingDeclassification(
  markdown: string,
  options?: { promotion?: boolean; profile?: PublicBriefingProfile; filename?: string },
): { ok: boolean; issues: PublicDeclassificationIssue[] } {
  const issues = scanPublicBriefingDeclassification(markdown, options).map((issue) => ({
    ...issue,
    severity: options?.promotion ? ("error" as const) : ("warn" as const),
  }));
  const ok = !issues.some((issue) => issue.severity === "error");
  return { ok, issues };
}

/** Best-effort prose sanitizer for generation pipelines (promotion still requires human review). */
export function sanitizePublicBriefingProse(
  input: string,
  options?: { profile?: PublicBriefingProfile },
): string {
  const profile = options?.profile ?? "governance-triad";
  let text = input;
  for (const rule of PUBLIC_BRIEFING_INTERNAL_REFERENCE_RULES) {
    if (!ruleApplies(rule, profile)) continue;
    text = text.replace(rule.pattern, "[redacted]");
  }
  return text.replace(/\s{2,}/g, " ").trim();
}

export function buildEmergingThreatsOsintPrompt(operationalDateLabel: string): string {
  return `${PUBLIC_BROADCAST_SANITIZATION_MANDATE}

Active: Governance Frame Emerging Threats Notice. Operational date: ${operationalDateLabel}.
Temperature 0. No emojis.

Write markdown body ONLY (no YAML frontmatter) using exactly these headings:

## Active Threat Landscape Analysis
High-density real-world threat vectors. CVE identifiers permitted. No repository paths or internal source indicators.

## Regulatory Posture & Institutional Impact
Executive breakdown of macro-compliance movements (FFIEC, HIPAA, NERC, CMMC, CISA BOD) relevant to the wider market. Formatted USD only.

## Recommended Mitigation Controls
Strategic defensive guidance for institutional risk executives. One optional soft Ironframe bridge if mapping is genuine — problem first, no hard sell.

### V. Sources & Citations
External regulator URLs and https://brief.ironframegrc.com only.
`.trim();
}
