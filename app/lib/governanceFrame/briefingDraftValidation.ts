import { stripDangerousMarkdown } from "@/app/lib/governanceFrame/sanitizeMarkdown";
import { parseBriefingCitations } from "@/app/lib/governanceFrame/parseBriefingCitations";
import { parseBriefingSections } from "@/app/lib/governanceFrame/parseBriefingSections";
import { resolvePublicBriefingProfile, scanPublicBriefingDeclassification } from "@/app/lib/governanceFrame/publicBriefingDeclassification";
import { scanForbiddenPublicSalesClaims } from "@/app/lib/governanceFrame/publicBriefingSolutionVoice";

export const DRAFT_FILENAME_PATTERN = /^\d{4}-\d{2}-\d{2}-draft-[a-z0-9-]+\.md$/i;

export const QUARANTINE_ALLOWLIST = new Set([
  "template.md",
  "template-emerging-threats-notice.md",
  ".gitkeep",
  "readme.md",
]);

/** Queue filenames that are internal ops artifacts — never promote to published-briefings. */
export const NON_PROMOTABLE_DRAFT_MARKERS = [
  "writer-glossary",
  "glossary-delta",
] as const;

export function isNonPromotableBriefingDraft(filename: string): boolean {
  const lower = filename.toLowerCase();
  return NON_PROMOTABLE_DRAFT_MARKERS.some((marker) => lower.includes(marker));
}

/** Conservative $50,000.00 USD default when env is unset. */
export const DEFAULT_ALERT_EXPOSURE_THRESHOLD_CENTS = 5_000_000n;

export type ThresholdEvaluation = {
  requiresImmediatePromotion: boolean;
  currentExposureCents: bigint;
  thresholdCents: bigint;
};

export type BriefingDraftAlertFlags = {
  requiresImmediatePromotion: boolean;
  activeExposureCents: bigint | null;
  thresholdCents: bigint;
};

export type BriefingDraftValidationIssue = {
  code: string;
  message: string;
  severity: "error" | "warn";
};

export type BriefingDraftValidationResult = {
  ok: boolean;
  issues: BriefingDraftValidationIssue[];
};

const CVE_PATTERN = /\bCVE-\d{4}-\d+/i;
const RAW_UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
const RAW_CENT_LITERAL = /\b\d{9,}\s*cents?\b/i;

export function parseExposureThresholdCents(
  envValue = process.env.INTERNAL_ALERT_EXPOSURE_THRESHOLD_CENTS,
): bigint {
  const raw = String(envValue ?? "").trim() || DEFAULT_ALERT_EXPOSURE_THRESHOLD_CENTS.toString();
  try {
    const parsed = BigInt(raw);
    if (parsed < 0n) return DEFAULT_ALERT_EXPOSURE_THRESHOLD_CENTS;
    return parsed;
  } catch {
    return DEFAULT_ALERT_EXPOSURE_THRESHOLD_CENTS;
  }
}

/** Compare live tenant exposure against INTERNAL_ALERT_EXPOSURE_THRESHOLD_CENTS (whole cents, BigInt-safe). */
export function evaluateAlertThresholds(currentExposureCents: bigint): ThresholdEvaluation {
  const thresholdCents = parseExposureThresholdCents();
  const requiresImmediatePromotion = currentExposureCents >= thresholdCents;
  return {
    requiresImmediatePromotion,
    currentExposureCents,
    thresholdCents,
  };
}

export function buildBriefingDraftFrontmatter(args: {
  title: string;
  dateIso?: string;
  tenantId: string;
  tenantSlug: string;
  currentExposureCents: bigint;
  requiresImmediatePromotion: boolean;
}): string {
  const dateIso = args.dateIso ?? new Date().toISOString();
  return `---
title: "${args.title.replace(/"/g, '\\"')}"
date: "${dateIso}"
status: "QUARANTINED_DRAFT"
tenantId: "${args.tenantId}"
tenantSlug: "${args.tenantSlug}"
requiresImmediatePromotion: ${args.requiresImmediatePromotion}
activeExposureCents: "${args.currentExposureCents.toString()}"
---
`;
}

