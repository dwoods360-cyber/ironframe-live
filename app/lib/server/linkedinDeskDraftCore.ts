import "server-only";

import fs from "node:fs";
import path from "node:path";

import {
  findAppDocumentBySlug,
  upsertAppDocument,
} from "@/app/lib/server/appDocumentStore";
import { inferReadingLevelFromSlug } from "@/lib/appDocumentSlug";
import prisma from "@/lib/prisma";

/** APP_DOCS slug — legacy Fri mirror for the /docs reader deep link. */
export const LINKEDIN_DRAFTS_APP_DOC_SLUG = "marketing-strategy/linkedin-drafts-week-1";

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

/** Suggested Fri slot — collection ≠ verification / hard tenant boundaries. */
export const LINKEDIN_FRI_DRAFT_TITLE =
  "LinkedIn Fri — Collection is not verification";

export const LINKEDIN_FRI_DRAFT_BODY = `**Collection is not verification.**

A long connector list can look like maturity—until an auditor asks:

"Where did this control assertion come from, which legal entity does it belong to, and who authorized it?"

Weak tenant separation makes that question harder to answer.

Shared evidence repositories divided only by tags can turn “we integrated twelve systems” into blended evidence the moment Client West’s artifact appears inside Client East’s workflow.

A practical control test for this week:

1. Select one evidence item used in a board or client report.
2. Trace its source system, collection time, entity or client scope, and reviewer.
3. Determine whether another tenant’s user or agent could place evidence into the same repository or workflow.
4. Check whether separation is enforced by the system—or represented only by a label.

When tenant scope depends on a tag rather than a hard boundary, you have found the next isolation workflow to redesign.

The control-first pattern is:

• Hard tenant boundaries
• Quarantine before persistence
• Human authorization before cross-entity export

Not simply more connectors.

I'm happy to walk one multi-entity evidence path with you in 10–15 minutes:
https://ironframegrc.com/register/contact

#GRC #MultiTenant #CyberSecurity #MSSP #RiskGovernance`;

export const LINKEDIN_FRI_DRAFT_RESEARCH = `Use this section to verify that each public claim is real and that Ironframe can relieve the pain — not as LinkedIn copy.

### Claim map (post line → proof → Ironframe relief)

| Post claim (paraphrase) | What the research actually supports | Citation (full URL — open before post) | How Ironframe relieves it (product truth only) |
|---|---|---|---|
| Collection is not verification | Cloud-era GRC improved collection speed; assurance still requires validation, legal-entity scope, durable provenance, access isolation, and human interpretation | GF published briefing: https://research.ironframegrc.com/briefings/2026-05-14-connector-count-sovereign-enclaves · Part 2: https://research.ironframegrc.com/briefings/2026-02-12-market-grc-2009-2018 | Hard tenant enclaves + quarantine-before-persist + HITL before cross-entity export — not connector-count theater. |
| Auditor asks source / entity / authorization | Assurance asks provenance, scope, and who authorized the assertion — connector count alone does not answer | https://research.ironframegrc.com/briefings/2026-05-14-connector-count-sovereign-enclaves | Evidence objects carry tenant scope; exports require human authorization across entity boundaries. |
| Tag-only tenancy blends client evidence | Soft separation (labels/tags in a shared repo) can allow cross-client bleed in workflows | Product narrative: https://ironframegrc.com/docs/sales/control-to-capital-market-narrative | System-enforced tenant boundaries (not tag-only); MSSP/multi-entity Path B design. |
| Hard boundaries + quarantine + human auth | Control-first pattern for multi-entity operators | https://ironframegrc.com/docs/sales/control-to-capital-market-narrative · CTA: https://ironframegrc.com/register/contact | Workflow review walks one multi-entity evidence path in 10–15 minutes. |

### Ironframe product truth (what we can honestly offer)

- **Relief path:** Hard tenant isolation → quarantine before persistence → human authorization before cross-entity export.
- **Copy locks / bans:** Mandate 16 — no competitor incapability claims; no invented regulator mandates.
- **CTA:** 10–15 minute workflow review only (not free pilot / Request Demo).

### Pre-post checklist

- [ ] Opened each citation URL and confirmed the claim paraphrase still matches the source.
- [ ] Post body avoids Mandate 16 ban phrases.
- [ ] Copy body only (not this research block) into LinkedIn.
- [ ] Calendar card Done with post URL after publish.
`;

