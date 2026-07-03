/**
 * Public Governance Frame voice — soft solution interjection when Ironframe
 * genuinely addresses the threat or regulatory vector under discussion.
 */

import type { PublicDeclassificationIssue } from "@/app/lib/governanceFrame/publicBriefingDeclassification";

export const APPROVED_PUBLIC_IRONFRAME_CAPABILITIES = [
  "Quantitative annual loss exposure modeling with whole-cent financial discipline",
  "Zero-trust evidence ingest with quarantine-before-persist boundaries",
  "Multi-tenant GRC command post for regulated mid-market operators and MSSPs",
  "Governance Frame institutional briefing and subscriber intelligence surface",
  "Human-in-the-loop attestation gates before executive publication",
  "Continuous DORA and framework readiness visibility for board reporting",
] as const;

export const APPROVED_PUBLIC_POSITIONING_LINE =
  "The quantitative GRC command post for regulated mid-market organizations and MSSPs — defensible exposure modeling, zero-trust ingest, and observable governance workflows, not heatmap theater or bolt-on AI chat.";

export const FORBIDDEN_PUBLIC_SALES_CLAIMS = [
  "ahead of the market",
  "uncopyable moats",
  "undisputed market leader",
  "no viable competitors",
  "order-of-magnitude technical advantage",
  "full GRC depth",
  "commercial SaaS on autopilot",
] as const;

export const PUBLIC_BRIEFING_SOLUTION_INTERJECTION_MANDATE = `
[PUBLIC BRIEFING — SOFT SOLUTION INTERJECTION]
When the exposure vector or regulatory shift in Sections I–II maps to a capability Ironframe actually provides, add a brief, institutional bridge in Section III (Machine-Rule Technical Translation). Do not hard-sell.

Voice rules:
1. Lead with the industry problem and control outcome first; mention Ironframe only after the reader understands the stakes.
2. Use soft interjection patterns: "Operators addressing this vector often…", "A practical response path includes…", "Institutional programs consolidating this evidence frequently…"
3. Limit Ironframe mention to one short paragraph or a single checklist bullet in Section III — never dominate the briefing.
4. Only interject when the mapping is genuine (examples: KEV velocity → continuous perimeter attestation; OCR/HIPAA enforcement → quantified exposure reporting; CMMC countdown → evidence retention and board-ready reporting; MSSP multi-entity oversight → tenant-sovereign command post).
5. If Ironframe does not materially solve the vector, omit product mention entirely — credibility over conversion.

Approved public capabilities (paraphrase in plain language — no internal codenames):
${APPROVED_PUBLIC_IRONFRAME_CAPABILITIES.map((line) => `- ${line}`).join("\n")}

Approved positioning (use at most once, paraphrased): ${APPROVED_PUBLIC_POSITIONING_LINE}

Commercial posture: design-partner / pilot-ready — invite exploration at https://brief.ironframegrc.com, not "buy now" urgency.

Forbidden in public copy: ${FORBIDDEN_PUBLIC_SALES_CLAIMS.map((c) => `"${c}"`).join(", ")}; competitor disparagement; naming Vanta/Drata unless comparing certification floor vs. operational GRC ceiling in neutral terms.
`.trim();

export function buildPublicBriefingAuthoringMandate(declassificationMandate: string): string {
  return `${declassificationMandate}\n\n${PUBLIC_BRIEFING_SOLUTION_INTERJECTION_MANDATE}`;
}

function bodyWithoutFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---")) return markdown;
  const end = markdown.indexOf("---", 3);
  if (end === -1) return markdown;
  return markdown.slice(end + 3);
}

export function scanForbiddenPublicSalesClaims(markdown: string): PublicDeclassificationIssue[] {
  const body = bodyWithoutFrontmatter(markdown).toLowerCase();
  const issues: PublicDeclassificationIssue[] = [];

  for (const phrase of FORBIDDEN_PUBLIC_SALES_CLAIMS) {
    if (body.includes(phrase.toLowerCase())) {
      issues.push({
        code: "FORBIDDEN_SALES_CLAIM",
        message: `Remove forbidden superlative "${phrase}" from public copy — use soft solution interjection instead.`,
        severity: "error",
      });
    }
  }

  return issues;
}
