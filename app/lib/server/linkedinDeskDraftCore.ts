import "server-only";

import fs from "node:fs";
import path from "node:path";

import {
  findAppDocumentBySlug,
  upsertAppDocument,
} from "@/app/lib/server/appDocumentStore";
import { inferReadingLevelFromSlug } from "@/lib/appDocumentSlug";

/** APP_DOCS slug — same path the /docs reader uses. */
export const LINKEDIN_DRAFTS_APP_DOC_SLUG = "marketing-strategy/linkedin-drafts-week-1";

const REPO_RELATIVE = path.join(
  "docs",
  "marketing-strategy",
  "linkedin-drafts-week-1.md",
);

const RESEARCH_HEADING =
  "## Research & verification (operator only — do not paste to LinkedIn)";

/** Suggested Mon slot — heatmap vs dollars (calendar `marketing/linkedin-2026-07-21`). */
export const LINKEDIN_SUGGESTED_DRAFT_TITLE =
  "LinkedIn Mon — Heatmap theater vs dollar-risk clarity";

/** Paste-ready LinkedIn body only (Mandate 16 safe — no “boards reject heatmaps” / “SEC requires FAIR”). */
export const LINKEDIN_SUGGESTED_DRAFT_BODY = `Most GRC programs can color a risk red, amber, or green.

Fewer can answer the board question in dollars: what is the estimated exposure, in whole cents, for this scenario—and what assumptions produced that number?

Heatmaps are useful as context. They become theater when they are the only decision layer: no quantified exposure, no visible methodology, no path from control evidence to a board-defendable figure.

The usual fix—another dashboard, another scoring workshop—doesn't remove the problem. It adds another color system on top of the same gap.

What to inspect this week:
1. Pick one "High" risk on your heatmap.
2. Ask for the estimated dollar exposure and the assumptions behind it.
3. Ask which evidence and owner support that estimate.
4. If the answer is only a color, you've found the next workflow to redesign.

I'm happy to walk one evidence-to-exposure workflow with you in 10–15 minutes:
https://ironframegrc.com/register/contact

Also: https://ironframegrc.com/marketing/heatmap-amnesty

#GRC #RiskQuantification #CyberRisk #BoardRisk #Governance`;

/**
 * Blank operator research skeleton when starting a new LinkedIn claim set.
 * Forces claim → evidence → Ironframe relief before posting.
 */
export const LINKEDIN_RESEARCH_TEMPLATE = `Use this section to verify that each public claim is real and that Ironframe can relieve the pain — not as LinkedIn copy.

### Claim map (post line → proof → Ironframe relief)

| Post claim (paraphrase) | What the research actually supports | Citation (full URL — open before post) | How Ironframe relieves it (product truth only) |
|---|---|---|---|
| [Paste claim from post] | [What source actually says — no stretch] | [https://…] | [Specific Ironframe control/workflow — Mandate 16 safe] |
| | | | |

### Ironframe product truth (what we can honestly offer)

- Relief path: Controls → evidence → scenarios → estimated financial exposure (ranges) → mitigation cost → residual.
- Campaign / product page: …
- Copy locks / bans: Mandate 16 — never invent regulator mandates or competitor incapability.
- Integrity: dollar figures only when estimated exposure is stored as whole-cent integers.

### Pre-post checklist

- [ ] Opened each citation URL and confirmed the claim paraphrase still matches the source.
- [ ] Post body avoids Mandate 16 ban phrases.
- [ ] Any number, CAGR, or customer outcome removed unless separately verified.
- [ ] Copy body only (not this research block) into LinkedIn.
- [ ] Calendar card Done with post URL after publish.`;

/**
 * Operator-only research pack: claim → citation → Ironframe relief.
 * Verify each link before posting. Do not paste this block into LinkedIn.
 */