/** Wed slot — point to /product-demo ahead of video publishes. */
export const LINKEDIN_WED_DRAFT_TITLE =
  "LinkedIn Wed — point to /product-demo (pre-video)";

export const LINKEDIN_WED_DRAFT_BODY = `Most GRC product tours show feature lists and color-coded dashboards.

Fewer show the exact workflow that cuts board-reporting friction:

Evidence → Scenario → Estimated Exposure
(whole cents, explicit assumptions)

When the board shifts from "are we compliant?" to "what is our defendable financial exposure?", feature checklists don't answer.

Short walkthrough:
https://ironframegrc.com/product-demo

#GRC #BoardRisk #CyberGovernance #RiskQuantification #RiskManagement`;

export const LINKEDIN_WED_DRAFT_RESEARCH = `Use this section to verify that each public claim is real and that Ironframe can relieve the pain — not as LinkedIn copy.

### First comment (post immediately after publish — do not put in main body)

Prefer to walk that path on your own evidence stack? Happy to do a 10–15 minute workflow review:
https://ironframegrc.com/register/contact

### Claim map (post line → proof → Ironframe relief)

| Post claim (paraphrase) | What the research actually supports | Citation (full URL — open before post) | How Ironframe relieves it (product truth only) |
|---|---|---|---|
| Feature lists / color dashboards vs evidence→exposure pipeline | Founder cadence: Wednesday posts point to a bounded product demonstration; Mon heatmap post already attacked qualitative theater | Cadence: https://ironframegrc.com/docs/marketing-strategy/linkedin-founder-cadence | /product-demo is the public bounded walkthrough surface. |
| One primary link in body (demo); contact in first comment | Cadence: one primary link per post; CTA is workflow review, not free pilot | Contact: https://ironframegrc.com/register/contact | 10–15 minute workflow review only. |

### Ironframe product truth (what we can honestly offer)

- **Demo surface:** https://ironframegrc.com/product-demo
- **CTA:** 10–15 minute workflow review — not Request Demo / free pilot.
- **Copy locks:** Mandate 16.
- **Held alternate:** docs/marketing-strategy/linkedin-drafts-hold-board-reporting-gap.md (Option 2 board-lens — future Monday).

### Pre-post checklist

- [ ] Opened each citation URL and confirmed the claim paraphrase still matches the source.
- [ ] Post body avoids Mandate 16 ban phrases.
- [ ] Copy body only (not this research block) into LinkedIn.
- [ ] Paste first-comment CTA immediately after publish.
- [ ] Calendar card Done with post URL after publish.
`;

export type LinkedInDraftId = "mon-heatmap" | "wed-product-demo" | "fri-collection";

export type LinkedInDraftCatalogEntry = {
  id: LinkedInDraftId;
  slotLabel: "Mon" | "Wed" | "Fri";
  slug: string;
  repoFile: string;
  /** Ops calendar sourceRef that marks this slot posted when DONE/CANCELLED. */
  opsSourceRef: string;
  defaultTitle: string;
  defaultBody: string;
  defaultResearch: string;
};

