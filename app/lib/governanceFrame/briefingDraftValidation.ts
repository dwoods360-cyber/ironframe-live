import { stripDangerousMarkdown } from "@/app/lib/governanceFrame/sanitizeMarkdown";
import { parseBriefingCitations } from "@/app/lib/governanceFrame/parseBriefingCitations";
import { parseBriefingSections } from "@/app/lib/governanceFrame/parseBriefingSections";

export const DRAFT_FILENAME_PATTERN = /^\d{4}-\d{2}-\d{2}-draft-[a-z0-9-]+\.md$/i;

export const QUARANTINE_ALLOWLIST = new Set(["template.md", ".gitkeep", "readme.md"]);

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

export function validateBriefingDraftContent(
  markdown: string,
  options?: { requireCitations?: boolean; promotion?: boolean },
): BriefingDraftValidationResult {
  const requireCitations = options?.requireCitations ?? options?.promotion ?? false;
  const issues: BriefingDraftValidationIssue[] = [];
  const safe = stripDangerousMarkdown(markdown);

  if (safe !== markdown) {
    issues.push({
      code: "DANGEROUS_MARKDOWN",
      message: "Draft contains executable HTML or javascript: URIs — sanitize before promotion.",
      severity: "error",
    });
  }

  if (CVE_PATTERN.test(markdown)) {
    issues.push({
      code: "CVE_LEAK",
      message: "Draft contains raw CVE identifiers — translate to perimeter descriptions before queueing.",
      severity: options?.promotion ? "error" : "warn",
    });
  }

  if (RAW_UUID_PATTERN.test(markdown)) {
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

  if (!hasTriadSections(markdown)) {
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
  const content = validateBriefingDraftContent(markdown, {
    promotion: options?.promotion,
    requireCitations: options?.promotion,
  });

  const issues = [...nameIssues, ...content.issues];
  const ok = !issues.some((i) => i.severity === "error");
  return { ok, issues };
}