export const LINKEDIN_SUGGESTED_DRAFT_RESEARCH = `Use this section to verify that each public claim is real and that Ironframe can relieve the pain — not as LinkedIn copy.

### Claim map (post line → proof → Ironframe relief)

| Post claim (paraphrase) | What the research actually supports | Citation (full URL — open before post) | How Ironframe relieves it (product truth only) |
|---|---|---|---|
| Color/heatmap alone is a weak decision layer | Risk matrices often have poor resolution, ranking errors, and do not support effective resource allocation; they can even be worse than random under some conditions | Cox, L. A. Jr. (2008). "What's Wrong with Risk Matrices?" *Risk Analysis*, 28(2), 497–512. https://doi.org/10.1111/j.1539-6924.2008.01030.x · https://onlinelibrary.wiley.com/doi/10.1111/j.1539-6924.2008.01030.x | Treat heatmaps as optional context; decision loop is scenarios → estimated loss exposure (whole cents) → mitigation cost → residual (Heatmap Amnesty / Control-to-Capital). |
| Boards/finance need financial exposure, not only ordinal colors | Board cyber oversight guidance pushes reporting in business/financial terms and quantified potential financial impacts / probable loss ranges — not tech-only or color-only packs | NACD–ISA (2026). *Director's Handbook on Cyber-Risk Oversight* (5th ed.), Principle 5 (measurement & reporting). https://www.nacdonline.org/all-governance/governance-resources/governance-research/director-handbooks/2026-cyber-risk-oversight/ · Principle 5: https://www.nacdonline.org/all-governance/governance-resources/governance-research/director-handbooks/2026-cyber-risk-oversight/cyber-risk-handbook-principles-2026/principle-5-guide-cybersecurity-risk-measurement-reporting/ · PDF: https://www.nacdonline.org/globalassets/public-pdfs/2026_directors-handbook-cyber-risk_accessible.pdf | Path B Command Design Partner makes estimated dollar exposure + evidence + enclaves the daily operating loop, not a quarterly color chart. |
| Quantification in financial terms is a recognized discipline (not Ironframe inventing “true ALE”) | Open FAIR is a standard model for analyzing information/operational risk in financial terms; complements frameworks that leave “how to quantify” underspecified | The Open Group Open FAIR (O-RT / O-RA). Overview: https://www.fairinstitute.org/what-is-fair · Open Group standards page (confirm current URLs before citing in public). | Ironframe uses **estimated** loss exposure / ranges stored in **whole-cent integers** — not a claim that only Open FAIR is valid, and not “true ALE as accounting dollars” (Mandate 16). |
| Ordinal board packs under-inform financial impact | Practitioner board-reporting guidance: heatmaps/ordinal scales are common but often fail to show financial impact; quantification is used to support spend/appetite decisions | FAIR Institute summary of Jack Jones / ISACA board-reporting theme: https://www.fairinstitute.org/blog/improving-how-cyber-risk-is-reported-to-the-board (also locate the underlying ISACA Journal piece before quoting page numbers). | Workflow review CTA: walk one evidence → scenario → exposure path in 10–15 minutes. |
| SEC / disclosure raises accountability for material cyber impact | U.S. public-company cyber disclosure (Item 1.05 / Item 106 regime) increases accountability; materiality includes **quantitative and qualitative** factors — **not** a mandate to use FAIR/ALE | SEC cybersecurity disclosure rules (verify current rule text / adopting release before any absolute claim): start at https://www.sec.gov/ and search “cybersecurity risk management strategy governance and incident disclosure”. Internal claim lock: \`docs/sales/control-to-capital-market-narrative.md\`. | Dollars improve defensibility of board/export artifacts; never claim “SEC requires FAIR.” |

### Ironframe product truth (what we can honestly offer)

- **Relief path:** Controls → evidence → scenarios → estimated financial exposure (ranges) → mitigation cost → residual exposure, with hard tenant isolation (\`docs/sales/control-to-capital-market-narrative.md\`).
- **Campaign page:** https://ironframegrc.com/marketing/heatmap-amnesty
- **Copy locks / bans:** \`docs/sales/heatmap-amnesty-campaign.md\`, Mandate 16 in glossary — never “boards are rejecting heatmaps,” “SEC requires FAIR,” “competitors cannot quantify,” or “true ALE.”
- **Integrity:** exposure stored as whole-cent / BigInt integers — display dollars only as presentation.

### Pre-post checklist

- [ ] Opened each citation URL and confirmed the claim paraphrase still matches the source.
- [ ] Post body avoids Mandate 16 ban phrases.
- [ ] Any number, CAGR, or customer outcome removed unless separately verified.
- [ ] Copy body only (not this research block) into LinkedIn.
- [ ] Calendar card Done with post URL after publish.`;