/** Ordered LinkedIn desk slots — listed like Briefings/Newsletters drafts. */
export const LINKEDIN_DRAFT_CATALOG: LinkedInDraftCatalogEntry[] = [
  {
    id: "mon-heatmap",
    slotLabel: "Mon",
    slug: "marketing-strategy/linkedin-drafts/mon-heatmap",
    repoFile: "docs/marketing-strategy/linkedin-drafts-mon-heatmap.md",
    opsSourceRef: "marketing/linkedin-2026-08-06-heatmap",
    defaultTitle: LINKEDIN_SUGGESTED_DRAFT_TITLE,
    defaultBody: LINKEDIN_SUGGESTED_DRAFT_BODY,
    defaultResearch: LINKEDIN_SUGGESTED_DRAFT_RESEARCH,
  },
  {
    id: "wed-product-demo",
    slotLabel: "Wed",
    slug: "marketing-strategy/linkedin-drafts/wed-product-demo",
    repoFile: "docs/marketing-strategy/linkedin-drafts-wed-product-demo.md",
    opsSourceRef: "marketing/linkedin-2026-07-23",
    defaultTitle: LINKEDIN_WED_DRAFT_TITLE,
    defaultBody: LINKEDIN_WED_DRAFT_BODY,
    defaultResearch: LINKEDIN_WED_DRAFT_RESEARCH,
  },
  {
    id: "fri-collection",
    slotLabel: "Fri",
    slug: "marketing-strategy/linkedin-drafts/fri-collection",
    repoFile: "docs/marketing-strategy/linkedin-drafts-week-1.md",
    opsSourceRef: "marketing/linkedin-2026-08-08-collection",
    defaultTitle: LINKEDIN_FRI_DRAFT_TITLE,
    defaultBody: LINKEDIN_FRI_DRAFT_BODY,
    defaultResearch: LINKEDIN_FRI_DRAFT_RESEARCH,
  },
];

export function linkedInDraftCatalogEntry(
  id: string | null | undefined,
): LinkedInDraftCatalogEntry | null {
  const key = (id ?? "").trim().toLowerCase();
  if (!key) return null;
  if (key === "suggested" || key === "friday" || key === "fri") {
    return LINKEDIN_DRAFT_CATALOG.find((e) => e.id === "fri-collection") ?? null;
  }
  if (key === "monday" || key === "mon" || key === "heatmap") {
    return LINKEDIN_DRAFT_CATALOG.find((e) => e.id === "mon-heatmap") ?? null;
  }
  if (key === "wednesday" || key === "wed") {
    return LINKEDIN_DRAFT_CATALOG.find((e) => e.id === "wed-product-demo") ?? null;
  }
  return LINKEDIN_DRAFT_CATALOG.find((e) => e.id === key) ?? null;
}

/** Default open slot on the LinkedIn desk (active post to publish). */
export const LINKEDIN_DEFAULT_DRAFT_ID: LinkedInDraftId = "fri-collection";

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

function tryWriteRepoMarkdown(markdown: string, repoFile: string): boolean {
  try {
    const absolute = path.join(process.cwd(), repoFile);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, markdown, "utf8");
    return true;
  } catch {
    return false;
  }
}

export type LinkedInDeskDraftResult = {
  ok: true;
  id: LinkedInDraftId;
  slotLabel: "Mon" | "Wed" | "Fri";
  slug: string;
  title: string;
  body: string;
  research: string;
  markdown: string;
  updatedAt: string | null;
  source: "app_document" | "suggested" | "seeded";
  repoSynced: boolean;
};

export type LinkedInDeskDraftListItem = {
  id: LinkedInDraftId;
  slotLabel: "Mon" | "Wed" | "Fri";
  slug: string;
  title: string;
  summary: string;
  bodyLength: number;
  citationCount: number;
  updatedAt: string | null;
  docsHref: string;
  /** True when the matching Ops calendar card is DONE or CANCELLED. */
  posted: boolean;
  /** Ops calendar status for this slot, if any. */
  calendarStatus: "PLANNED" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED" | null;
  opsSourceRef: string;
  calendarOutcome: string | null;
};


