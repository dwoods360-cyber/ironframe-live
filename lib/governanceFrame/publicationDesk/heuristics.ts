/**
 * Deterministic desk checks — complement LLM advisory passes.
 * Never invents sources; never authorizes publication.
 */

const REGULATORY_PRECISION_FLAGS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /\b(proposed rule|proposal|NPRM|notice of proposed)\b/i,
    message: "Draft mentions a proposal — confirm it is not described as a final/in-force rule.",
  },
  {
    pattern: /\b(guidance|guidelines?|voluntary framework|best practice)\b/i,
    message: "Draft mentions guidance/voluntary material — confirm it is not framed as binding law.",
  },
  {
    pattern: /\b(COBIT|COSO|OCEG|NIST)\b/,
    message: "Professional framework cited — confirm it is not described as independently binding.",
  },
  {
    pattern: /\b(requires? (?:that )?(?:you|organizations?|entities?) (?:use|adopt|deploy) )\b/i,
    message: "Check whether a ‘requires’ claim overstates regulatory text.",
  },
  {
    pattern: /\b(Ironframe (?:is|provides|ensures|guarantees) (?:compliance|SOC ?2|ISO))\b/i,
    message: "Possible product-as-compliance claim — product-boundary review required.",
  },
];

const PRODUCT_BOUNDARY_FLAGS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /\bIronframe\b/i,
    message: "Ironframe appears — must be labeled as one possible implementation, not a regulatory requirement.",
  },
  {
    pattern: /\b(SOC\s*2\s*certified|ISO\s*27001\s*certified|guaranteed compliance)\b/i,
    message: "Unsupported or absolute certification/compliance claim language detected.",
  },
  {
    pattern: /\b(the regulation requires Ironframe|regulators require Ironframe)\b/i,
    message: "Forbidden implication that regulation requires Ironframe.",
  },
  {
    pattern: /\b(replace(?:s|ing)? (?:your )?(?:GRC|compliance) (?:stack|tool)|solves everything)\b/i,
    message: "Sales/evangelism phrasing — remove from Governance Frame research body.",
  },
];

function bodyWithoutFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---")) return markdown;
  const end = markdown.indexOf("---", 3);
  if (end === -1) return markdown;
  return markdown.slice(end + 3);
}

export function scanRegulatoryPrecisionFlags(markdown: string): string[] {
  const body = bodyWithoutFrontmatter(markdown);
  const hits: string[] = [];
  for (const rule of REGULATORY_PRECISION_FLAGS) {
    if (rule.pattern.test(body)) hits.push(rule.message);
  }
  return hits;
}

export function scanProductBoundaryFlags(markdown: string): string[] {
  const body = bodyWithoutFrontmatter(markdown);
  const hits: string[] = [];
  for (const rule of PRODUCT_BOUNDARY_FLAGS) {
    if (rule.pattern.test(body)) hits.push(rule.message);
  }
  return hits;
}

export function scanCitationPresence(markdown: string): {
  hasSourcesSection: boolean;
  urlCount: number;
  notes: string[];
} {
  const body = bodyWithoutFrontmatter(markdown);
  const hasSourcesSection = /(?:^|\n)#{1,3}\s*V\.?\s*Sources|\bSources\s*&\s*Citations\b/i.test(
    body,
  );
  const urlCount = (body.match(/https?:\/\/[^\s)]+/gi) ?? []).length;
  const notes: string[] = [];
  if (!hasSourcesSection) {
    notes.push("No clear Sources & Citations / Section V heading — verifier must require citation map.");
  }
  if (urlCount < 2) {
    notes.push(`Few or no URLs found (${urlCount}) — primary-source coverage likely insufficient.`);
  } else {
    notes.push(`Found ${urlCount} URL(s); each material claim still needs exact-support verification.`);
  }
  return { hasSourcesSection, urlCount, notes };
}

export function scanEditorStructure(markdown: string): {
  ok: boolean;
  notes: string[];
} {
  const body = bodyWithoutFrontmatter(markdown);
  const notes: string[] = [];
  if (!/\bExecutive Summary\b/i.test(body)) {
    notes.push("Missing Executive Summary.");
  }
  const h2Count = (body.match(/^##\s+/gm) ?? []).length;
  if (h2Count < 2) {
    notes.push("Thin heading structure — clarify sections for briefing vs paper classification.");
  }
  if (/\b(heatmap theater|spreadsheet theater|checklist industrial complex|poisoned lakes)\b/i.test(body)) {
    notes.push("Commentary metaphor present — moderate or label as commentary, not fact.");
  }
  if (/\bTop\s*10\b/i.test(body)) {
    notes.push("SEO-style Top 10 framing — confirm genuine research purpose.");
  }
  return { ok: notes.length === 0, notes };
}
