import "server-only";

import fs from "node:fs";
import path from "node:path";

import {
  findAppDocumentBySlug,
  upsertAppDocument,
} from "@/app/lib/server/appDocumentStore";
import {
  inferReadingLevelFromSlug,
  inferTitleFromMarkdown,
} from "@/lib/appDocumentSlug";

/** APP_DOCS slug — same path the /docs reader uses. */
export const LINKEDIN_DRAFTS_APP_DOC_SLUG = "marketing-strategy/linkedin-drafts-week-1";

const REPO_RELATIVE = path.join(
  "docs",
  "marketing-strategy",
  "linkedin-drafts-week-1.md",
);

const FALLBACK_MARKDOWN = `# Founder-led LinkedIn drafts — Week 1

**Publishing note:** Paste-ready drafts for manual publishing from the founder's LinkedIn. Edit here on the Publishing Desk LinkedIn tab, then copy into LinkedIn.

## Monday — heatmap vs dollars

Most GRC programs can color a risk red, amber, or green.

Fewer can answer the board question in dollars: what is the estimated exposure, in whole cents, for this scenario—and what assumptions produced that number?

Heatmaps are useful as context. They become theater when they are the only decision layer.

I'm happy to walk one evidence-to-exposure workflow with you in 10–15 minutes:
https://ironframegrc.com/register/contact

Also: https://ironframegrc.com/marketing/heatmap-amnesty

#GRC #RiskQuantification #CyberRisk #BoardRisk #Governance
`;

function readRepoMarkdown(): string | null {
  try {
    const absolute = path.join(process.cwd(), REPO_RELATIVE);
    if (!fs.existsSync(absolute)) return null;
    const raw = fs.readFileSync(absolute, "utf8");
    return raw.trim().length > 0 ? raw : null;
  } catch {
    return null;
  }
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
  markdown: string;
  updatedAt: string | null;
  source: "app_document" | "repo_file" | "fallback";
  repoSynced: boolean;
};

/**
 * Load LinkedIn paste drafts for the Publishing Desk workbench.
 * Prefers APP_DOCS; bootstraps from repo file (or fallback) into APP_DOCS when missing.
 */
export async function loadLinkedInDeskDraftCore(): Promise<LinkedInDeskDraftResult> {
  const existing = await findAppDocumentBySlug(LINKEDIN_DRAFTS_APP_DOC_SLUG);
  if (existing) {
    return {
      ok: true,
      slug: existing.slug,
      title: existing.title,
      markdown: existing.content,
      updatedAt: existing.updatedAt.toISOString(),
      source: "app_document",
      repoSynced: false,
    };
  }

  const fromRepo = readRepoMarkdown();
  const markdown = fromRepo ?? FALLBACK_MARKDOWN;
  const source = fromRepo ? ("repo_file" as const) : ("fallback" as const);
  const title = inferTitleFromMarkdown(markdown, LINKEDIN_DRAFTS_APP_DOC_SLUG);
  const row = await upsertAppDocument({
    slug: LINKEDIN_DRAFTS_APP_DOC_SLUG,
    title,
    content: markdown,
    readingLevel: inferReadingLevelFromSlug(LINKEDIN_DRAFTS_APP_DOC_SLUG),
  });

  return {
    ok: true,
    slug: row.slug,
    title: row.title,
    markdown: row.content,
    updatedAt: row.updatedAt.toISOString(),
    source,
    repoSynced: false,
  };
}

/**
 * Save LinkedIn paste drafts from the Publishing Desk workbench.
 * Persists to APP_DOCS (so /docs/… works) and best-effort repo file locally.
 */
export async function saveLinkedInDeskDraftCore(markdownInput: string): Promise<
  | LinkedInDeskDraftResult
  | { ok: false; error: string; status: number }
> {
  const markdown = markdownInput.replace(/\r\n/g, "\n");
  if (markdown.trim().length < 40) {
    return {
      ok: false,
      error: "Draft is too short — paste or write the LinkedIn copy before saving.",
      status: 400,
    };
  }

  const title = inferTitleFromMarkdown(markdown, LINKEDIN_DRAFTS_APP_DOC_SLUG);
  const row = await upsertAppDocument({
    slug: LINKEDIN_DRAFTS_APP_DOC_SLUG,
    title,
    content: markdown,
    readingLevel: inferReadingLevelFromSlug(LINKEDIN_DRAFTS_APP_DOC_SLUG),
  });
  const repoSynced = tryWriteRepoMarkdown(row.content);

  return {
    ok: true,
    slug: row.slug,
    title: row.title,
    markdown: row.content,
    updatedAt: row.updatedAt.toISOString(),
    source: "app_document",
    repoSynced,
  };
}