/** Extract http(s) citation URLs from operator research markdown (deduped, max 24). */
export function extractLinkedInResearchCitationUrls(research: string): string[] {
  const matches = research.match(/https?:\/\/[^\s)|\]>"']+/gi) ?? [];
  const cleaned = matches.map((u) => u.replace(/[.,;:]+$/, ""));
  return [...new Set(cleaned)].slice(0, 24);
}
export function composeLinkedInDeskMarkdown(
  title: string,
  body: string,
  research: string,
): string {
  const cleanTitle = title.trim() || LINKEDIN_SUGGESTED_DRAFT_TITLE;
  const cleanBody = body.replace(/\r\n/g, "\n").trim();
  const cleanResearch = research.replace(/\r\n/g, "\n").trim();
  return `# ${cleanTitle}\n\n${cleanBody}\n\n---\n\n${RESEARCH_HEADING}\n\n${cleanResearch}\n`;
}

export function parseLinkedInDeskMarkdown(markdown: string): {
  title: string;
  body: string;
  research: string;
} {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  const match = normalized.match(/^#\s+(.+)\n+([\s\S]*)$/);
  const title = match?.[1]?.trim() || LINKEDIN_SUGGESTED_DRAFT_TITLE;
  const rest = (match?.[2] ?? normalized).trim();

  const researchSplit = rest.split(/\n---\n+\s*## Research & verification[^\n]*\n+/i);
  if (researchSplit.length >= 2) {
    return {
      title,
      body: researchSplit[0].trim(),
      research: researchSplit.slice(1).join("\n---\n").trim(),
    };
  }

  return {
    title,
    body: rest,
    research: LINKEDIN_SUGGESTED_DRAFT_RESEARCH,
  };
}

function tryWriteRepoMarkdown(markdown: string): boolean {
  try {
    const absolute = path.join(process.cwd(), REPO_RELATIVE);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, markdown, "utf8");
    return true;
  } catch {
    return false;
  }
}

export type LinkedInDeskDraftResult = {
  ok: true;
  slug: string;
  title: string;
  body: string;
  research: string;
  markdown: string;
  updatedAt: string | null;
  source: "app_document" | "suggested" | "seeded";
  repoSynced: boolean;
};

async function persistDraft(input: {
  title: string;
  body: string;
  research: string;
  source: LinkedInDeskDraftResult["source"];
  syncRepo: boolean;
}): Promise<LinkedInDeskDraftResult> {
  const markdown = composeLinkedInDeskMarkdown(
    input.title,
    input.body,
    input.research,
  );
  const row = await upsertAppDocument({
    slug: LINKEDIN_DRAFTS_APP_DOC_SLUG,
    title: input.title.trim() || LINKEDIN_SUGGESTED_DRAFT_TITLE,
    content: markdown,
    readingLevel: inferReadingLevelFromSlug(LINKEDIN_DRAFTS_APP_DOC_SLUG),
  });
  const parsed = parseLinkedInDeskMarkdown(row.content);
  const repoSynced = input.syncRepo ? tryWriteRepoMarkdown(row.content) : false;

  return {
    ok: true,
    slug: row.slug,
    title: parsed.title,
    body: parsed.body,
    research: parsed.research,
    markdown: row.content,
    updatedAt: row.updatedAt.toISOString(),
    source: input.source,
    repoSynced,
  };
}

/**
 * Force-load the suggested heatmap LinkedIn draft (title + body + research) into APP_DOCS.
 */
export async function seedSuggestedLinkedInDeskDraftCore(): Promise<LinkedInDeskDraftResult> {
  return persistDraft({
    title: LINKEDIN_SUGGESTED_DRAFT_TITLE,
    body: LINKEDIN_SUGGESTED_DRAFT_BODY,
    research: LINKEDIN_SUGGESTED_DRAFT_RESEARCH,
    source: "seeded",
    syncRepo: true,
  });
}

/**
 * Load LinkedIn paste drafts for the Publishing Desk workbench.
 * Prefers APP_DOCS; seeds the suggested heatmap draft when missing.
 */
export async function loadLinkedInDeskDraftCore(options?: {
  seedSuggested?: boolean;
}): Promise<LinkedInDeskDraftResult> {
  if (options?.seedSuggested) {
    return seedSuggestedLinkedInDeskDraftCore();
  }

  const existing = await findAppDocumentBySlug(LINKEDIN_DRAFTS_APP_DOC_SLUG);
  if (existing) {
    const looksLikeWeek1Archive =
      /Founder-led LinkedIn drafts/i.test(existing.title) ||
      /Alternate Monday/i.test(existing.content) ||
      /USE THIS for the calendar card/i.test(existing.content);
    const missingResearch = !/Research & verification/i.test(existing.content);
    if (looksLikeWeek1Archive || missingResearch) {
      return seedSuggestedLinkedInDeskDraftCore();
    }
    const parsed = parseLinkedInDeskMarkdown(existing.content);
    return {
      ok: true,
      slug: existing.slug,
      title: existing.title?.trim() || parsed.title,
      body: parsed.body,
      research: parsed.research,
      markdown: existing.content,
      updatedAt: existing.updatedAt.toISOString(),
      source: "app_document",
      repoSynced: false,
    };
  }

  return persistDraft({
    title: LINKEDIN_SUGGESTED_DRAFT_TITLE,
    body: LINKEDIN_SUGGESTED_DRAFT_BODY,
    research: LINKEDIN_SUGGESTED_DRAFT_RESEARCH,
    source: "suggested",
    syncRepo: true,
  });
}

/**
 * Save LinkedIn paste drafts from the Publishing Desk workbench.
 */
export async function saveLinkedInDeskDraftCore(input: {
  title?: string;
  body?: string;
  research?: string;
  markdown?: string;
}): Promise<LinkedInDeskDraftResult | { ok: false; error: string; status: number }> {
  let title = (input.title ?? "").trim();
  let body = (input.body ?? "").replace(/\r\n/g, "\n").trim();
  let research = (input.research ?? "").replace(/\r\n/g, "\n").trim();

  if ((!title || !body || !research) && input.markdown?.trim()) {
    const parsed = parseLinkedInDeskMarkdown(input.markdown);
    if (!title) title = parsed.title;
    if (!body) body = parsed.body;
    if (!research) research = parsed.research;
  }

  if (!title) title = LINKEDIN_SUGGESTED_DRAFT_TITLE;
  if (!research.trim()) {
    return {
      ok: false,
      error:
        "Research & citations required — map each pain claim to a source URL and an Ironframe relief before saving.",
      status: 400,
    };
  }
  if (extractLinkedInResearchCitationUrls(research).length < 1) {
    return {
      ok: false,
      error:
        "Research & citations must include at least one http(s) URL proving a post claim before save.",
      status: 400,
    };
  }
  if (body.length < 40) {
    return {
      ok: false,
      error: "Draft body is too short — paste or write the LinkedIn copy before saving.",
      status: 400,
    };
  }

  return persistDraft({
    title,
    body,
    research,
    source: "app_document",
    syncRepo: true,
  });
}
