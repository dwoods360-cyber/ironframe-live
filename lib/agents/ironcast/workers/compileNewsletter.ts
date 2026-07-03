/**
 * Ironcast (Agent 7) — Governance Frame newsletter compilation worker.
 * Scans `docs/published-briefings/*.md` only; quarantines `docs/briefing-queue/`.
 * Triggers during the publication sequence to produce pure HTML payloads for outbound routing.
 */

import fs from "fs";
import path from "path";

import {
  enforceBriefingQuarantine,
  loadBriefingBySlug,
  loadPublishedBriefings,
  type GovernanceBriefing,
} from "@/app/lib/governanceFrame/briefingFilesystemLedger";
import { briefingBodyMarkdown } from "@/app/lib/governanceFrame/briefingMarkdown";
import { stripDangerousMarkdown } from "@/app/lib/governanceFrame/sanitizeMarkdown";

import {
  compileGovernanceFrameEmail,
  type GovernanceFrameEmailCompiled,
} from "@/lib/agents/ironcast/templates/governanceFrameEmail";

export type CompiledGovernanceNewsletter = GovernanceFrameEmailCompiled & {
  filename: string;
  title: string;
  publishedAt: string;
};

export type GovernancePublicationCompileResult = {
  compiled: CompiledGovernanceNewsletter[];
  skippedSlugs: string[];
  quarantineWarnings: string[];
};

function briefingToCompiled(briefing: GovernanceBriefing): CompiledGovernanceNewsletter {
  const email = compileGovernanceFrameEmail({
    slug: briefing.slug,
    title: briefing.title,
    publishedAt: briefing.publishedAt,
    markdown: briefing.markdown,
    author: briefing.author,
    classification: briefing.classification,
  });

  return {
    ...email,
    filename: briefing.filename,
    title: briefing.title,
    publishedAt: briefing.publishedAt,
  };
}

/**
 * Compile every approved published briefing into email HTML assets.
 * Mirrors the web feed corpus — no database or network I/O.
 */
export function compileAllGovernanceFrameNewsletters(): CompiledGovernanceNewsletter[] {
  return loadPublishedBriefings().map(briefingToCompiled);
}

/** Compile a single briefing by slug (published ledger only). */
export function compileGovernanceFrameNewsletterBySlug(
  slug: string,
): CompiledGovernanceNewsletter | null {
  const briefing = loadBriefingBySlug(slug);
  if (!briefing) return null;
  return briefingToCompiled(briefing);
}

/**
 * Publication-sequence entry point: scan approved markdown, enforce quarantine,
 * emit compiled newsletter payloads for Ironcast routing.
 */
export function runGovernanceFramePublicationCompile(options?: {
  /** When set, compile only these slugs (must exist in published ledger). */
  slugs?: string[];
  docsRoot?: string;
}): GovernancePublicationCompileResult {
  const quarantineWarnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = ((message?: unknown, ..._rest: unknown[]) => {
    if (typeof message === "string" && message.includes("[SECURITY AUDIT]")) {
      quarantineWarnings.push(message);
    }
    originalWarn(message);
  }) as typeof console.warn;

  try {
    const briefings = loadPublishedBriefings(options?.docsRoot);
    const targetSlugs = options?.slugs?.map((s) => s.trim().toLowerCase()).filter(Boolean);
    const selected =
      targetSlugs && targetSlugs.length > 0
        ? briefings.filter((b) => targetSlugs.includes(b.slug.toLowerCase()))
        : briefings;

    const skippedSlugs =
      targetSlugs?.filter((slug) => !selected.some((b) => b.slug.toLowerCase() === slug)) ?? [];

    const compiled = selected.map(briefingToCompiled);

    return { compiled, skippedSlugs, quarantineWarnings };
  } finally {
    console.warn = originalWarn;
  }
}

/**
 * Optional filesystem artifact write for publication handoff (e.g. CI or local preview).
 * Writes `{slug}.html` under `out/governance-frame/newsletters/` by default.
 */
export function writeCompiledNewsletterArtifacts(
  compiled: CompiledGovernanceNewsletter[],
  outputDir = path.join(process.cwd(), "out", "governance-frame", "newsletters"),
): string[] {
  fs.mkdirSync(outputDir, { recursive: true });
  const written: string[] = [];

  for (const item of compiled) {
    const target = path.join(outputDir, `${item.slug}.html`);
    fs.writeFileSync(target, item.html, "utf-8");
    written.push(target);
  }

  return written;
}

/** Structural validation — ensures compiled HTML is presentation-only. */
export function assertNewsletterPresentationSafety(html: string): void {
  if (/<script\b/i.test(html)) {
    throw new Error("Governance Frame newsletter HTML must not contain script tags.");
  }
  if (/\bon\w+\s*=/i.test(html)) {
    throw new Error("Governance Frame newsletter HTML must not contain inline event handlers.");
  }
  if (/javascript:/i.test(html)) {
    throw new Error("Governance Frame newsletter HTML must not contain javascript: URIs.");
  }
}

/** Preview helper — first ~400 chars of exposure vector for Ironcast subject routing. */
export function newsletterExcerpt(markdown: string, title: string): string {
  const body = briefingBodyMarkdown(stripDangerousMarkdown(markdown), title);
  const exposure = body.match(/###\s+I\.\s*Exposure Vector\s*\n+([\s\S]*?)(?=###\s+II\.|$)/i);
  const text = (exposure?.[1] ?? body).replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  return text.slice(0, 400);
}

export { enforceBriefingQuarantine };