/** Public-facing quarantine frontmatter — promotion metadata stripped before publish. */
export function buildPublicQuarantineFrontmatter(args: {
  title: string;
  classification: string;
  summary: string;
  tenantId: string;
  tenantSlug: string;
  dateIso?: string;
}): string {
  const dateIso = args.dateIso ?? new Date().toISOString();
  return `---
title: "${args.title.replace(/"/g, '\\"')}"
date: "${dateIso}"
classification: "${args.classification.replace(/"/g, '\\"')}"
status: "QUARANTINED_DRAFT"
summary: "${args.summary.replace(/"/g, '\\"')}"
audience: "Public — brief.ironframegrc.com"
tenantId: "${args.tenantId}"
tenantSlug: "${args.tenantSlug}"
---
`;
}

/** Remove YAML frontmatter block when present. */
export function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---")) return markdown;
  const end = markdown.indexOf("---", 3);
  if (end === -1) return markdown;
  return markdown.slice(end + 3).trimStart();
}

function parseFrontmatterField(markdown: string, key: string): string | null {
  const match = markdown.match(new RegExp(`^${key}:\\s*(.+)$`, "im"));
  if (!match?.[1]) return null;
  return match[1].trim().replace(/^["']|["']$/g, "");
}

export type BriefingDraftFrontmatter = {
  title: string;
  tenantId: string;
  activeExposureCents: bigint;
  doraScore: number;
};

/** Parse promotion fields from quarantine frontmatter (whole-cent BigInt, no float drift). */
export function parseBriefingDraftFrontmatter(
  markdown: string,
  fallbackTitle: string,
): BriefingDraftFrontmatter | null {
  const tenantId = parseFrontmatterField(markdown, "tenantId");
  if (!tenantId) return null;

  const title = parseFrontmatterField(markdown, "title") ?? fallbackTitle;

  const exposureRaw = parseFrontmatterField(markdown, "activeExposureCents") ?? "0";
  let activeExposureCents = 0n;
  try {
    activeExposureCents = BigInt(exposureRaw.replace(/"/g, ""));
  } catch {
    activeExposureCents = 0n;
  }

  const doraRaw = parseFrontmatterField(markdown, "doraScore") ?? "100";
  const parsedDora = parseInt(doraRaw, 10);
  const doraScore = Number.isFinite(parsedDora) ? parsedDora : 100;

  return { title, tenantId, activeExposureCents, doraScore };
}

export function parseBriefingDraftAlertFlags(markdown: string): BriefingDraftAlertFlags {
  const thresholdCents = parseExposureThresholdCents();
  const requiresMatch = markdown.match(/^requiresImmediatePromotion:\s*(true|false)\s*$/im);
  const exposureMatch = markdown.match(/^activeExposureCents:\s*"?(\d+)"?\s*$/im);

  let activeExposureCents: bigint | null = null;
  if (exposureMatch?.[1]) {
    try {
      activeExposureCents = BigInt(exposureMatch[1]);
    } catch {
      activeExposureCents = null;
    }
  }

  const requiresImmediatePromotion =
    requiresMatch?.[1]?.toLowerCase() === "true" ||
    (activeExposureCents !== null && activeExposureCents >= thresholdCents);

  return {
    requiresImmediatePromotion,
    activeExposureCents,
    thresholdCents,
  };
}

function hasTriadSections(markdown: string): boolean {
  const sections = parseBriefingSections(markdown);
  const ids = new Set(sections.map((s) => s.id));
  return ids.has("exposure") && ids.has("impact") && ids.has("machine-rule");
}

function citationsSectionBody(markdown: string): string {
  const sections = parseBriefingSections(markdown);
  const citations = sections.find((s) => s.id === "citations");
  return citations?.body ?? "";
}

function hasEmergingThreatsSections(markdown: string): boolean {
  const body = stripFrontmatter(markdown);
  return (
    /##\s+Active Threat Landscape Analysis/i.test(body) &&
    /##\s+Regulatory Posture & Institutional Impact/i.test(body) &&
    /##\s+Recommended Mitigation Controls/i.test(body)
  );
}

export function validateBriefingDraftContent(
  markdown: string,
  options?: { requireCitations?: boolean; promotion?: boolean; filename?: string },
): BriefingDraftValidationResult {
  const requireCitations = options?.requireCitations ?? options?.promotion ?? false;
  const profile = resolvePublicBriefingProfile(markdown, options?.filename);
  const issues: BriefingDraftValidationIssue[] = [];
  const safe = stripDangerousMarkdown(markdown);

  if (safe !== markdown) {
    issues.push({
      code: "DANGEROUS_MARKDOWN",
      message: "Draft contains executable HTML or javascript: URIs — sanitize before promotion.",
      severity: "error",
    });
  }

  if (profile === "governance-triad" && CVE_PATTERN.test(markdown)) {
    issues.push({
      code: "CVE_LEAK",
      message: "Draft contains raw CVE identifiers — translate to perimeter descriptions before queueing.",
      severity: options?.promotion ? "error" : "warn",
    });
  }

  if (RAW_UUID_PATTERN.test(stripFrontmatter(markdown))) {
    issues.push({
      code: "UUID_LEAK",
      message: "Draft contains raw UUID literals — cite formatted telemetry locators instead.",
      severity: "warn",
    });
  }

  if (RAW_CENT_LITERAL.test(markdown)) {
    issues.push({
      code: "RAW_CENT_LITERAL",
      message: "Draft contains large raw cent literals — use quoted BigInt strings or formatted USD only.",
      severity: "warn",
    });
  }

  if (profile === "emerging-threats-notice") {
    if (!hasEmergingThreatsSections(markdown)) {
      issues.push({
        code: "MISSING_THREAT_NOTICE_SECTIONS",
        message:
          "Emerging Threats Notice must include Active Threat Landscape, Regulatory Posture, and Recommended Mitigation Controls sections.",
        severity: options?.promotion ? "error" : "warn",
      });
    }
  } else if (!hasTriadSections(markdown)) {
    issues.push({
      code: "MISSING_TRIAD",
      message: "Draft must include Governance Frame triad sections I–III.",
      severity: options?.promotion ? "error" : "warn",
    });
  }

  const citationBody = citationsSectionBody(markdown);
  const citations = parseBriefingCitations(citationBody);

  if (requireCitations && citations.length === 0) {
    issues.push({
      code: "MISSING_CITATIONS",
      message:
        "Promotion requires Section V (Sources & Citations) with at least one traceable locator.",
      severity: "error",
    });
  } else if (citations.length === 0) {
    issues.push({
      code: "MISSING_CITATIONS",
      message: "Add Section V citations so reviewers can fact-check against live telemetry.",
      severity: "warn",
    });
  }

  const alertFlags = parseBriefingDraftAlertFlags(markdown);
  if (alertFlags.requiresImmediatePromotion) {
    issues.push({
      code: "EXPOSURE_THRESHOLD_EXCEEDED",
      message: `Active exposure exceeds INTERNAL_ALERT_EXPOSURE_THRESHOLD_CENTS (${alertFlags.thresholdCents.toString()} ¢) — urgent human promotion review required.`,
      severity: "warn",
    });
  }

  for (const leak of scanPublicBriefingDeclassification(markdown, {
    profile,
    filename: options?.filename,
  })) {
    issues.push({
      code: leak.code,
      message: leak.message,
      severity: options?.promotion ? "error" : "warn",
    });
  }

  for (const claim of scanForbiddenPublicSalesClaims(markdown)) {
    issues.push({
      code: claim.code,
      message: claim.message,
      severity: options?.promotion ? "error" : "warn",
    });
  }

  const blocking = issues.some((i) => i.severity === "error");
  return { ok: !blocking, issues };
}

export function validateBriefingDraftFilename(filename: string): BriefingDraftValidationIssue[] {
  if (QUARANTINE_ALLOWLIST.has(filename.toLowerCase())) return [];
  if (DRAFT_FILENAME_PATTERN.test(filename)) return [];
  return [
    {
      code: "FILENAME_CONVENTION",
      message: `Use YYYY-MM-DD-draft-{tenant-slug}.md (got ${filename}).`,
      severity: "warn",
    },
  ];
}

export function validateBriefingQueueDraft(
  filename: string,
  markdown: string,
  options?: { promotion?: boolean },
): BriefingDraftValidationResult {
  const nameIssues = validateBriefingDraftFilename(filename);
  if (options?.promotion && isNonPromotableBriefingDraft(filename)) {
    nameIssues.push({
      code: "NON_PROMOTABLE_ARTIFACT",
      message: `${filename} is an internal glossary/ops artifact — not eligible for public briefing promotion.`,
      severity: "error",
    });
  }
  const content = validateBriefingDraftContent(markdown, {
    promotion: options?.promotion,
    requireCitations: options?.promotion,
    filename,
  });

  const issues = [...nameIssues, ...content.issues];
  const ok = !issues.some((i) => i.severity === "error");
  return { ok, issues };
}