async function persistDraft(input: {
  entry: LinkedInDraftCatalogEntry;
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
    slug: input.entry.slug,
    title: input.title.trim() || input.entry.defaultTitle,
    content: markdown,
    readingLevel: inferReadingLevelFromSlug(input.entry.slug),
  });

  // Keep legacy week-1 slug mirrored for Fri (docs reader deep link).
  if (input.entry.id === "fri-collection") {
    await upsertAppDocument({
      slug: LINKEDIN_DRAFTS_APP_DOC_SLUG,
      title: input.title.trim() || input.entry.defaultTitle,
      content: markdown,
      readingLevel: inferReadingLevelFromSlug(LINKEDIN_DRAFTS_APP_DOC_SLUG),
    });
  }

  const parsed = parseLinkedInDeskMarkdown(row.content);
  const repoSynced = input.syncRepo
    ? tryWriteRepoMarkdown(row.content, input.entry.repoFile)
    : false;

  return {
    ok: true,
    id: input.entry.id,
    slotLabel: input.entry.slotLabel,
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

async function ensureCatalogDraft(
  entry: LinkedInDraftCatalogEntry,
): Promise<LinkedInDeskDraftResult> {
  const existing = await findAppDocumentBySlug(entry.slug);
  if (existing && /Research & verification/i.test(existing.content) && existing.content.trim().length > 80) {
    const parsed = parseLinkedInDeskMarkdown(existing.content);
    return {
      ok: true,
      id: entry.id,
      slotLabel: entry.slotLabel,
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

  // Migrate legacy week-1 doc into Fri slot when Fri is empty.
  if (entry.id === "fri-collection") {
    const legacy = await findAppDocumentBySlug(LINKEDIN_DRAFTS_APP_DOC_SLUG);
    if (
      legacy &&
      /Collection is not verification/i.test(legacy.content) &&
      /Research & verification/i.test(legacy.content)
    ) {
      const parsed = parseLinkedInDeskMarkdown(legacy.content);
      return persistDraft({
        entry,
        title: parsed.title || entry.defaultTitle,
        body: parsed.body,
        research: parsed.research || entry.defaultResearch,
        source: "app_document",
        syncRepo: true,
      });
    }
  }

  return persistDraft({
    entry,
    title: entry.defaultTitle,
    body: entry.defaultBody,
    research: entry.defaultResearch,
    source: "seeded",
    syncRepo: true,
  });
}

/** List Mon/Wed/Fri LinkedIn drafts (seeds defaults when missing). */
export async function listLinkedInDeskDraftsCore(): Promise<{
  drafts: LinkedInDeskDraftListItem[];
  activeDrafts: LinkedInDeskDraftListItem[];
  postedArchive: LinkedInDeskDraftListItem[];
  defaultId: LinkedInDraftId;
  counts: { total: number; active: number; posted: number };
}> {
  const sourceRefs = LINKEDIN_DRAFT_CATALOG.map((e) => e.opsSourceRef);
  const titles = LINKEDIN_DRAFT_CATALOG.map((e) => e.defaultTitle);
  const calendarRows = await prisma.opsActivity.findMany({
    where: {
      OR: [{ sourceRef: { in: sourceRefs } }, { title: { in: titles } }],
    },
    orderBy: { updatedAt: "desc" },
  });
  const calendarByRef = new Map<string, (typeof calendarRows)[number]>();
  const calendarByTitle = new Map<string, (typeof calendarRows)[number]>();
  for (const row of calendarRows) {
    if (row.sourceRef && !calendarByRef.has(row.sourceRef)) {
      calendarByRef.set(row.sourceRef, row);
    }
    if (row.title && !calendarByTitle.has(row.title)) {
      calendarByTitle.set(row.title, row);
    }
  }

  const drafts: LinkedInDeskDraftListItem[] = [];
  for (const entry of LINKEDIN_DRAFT_CATALOG) {
    const loaded = await ensureCatalogDraft(entry);
    const cal =
      calendarByRef.get(entry.opsSourceRef) ??
      calendarByTitle.get(entry.defaultTitle) ??
      calendarByTitle.get(loaded.title) ??
      null;
    const rawStatus = String(cal?.status ?? "")
      .trim()
      .toUpperCase();
    const calendarStatus = (rawStatus || null) as LinkedInDeskDraftListItem["calendarStatus"];
    const posted = calendarStatus === "DONE" || calendarStatus === "CANCELLED";
    drafts.push({
      id: loaded.id,
      slotLabel: loaded.slotLabel,
      slug: loaded.slug,
      title: loaded.title,
      summary: loaded.body.replace(/\s+/g, " ").trim().slice(0, 180),
      bodyLength: loaded.body.length,
      citationCount: extractLinkedInResearchCitationUrls(loaded.research).length,
      updatedAt: loaded.updatedAt,
      docsHref: `/docs/${loaded.slug}`,
      posted,
      calendarStatus,
      opsSourceRef: entry.opsSourceRef,
      calendarOutcome: cal?.outcome?.trim() || null,
    });
  }

  const activeDrafts = drafts.filter((d) => !d.posted);
  const postedArchive = drafts.filter((d) => d.posted);
  const defaultId =
    activeDrafts[0]?.id ?? postedArchive[0]?.id ?? LINKEDIN_DEFAULT_DRAFT_ID;

  return {
    drafts,
    activeDrafts,
    postedArchive,
    defaultId,
    counts: {
      total: drafts.length,
      active: activeDrafts.length,
      posted: postedArchive.length,
    },
  };
}

/**
 * Force-load the active suggested draft into APP_DOCS.
 * Active slot = Friday collection≠verification.
 */
export async function seedSuggestedLinkedInDeskDraftCore(): Promise<LinkedInDeskDraftResult> {
  return seedFridayLinkedInDeskDraftCore();
}

/** Force-load Friday collection≠verification draft into APP_DOCS. */
export async function seedFridayLinkedInDeskDraftCore(): Promise<LinkedInDeskDraftResult> {
  const entry = linkedInDraftCatalogEntry("fri-collection")!;
  return persistDraft({
    entry,
    title: entry.defaultTitle,
    body: entry.defaultBody,
    research: entry.defaultResearch,
    source: "seeded",
    syncRepo: true,
  });
}

/** Force-load Monday heatmap draft into APP_DOCS. */
export async function seedMondayLinkedInDeskDraftCore(): Promise<LinkedInDeskDraftResult> {
  const entry = linkedInDraftCatalogEntry("mon-heatmap")!;
  return persistDraft({
    entry,
    title: entry.defaultTitle,
    body: entry.defaultBody,
    research: entry.defaultResearch,
    source: "seeded",
    syncRepo: true,
  });
}

/**
 * Load LinkedIn paste drafts for the Publishing Desk workbench.
 * Pass `id` (or legacy seed flags) to select a catalog slot.
 */
export async function loadLinkedInDeskDraftCore(options?: {
  id?: string | null;
  seedSuggested?: boolean;
  seedFriday?: boolean;
  seedMonday?: boolean;
  resetTemplate?: boolean;
}): Promise<LinkedInDeskDraftResult> {
  if (options?.seedMonday) {
    return seedMondayLinkedInDeskDraftCore();
  }
  if (options?.seedFriday || options?.seedSuggested) {
    return seedFridayLinkedInDeskDraftCore();
  }

  const fromId =
    linkedInDraftCatalogEntry(options?.id) ??
    linkedInDraftCatalogEntry(LINKEDIN_DEFAULT_DRAFT_ID)!;

  if (options?.resetTemplate) {
    return persistDraft({
      entry: fromId,
      title: fromId.defaultTitle,
      body: fromId.defaultBody,
      research: fromId.defaultResearch,
      source: "seeded",
      syncRepo: true,
    });
  }

  return ensureCatalogDraft(fromId);
}

/**
 * Save LinkedIn paste drafts from the Publishing Desk workbench.
 */
export async function saveLinkedInDeskDraftCore(input: {
  id?: string | null;
  title?: string;
  body?: string;
  research?: string;
  markdown?: string;
}): Promise<LinkedInDeskDraftResult | { ok: false; error: string; status: number }> {
  const entry =
    linkedInDraftCatalogEntry(input.id) ??
    linkedInDraftCatalogEntry(LINKEDIN_DEFAULT_DRAFT_ID)!;

  let title = (input.title ?? "").trim();
  let body = (input.body ?? "").replace(/\r\n/g, "\n").trim();
  let research = (input.research ?? "").replace(/\r\n/g, "\n").trim();

  if ((!title || !body || !research) && input.markdown?.trim()) {
    const parsed = parseLinkedInDeskMarkdown(input.markdown);
    if (!title) title = parsed.title;
    if (!body) body = parsed.body;
    if (!research) research = parsed.research;
  }

  if (!title) title = entry.defaultTitle;
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
    entry,
    title,
    body,
    research,
    source: "app_document",
    syncRepo: true,
  });
}
