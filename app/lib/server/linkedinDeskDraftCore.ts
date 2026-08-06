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

/** Suggested Mon slot — heatmap vs dollars (calendar `marketing/linkedin-2026-07-21`). */
export const LINKEDIN_SUGGESTED_DRAFT_TITLE =
  "LinkedIn Mon — Heatmap theater vs dollar-risk clarity";

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

export function composeLinkedInDeskMarkdown(title: string, body: string): string {
  const cleanTitle = title.trim() || LINKEDIN_SUGGESTED_DRAFT_TITLE;
  const cleanBody = body.replace(/\r\n/g, "\n").trim();
  return `# ${cleanTitle}\n\n${cleanBody}\n`;
}

export function parseLinkedInDeskMarkdown(markdown: string): {
  title: string;
  body: string;
} {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  const match = normalized.match(/^#\s+(.+)\n+([\s\S]*)$/);
  if (match) {
    return {
      title: match[1].trim(),
      body: match[2].trim(),
    };
  }
  return {
    title: LINKEDIN_SUGGESTED_DRAFT_TITLE,
    body: normalized,
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
  markdown: string;
  updatedAt: string | null;
  source: "app_document" | "suggested" | "seeded";
  repoSynced: boolean;
};

async function persistDraft(input: {
  title: string;
  body: string;
  source: LinkedInDeskDraftResult["source"];
  syncRepo: boolean;
}): Promise<LinkedInDeskDraftResult> {
  const markdown = composeLinkedInDeskMarkdown(input.title, input.body);
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
    markdown: row.content,
    updatedAt: row.updatedAt.toISOString(),
    source: input.source,
    repoSynced,
  };
}

/**
 * Force-load the suggested heatmap LinkedIn draft (title + body) into APP_DOCS.
 */
export async function seedSuggestedLinkedInDeskDraftCore(): Promise<LinkedInDeskDraftResult> {
  return persistDraft({
    title: LINKEDIN_SUGGESTED_DRAFT_TITLE,
    body: LINKEDIN_SUGGESTED_DRAFT_BODY,
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
    if (looksLikeWeek1Archive) {
      // Upgrade the archive corpus row to the focused suggested Mon draft.
      return seedSuggestedLinkedInDeskDraftCore();
    }
    const parsed = parseLinkedInDeskMarkdown(existing.content);
    return {
      ok: true,
      slug: existing.slug,
      title: existing.title?.trim() || parsed.title,
      body: parsed.body,
      markdown: existing.content,
      updatedAt: existing.updatedAt.toISOString(),
      source: "app_document",
      repoSynced: false,
    };
  }

  return persistDraft({
    title: LINKEDIN_SUGGESTED_DRAFT_TITLE,
    body: LINKEDIN_SUGGESTED_DRAFT_BODY,
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
  markdown?: string;
}): Promise<LinkedInDeskDraftResult | { ok: false; error: string; status: number }> {
  let title = (input.title ?? "").trim();
  let body = (input.body ?? "").replace(/\r\n/g, "\n").trim();

  if ((!title || !body) && input.markdown?.trim()) {
    const parsed = parseLinkedInDeskMarkdown(input.markdown);
    if (!title) title = parsed.title;
    if (!body) body = parsed.body;
  }

  if (!title) title = LINKEDIN_SUGGESTED_DRAFT_TITLE;
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
    source: "app_document",
    syncRepo: true,
  });
}
