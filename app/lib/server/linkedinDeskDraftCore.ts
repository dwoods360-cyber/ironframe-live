import "server-only";

import fs from "node:fs";
import path from "node:path";

import {
  extractIndependentLinkedInCitationUrls,
  extractLinkedInResearchCitationUrls,
  isLinkedInOpsSourceRef,
  linkedInDeskAppDocSlug,
  linkedInDeskIdFromSourceRef,
  linkedInSlotLabelFromTitleOrDue,
} from "@/app/lib/linkedinDeskIds";
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
| [Paste claim from post] | [What source actually says — no stretch] | [Independent https://… required] · [GF https://research.ironframegrc.com/briefings/… when published] | [Specific Ironframe control/workflow — Mandate 16 safe] |
| | | | |

### Ironframe product truth (what we can honestly offer)

- Relief path: Controls → evidence → scenarios → estimated financial exposure (ranges) → mitigation cost → residual.
- Campaign / product page: …
- Copy locks / bans: Mandate 16 — never invent regulator mandates or competitor incapability.
- Integrity: dollar figures only when estimated exposure is stored as whole-cent integers.

### Pre-post checklist

- [ ] Opened each citation URL and confirmed the claim paraphrase still matches the source.
- [ ] At least one **outside/independent** citation (not *.ironframegrc.com).
- [ ] When a published GF briefing maps the theme, include it as a **secondary** cite (research.ironframegrc.com/briefings/…) — does not replace independent.
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
| Color dashboards / point-in-time packs under-answer decision provenance | GF published: quantitative risk without false precision; color dashboards alone cannot establish evidence integrity or decision provenance | Secondary GF: https://research.ironframegrc.com/briefings/2026-03-12-market-grc-2019-today · Current pain themes: https://research.ironframegrc.com/briefings/2026-07-15-research-grc-current-pain | Same Heatmap Amnesty / Control-to-Capital relief path (Mandate 16). |
| SEC / disclosure raises accountability for material cyber impact | U.S. public-company cyber disclosure (Item 1.05 / Item 106 regime) increases accountability; materiality includes **quantitative and qualitative** factors — **not** a mandate to use FAIR/ALE | SEC cybersecurity disclosure rules (verify current rule text / adopting release before any absolute claim): start at https://www.sec.gov/ and search “cybersecurity risk management strategy governance and incident disclosure”. Internal claim lock: \`docs/sales/control-to-capital-market-narrative.md\`. | Dollars improve defensibility of board/export artifacts; never claim “SEC requires FAIR.” |

### Ironframe product truth (what we can honestly offer)

- **Relief path:** Controls → evidence → scenarios → estimated financial exposure (ranges) → mitigation cost → residual exposure, with hard tenant isolation (\`docs/sales/control-to-capital-market-narrative.md\`).
- **Campaign page:** https://ironframegrc.com/marketing/heatmap-amnesty
- **Copy locks / bans:** \`docs/sales/heatmap-amnesty-campaign.md\`, Mandate 16 in glossary — never “boards are rejecting heatmaps,” “SEC requires FAIR,” “competitors cannot quantify,” or “true ALE.”
- **Integrity:** exposure stored as whole-cent / BigInt integers — display dollars only as presentation.

### Pre-post checklist

- [ ] Opened each citation URL and confirmed the claim paraphrase still matches the source.
- [ ] At least one **outside/independent** citation (not *.ironframegrc.com).
- [ ] When a published GF briefing maps the theme, include it as a **secondary** cite (research.ironframegrc.com/briefings/…) — does not replace independent.
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
| Collection is not verification | Cloud-era GRC improved collection speed; assurance still requires validation, legal-entity scope, durable provenance, access isolation, and human interpretation | NIST SP 800-53 Rev. 5 emphasizes system and communications protection / access control boundaries — collection alone is not assurance: https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final · GF published briefing (secondary): https://research.ironframegrc.com/briefings/2026-05-14-connector-count-sovereign-enclaves · Part 2: https://research.ironframegrc.com/briefings/2026-02-12-market-grc-2009-2018 | Hard tenant enclaves + quarantine-before-persist + HITL before cross-entity export — not connector-count theater. |
| Auditor asks source / entity / authorization | Assurance asks provenance, scope, and who authorized the assertion — connector count alone does not answer | Same NIST SP 800-53 Rev. 5 link · https://research.ironframegrc.com/briefings/2026-05-14-connector-count-sovereign-enclaves | Evidence objects carry tenant scope; exports require human authorization across entity boundaries. |
| Tag-only tenancy blends client evidence | Soft separation (labels/tags in a shared repo) can allow cross-client bleed in workflows | Product narrative (Ironframe): https://ironframegrc.com/docs/sales/control-to-capital-market-narrative | System-enforced tenant boundaries (not tag-only); MSSP/multi-entity Path B design. |
| Hard boundaries + quarantine + human auth | Control-first pattern for multi-entity operators | CTA: https://ironframegrc.com/register/contact | Workflow review walks one multi-entity evidence path in 10–15 minutes. |

### Ironframe product truth (what we can honestly offer)

- **Relief path:** Hard tenant isolation → quarantine before persistence → human authorization before cross-entity export.
- **Copy locks / bans:** Mandate 16 — no competitor incapability claims; no invented regulator mandates.
- **CTA:** 10–15 minute workflow review only (not free pilot / Request Demo).

### Pre-post checklist

- [ ] Opened each citation URL and confirmed the claim paraphrase still matches the source.
- [ ] At least one **outside/independent** citation (not *.ironframegrc.com).
- [ ] When a published GF briefing maps the theme, include it as a **secondary** cite (research.ironframegrc.com/briefings/…) — does not replace independent.
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
| Feature lists / color dashboards vs evidence→exposure pipeline | Boards/finance need decision-useful cyber risk in business terms — feature tours and color dashboards alone under-answer financial exposure questions | NACD Principle 5 (measurement & reporting): https://www.nacdonline.org/all-governance/governance-resources/governance-research/director-handbooks/2026-cyber-risk-oversight/cyber-risk-handbook-principles-2026/principle-5-guide-cybersecurity-risk-measurement-reporting/ · FAIR overview: https://www.fairinstitute.org/what-is-fair · Secondary GF: https://research.ironframegrc.com/briefings/2026-03-12-market-grc-2019-today | /product-demo is the public bounded walkthrough surface. |
| One primary link in body (demo); contact in first comment | Cadence: one primary link per post; CTA is workflow review, not free pilot | Contact: https://ironframegrc.com/register/contact · Cadence: https://ironframegrc.com/docs/marketing-strategy/linkedin-founder-cadence | 10–15 minute workflow review only. |

### Ironframe product truth (what we can honestly offer)

- **Demo surface:** https://ironframegrc.com/product-demo
- **CTA:** 10–15 minute workflow review — not Request Demo / free pilot.
- **Copy locks:** Mandate 16.
- **Held alternate:** docs/marketing-strategy/linkedin-drafts-hold-board-reporting-gap.md (Option 2 board-lens — future Monday).

### Pre-post checklist

- [ ] Opened each citation URL and confirmed the claim paraphrase still matches the source.
- [ ] At least one **outside/independent** citation (not *.ironframegrc.com).
- [ ] When a published GF briefing maps the theme, include it as a **secondary** cite (research.ironframegrc.com/briefings/…) — does not replace independent.
- [ ] Post body avoids Mandate 16 ban phrases.
- [ ] Copy body only (not this research block) into LinkedIn.
- [ ] Paste first-comment CTA immediately after publish.
- [ ] Calendar card Done with post URL after publish.
`;

export type LinkedInDraftId = string;

export type LinkedInDraftCatalogEntry = {
  id: LinkedInDraftId;
  slotLabel: string;
  slug: string;
  repoFile: string;
  /** Ops calendar sourceRef that marks this slot posted when DONE/CANCELLED. */
  opsSourceRef: string;
  defaultTitle: string;
  defaultBody: string;
  defaultResearch: string;
  /** Optional due date from Ops calendar (ISO) for ordering. */
  dueAt?: string | null;
};

/** Optional repo markdown maps for calendar-created LinkedIn cards. */
const LINKEDIN_SOURCE_REF_REPO_FILE: Record<string, string> = {
  "marketing/linkedin-2026-08-06-heatmap":
    "docs/marketing-strategy/linkedin-drafts-mon-heatmap.md",
  "marketing/linkedin-2026-07-23":
    "docs/marketing-strategy/linkedin-drafts-wed-product-demo.md",
  "marketing/linkedin-2026-08-08-collection":
    "docs/marketing-strategy/linkedin-drafts-week-1.md",
  "marketing/linkedin-2026-08-11-ai-evidence":
    "docs/marketing-strategy/linkedin-drafts-next-ai-evidence-hitl.md",
  "marketing/linkedin-2026-08-14-residual":
    "docs/marketing-strategy/linkedin-drafts-next-residual-vs-spend.md",
  "marketing/linkedin-2026-08-17-ccm":
    "docs/marketing-strategy/linkedin-drafts-2026-08-17-ccm.md",
  "marketing/linkedin-2026-08-19-board-delta":
    "docs/marketing-strategy/linkedin-drafts-2026-08-19-board-delta.md",
  "marketing/linkedin-2026-08-21-tprm":
    "docs/marketing-strategy/linkedin-drafts-2026-08-21-tprm.md",
  "marketing/linkedin-2026-08-24-shared-stack":
    "docs/marketing-strategy/linkedin-drafts-2026-08-24-shared-stack-evidence.md",
  "marketing/linkedin-2026-08-26-board-export":
    "docs/marketing-strategy/linkedin-drafts-2026-08-26-board-export-isolation.md",
  "marketing/linkedin-2026-09-15-ma-security-debt":
    "docs/marketing-strategy/linkedin-drafts-2026-09-15-ma-security-debt.md",
  "marketing/linkedin-2026-09-08-heatmap-callback":
    "docs/marketing-strategy/linkedin-drafts-2026-09-08-heatmap-callback.md",
  "marketing/linkedin-2026-09-12-enclaves-callback":
    "docs/marketing-strategy/linkedin-drafts-2026-09-12-enclaves-callback.md",
};

/** Ordered static LinkedIn desk slots (week-1 canon). Dynamic calendar slots merge in. */
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

function tryReadRepoMarkdown(repoFile: string): string | null {
  try {
    const absolute = path.join(process.cwd(), repoFile);
    if (!fs.existsSync(absolute)) return null;
    return fs.readFileSync(absolute, "utf8");
  } catch {
    return null;
  }
}

/** Parse founder LinkedIn markdown packs (body + research; strip first-comment from paste body). */
export function parseLinkedInRepoPackMarkdown(markdown: string): {
  title: string;
  body: string;
  research: string;
} {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  const titleMatch = normalized.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() || "LinkedIn draft";
  let rest = normalized.replace(/^#\s+.+\n+/, "").trim();

  // Drop operator planning front matter (**Slot intent:** … ---).
  rest = stripLinkedInOperatorFrontMatter(rest);

  const researchSplit = rest.split(
    /\n---\n+\s*## Research & verification[^\n]*\n+/i,
  );
  let bodyPart = researchSplit[0]?.trim() ?? rest;
  let research =
    researchSplit.length >= 2
      ? researchSplit.slice(1).join("\n---\n").trim()
      : "";

  // Keep first-comment instructions in research, not in LinkedIn paste body.
  const firstCommentSplit = bodyPart.split(
    /\n---\n+\s*## First comment[^\n]*\n+/i,
  );
  if (firstCommentSplit.length >= 2) {
    bodyPart = firstCommentSplit[0].trim();
    const firstComment = firstCommentSplit.slice(1).join("\n").trim();
    research = [
      "### First comment (post immediately after publish — do not put in main body)\n\n" +
        firstComment,
      research,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (!research.trim()) research = LINKEDIN_RESEARCH_TEMPLATE;
  // Ensure research heading content is usable as the research pane (no duplicate H1).
  if (!/^Use this section/i.test(research) && !/^### /m.test(research)) {
    research = `Use this section to verify that each public claim is real and that Ironframe can relieve the pain — not as LinkedIn copy.\n\n${research}`;
  }

  return { title, body: bodyPart.trim(), research: research.trim() };
}

function repoFileForSourceRef(sourceRef: string, hintHref?: string | null): string {
  const mapped = LINKEDIN_SOURCE_REF_REPO_FILE[sourceRef];
  if (mapped) return mapped;
  const href = (hintHref ?? "").trim();
  if (href.startsWith("/docs/")) {
    return `${href.slice(1)}.md`.replace(/\.md\.md$/i, ".md");
  }
  if (href.startsWith("docs/") && href.endsWith(".md")) return href;
  const id = linkedInDeskIdFromSourceRef(sourceRef) ?? "slot";
  return `docs/marketing-strategy/linkedin-drafts-${id}.md`;
}

function entryFromStaticOrCalendar(input: {
  opsSourceRef: string;
  title: string;
  dueAt?: Date | string | null;
  href?: string | null;
}): LinkedInDraftCatalogEntry {
  const staticHit = LINKEDIN_DRAFT_CATALOG.find(
    (e) => e.opsSourceRef === input.opsSourceRef,
  );
  if (staticHit) {
    return {
      ...staticHit,
      dueAt:
        typeof input.dueAt === "string"
          ? input.dueAt
          : input.dueAt?.toISOString?.() ?? null,
    };
  }

  const id = linkedInDeskIdFromSourceRef(input.opsSourceRef);
  if (!id) {
    throw new Error(`Not a LinkedIn ops sourceRef: ${input.opsSourceRef}`);
  }
  const repoFile = repoFileForSourceRef(input.opsSourceRef, input.href);
  const fromRepo = tryReadRepoMarkdown(repoFile);
  const parsed = fromRepo
    ? parseLinkedInRepoPackMarkdown(fromRepo)
    : {
        title: input.title,
        body:
          `${input.title}\n\n(Draft body — paste ready copy before publishing.)\n\nhttps://ironframegrc.com/register/contact\n\n#GRC`,
        research: LINKEDIN_RESEARCH_TEMPLATE,
      };

  return {
    id,
    slotLabel: linkedInSlotLabelFromTitleOrDue(input.title, input.dueAt),
    slug: linkedInDeskAppDocSlug(id),
    repoFile,
    opsSourceRef: input.opsSourceRef,
    defaultTitle: parsed.title || input.title,
    defaultBody: parsed.body,
    defaultResearch: parsed.research || LINKEDIN_RESEARCH_TEMPLATE,
    dueAt:
      typeof input.dueAt === "string"
        ? input.dueAt
        : input.dueAt?.toISOString?.() ?? null,
  };
}

/**
 * Full desk catalog = static week-1 slots ∪ every Ops `marketing/linkedin*` card.
 * Creating a LinkedIn calendar activity is enough to surface a Drafts slot.
 */
export async function resolveLinkedInDeskCatalog(): Promise<LinkedInDraftCatalogEntry[]> {
  const rows = await prisma.opsActivity.findMany({
    where: { sourceRef: { startsWith: "marketing/linkedin" } },
    orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
  });

  const byRef = new Map<string, LinkedInDraftCatalogEntry>();
  for (const entry of LINKEDIN_DRAFT_CATALOG) {
    byRef.set(entry.opsSourceRef, { ...entry });
  }
  for (const row of rows) {
    const ref = (row.sourceRef ?? "").trim();
    if (!isLinkedInOpsSourceRef(ref)) continue;
    const built = entryFromStaticOrCalendar({
      opsSourceRef: ref,
      title: row.title,
      dueAt: row.dueAt,
      href: null,
    });
    const prev = byRef.get(ref);
    byRef.set(ref, {
      ...built,
      // Prefer static template defaults when present; keep calendar title/due.
      defaultTitle: prev?.defaultTitle || built.defaultTitle,
      defaultBody: prev?.defaultBody || built.defaultBody,
      defaultResearch: prev?.defaultResearch || built.defaultResearch,
      repoFile: prev?.repoFile || built.repoFile,
      slug: prev?.slug || built.slug,
      id: prev?.id || built.id,
      slotLabel: linkedInSlotLabelFromTitleOrDue(row.title, row.dueAt),
      dueAt: row.dueAt.toISOString(),
    });
  }

  return [...byRef.values()].sort((a, b) => {
    const aDue = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
    const bDue = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;
    return a.id.localeCompare(b.id);
  });
}

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

export async function findLinkedInDeskCatalogEntry(
  id: string | null | undefined,
): Promise<LinkedInDraftCatalogEntry | null> {
  const key = (id ?? "").trim().toLowerCase();
  if (!key) return null;
  const legacy = linkedInDraftCatalogEntry(key);
  if (legacy) return legacy;
  const catalog = await resolveLinkedInDeskCatalog();
  return catalog.find((e) => e.id.toLowerCase() === key) ?? null;
}

/** Default open slot preference when nothing else is active. */
export const LINKEDIN_DEFAULT_DRAFT_ID: LinkedInDraftId = "fri-collection";

export {
  extractGovernanceFrameCitationUrls,
  extractIndependentLinkedInCitationUrls,
  extractLinkedInResearchCitationUrls,
  isGovernanceFrameCitationUrl,
  isIronframeCitationUrl,
} from "@/app/lib/linkedinDeskIds";

export function composeLinkedInDeskMarkdown(
  title: string,
  body: string,
  research: string,
): string {
  const cleanTitle = title.trim() || LINKEDIN_SUGGESTED_DRAFT_TITLE;
  const cleanBody = stripLinkedInOperatorFrontMatter(body.replace(/\r\n/g, "\n").trim());
  const cleanResearch = research.replace(/\r\n/g, "\n").trim();
  return `# ${cleanTitle}\n\n${cleanBody}\n\n---\n\n${RESEARCH_HEADING}\n\n${cleanResearch}\n`;
}

/**
 * Strip operator planning front matter (**Slot intent:** … ---) from paste body.
 * Keys use bold-with-colon-inside (`**Label:**`), not `**Label**:`.
 */
export function stripLinkedInOperatorFrontMatter(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  // Full front-matter block ending at the first thematic break.
  let result = normalized.replace(
    /^(?:\*\*[^*\n]+?:\*\*[^\n]*\n+)+\n---\n+/m,
    "",
  );
  if (result === normalized) {
    // Orphan bold meta lines at the top (no ---).
    result = normalized
      .replace(/^(?:\*\*[^*\n]+?:\*\*[^\n]*\n+)+/m, "")
      .replace(/^---\n+/, "")
      .trim();
  } else {
    result = result.trim();
  }
  // Operator-only board-voice guidance (not LinkedIn paste body).
  result = result
    .replace(
      /^### Board voice \(founder cadence\)\n\n(?:- [^\n]+\n)+\n---\n+/m,
      "",
    )
    .trim();
  return result;
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
      body: stripLinkedInOperatorFrontMatter(researchSplit[0].trim()),
      research: researchSplit.slice(1).join("\n---\n").trim(),
    };
  }

  return {
    title,
    body: stripLinkedInOperatorFrontMatter(rest),
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

/** Stale APP_DOCS seed when calendar card existed before repo markdown was deployed. */
export function isLinkedInDeskPlaceholderBody(body: string): boolean {
  const trimmed = body.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return true;
  if (/\(Draft body — paste ready copy before publishing\.\)/i.test(trimmed)) {
    return true;
  }
  // Title-only fallback seeded from calendar card title + minimal CTA/hashtag stub.
  const lines = trimmed.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 4 && /^LinkedIn\s/i.test(lines[0] ?? "")) {
    const hasOnlyCtaAndHashtag = lines.every(
      (line) =>
        /^LinkedIn\s/i.test(line) ||
        /^https?:\/\//i.test(line) ||
        /^#\w/.test(line),
    );
    if (hasOnlyCtaAndHashtag && trimmed.length < 280) return true;
  }
  return false;
}

function loadRepoPackForEntry(
  entry: LinkedInDraftCatalogEntry,
): { title: string; body: string; research: string } | null {
  const raw = tryReadRepoMarkdown(entry.repoFile);
  if (!raw?.trim()) return null;
  const parsed = parseLinkedInRepoPackMarkdown(raw);
  if (isLinkedInDeskPlaceholderBody(parsed.body)) return null;
  if (parsed.body.trim().length < 80) return null;
  if (!/Research & verification/i.test(parsed.research) && !parsed.research.trim()) {
    return null;
  }
  return parsed;
}

export type LinkedInDeskDraftResult = {
  ok: true;
  id: LinkedInDraftId;
  slotLabel: string;
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
  slotLabel: string;
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
  dueAt?: string | null;
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
  const repoPack = loadRepoPackForEntry(entry);
  const existing = await findAppDocumentBySlug(entry.slug);
  if (existing && /Research & verification/i.test(existing.content) && existing.content.trim().length > 80) {
    const parsed = parseLinkedInDeskMarkdown(existing.content);
    const stalePlaceholder = isLinkedInDeskPlaceholderBody(parsed.body);
    if (!stalePlaceholder) {
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
    // APP_DOCS holds a calendar stub — replace from repo when available.
    if (repoPack) {
      return persistDraft({
        entry,
        title: repoPack.title || entry.defaultTitle,
        body: repoPack.body,
        research: repoPack.research || entry.defaultResearch,
        source: "seeded",
        syncRepo: true,
      });
    }
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

  if (repoPack) {
    return persistDraft({
      entry,
      title: repoPack.title || entry.defaultTitle,
      body: repoPack.body,
      research: repoPack.research || entry.defaultResearch,
      source: "seeded",
      syncRepo: true,
    });
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

/** List all LinkedIn drafts (static ∪ calendar-created). Seeds APP_DOCS when missing. */
export async function listLinkedInDeskDraftsCore(): Promise<{
  drafts: LinkedInDeskDraftListItem[];
  activeDrafts: LinkedInDeskDraftListItem[];
  postedArchive: LinkedInDeskDraftListItem[];
  defaultId: LinkedInDraftId;
  counts: { total: number; active: number; posted: number };
}> {
  const catalog = await resolveLinkedInDeskCatalog();
  const sourceRefs = catalog.map((e) => e.opsSourceRef);
  const titles = catalog.map((e) => e.defaultTitle);
  const calendarRows = await prisma.opsActivity.findMany({
    where: {
      OR: [
        { sourceRef: { in: sourceRefs } },
        { sourceRef: { startsWith: "marketing/linkedin" } },
        { title: { in: titles } },
      ],
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
  for (const entry of catalog) {
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
      dueAt: entry.dueAt ?? cal?.dueAt?.toISOString?.() ?? null,
    });
  }

  // Active first (soonest due), then published archive (newest due first).
  const activeDrafts = drafts
    .filter((d) => !d.posted)
    .sort((a, b) => {
      const aDue = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
      const bDue = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
      return aDue - bDue;
    });
  const postedArchive = drafts
    .filter((d) => d.posted)
    .sort((a, b) => {
      const aDue = a.dueAt ? Date.parse(a.dueAt) : 0;
      const bDue = b.dueAt ? Date.parse(b.dueAt) : 0;
      return bDue - aDue;
    });
  const defaultId =
    activeDrafts[0]?.id ?? postedArchive[0]?.id ?? LINKEDIN_DEFAULT_DRAFT_ID;

  return {
    drafts: [...activeDrafts, ...postedArchive],
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
 * Creation path: when an Ops LinkedIn calendar card exists/is seeded, ensure
 * the matching Publishing Desk draft slot (APP_DOCS) is ready.
 */
export async function ensureLinkedInDeskDraftForOpsActivity(input: {
  sourceRef: string;
  title: string;
  dueAt?: Date | string | null;
  href?: string | null;
}): Promise<LinkedInDeskDraftResult | null> {
  if (!isLinkedInOpsSourceRef(input.sourceRef)) return null;
  const entry = entryFromStaticOrCalendar({
    opsSourceRef: input.sourceRef.trim(),
    title: input.title,
    dueAt: input.dueAt,
    href: input.href,
  });
  return ensureCatalogDraft(entry);
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
    (await findLinkedInDeskCatalogEntry(options?.id)) ??
    (await findLinkedInDeskCatalogEntry(LINKEDIN_DEFAULT_DRAFT_ID))!;

  if (options?.resetTemplate) {
    const repoPack = loadRepoPackForEntry(fromId);
    return persistDraft({
      entry: fromId,
      title: repoPack?.title ?? fromId.defaultTitle,
      body: repoPack?.body ?? fromId.defaultBody,
      research: repoPack?.research ?? fromId.defaultResearch,
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
    (await findLinkedInDeskCatalogEntry(input.id)) ??
    (await findLinkedInDeskCatalogEntry(LINKEDIN_DEFAULT_DRAFT_ID))!;

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
  if (extractIndependentLinkedInCitationUrls(research).length < 1) {
    return {
      ok: false,
      error:
        "Research & citations must include at least one outside/independent URL (not *.ironframegrc.com) — e.g. NIST, NACD, FAIR Institute, EUR-Lex, ISACA.",
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
