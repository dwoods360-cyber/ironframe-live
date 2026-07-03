import type { IronframeDocumentationBrief } from "../types/ironframeDocumentationBrief.js";
import { resolveCorpusDocument } from "../types/ironframeDocumentationBrief.js";
import type { TrainingChapterManifestEntry } from "../config/trainingCorpusLoader.js";
import { loadTrainingCorpusManifest } from "../config/trainingCorpusLoader.js";

const MAX_CANONICAL_CHARS = 14_000;
const MAX_PEER_EXCERPT_CHARS = 6_000;
const MAX_BLUEPRINT_CHARS = 8_000;

/** Routes always permitted in training copy (ingress + handbook). */
const ALWAYS_ALLOWED_ROUTES = new Set([
  "/",
  "/login",
  "/docs",
  "/unauthorized",
  "/register",
  "/get-started",
  "/integrity",
  "/cockpit",
  "/board-report",
  "/pricing",
  "/terms",
  "/privacy",
]);

export const TRAINING_APP_DOC_PARITY_DIRECTIVE = `TRAINING–APP DOCUMENTATION PARITY (mandatory):
- Ironframe app documentation in the CANONICAL APP DOCS block is the single source of truth.
- Training chapters may teach navigation and lab steps ONLY for facts present in that block, the route manifest, TAS excerpt, or feature glossary excerpt.
- Do NOT contradict, reinterpret, extend, or speculate beyond canonical app documentation.
- Do NOT invent routes, API paths, env vars, agent capabilities, or compliance certifications.
- If canonical docs lack detail for a subsection, write exactly: INSUFFICIENT UNDERLYING COMPLIANCE CONTEXT.
- Pedagogical framing (labs, checklists, reading level) is allowed; factual claims about the product are not.`;

function slugFromSourceAnchor(anchor: string): string | null {
  const normalized = anchor.trim().replace(/\\/g, "/");
  if (!normalized) return null;
  if (normalized.startsWith("docs/")) {
    return normalized.replace(/^docs\//i, "").replace(/\.md$/i, "");
  }
  if (normalized.startsWith("app/") || normalized.startsWith("config/")) {
    return null;
  }
  return normalized.replace(/\.md$/i, "");
}

function collectRoutesFromManifest(manifest: unknown): Set<string> {
  const routes = new Set<string>(ALWAYS_ALLOWED_ROUTES);
  if (!manifest || typeof manifest !== "object") return routes;

  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    const record = node as Record<string, unknown>;
    if (typeof record.path === "string" && record.path.startsWith("/")) {
      routes.add(record.path);
    }
    if (typeof record.route === "string" && record.route.startsWith("/")) {
      routes.add(record.route);
    }
    for (const value of Object.values(record)) visit(value);
  };

  visit(manifest);
  return routes;
}

export function collectAllowedTrainingRoutes(
  chapter: TrainingChapterManifestEntry,
  brief: IronframeDocumentationBrief,
): Set<string> {
  const routes = collectRoutesFromManifest(brief.fullAccess?.routeManifest);
  routes.add(chapter.primaryRoute);
  routes.add(chapter.captureRoute);
  return routes;
}

export function buildCanonicalAppDocContext(
  chapter: TrainingChapterManifestEntry,
  brief: IronframeDocumentationBrief,
): string {
  const parts: string[] = [
    TRAINING_APP_DOC_PARITY_DIRECTIVE,
    "",
    "=== CANONICAL APP DOCS (Ironframe — do not exceed) ===",
  ];

  if (brief.fullAccess?.tasExcerpt?.trim()) {
    parts.push("--- TAS excerpt ---", brief.fullAccess.tasExcerpt.trim(), "");
  }
  if (brief.fullAccess?.featureGlossaryExcerpt?.trim()) {
    parts.push("--- Feature glossary excerpt ---", brief.fullAccess.featureGlossaryExcerpt.trim(), "");
  }
  if (brief.fullAccess?.routeManifest) {
    parts.push(
      "--- Route manifest ---",
      JSON.stringify(brief.fullAccess.routeManifest, null, 2).slice(0, 4_000),
      "",
    );
  }

  const seenSlugs = new Set<string>();
  for (const anchor of chapter.sourceAnchors) {
    const slug = slugFromSourceAnchor(anchor);
    if (!slug || seenSlugs.has(slug)) continue;
    const doc = resolveCorpusDocument(brief, slug);
    if (doc) {
      seenSlugs.add(slug);
      parts.push(`--- App doc: ${doc.slug} (${doc.title}) ---`, doc.content, "");
    }
  }

  if (brief.fullAccess?.documents?.length) {
    for (const doc of brief.fullAccess.documents) {
      if (seenSlugs.has(doc.slug.toLowerCase())) continue;
      const matchesAnchor = chapter.sourceAnchors.some((anchor) => {
        const slug = slugFromSourceAnchor(anchor);
        return slug && doc.slug.toLowerCase() === slug.toLowerCase();
      });
      if (!matchesAnchor) continue;
      seenSlugs.add(doc.slug.toLowerCase());
      parts.push(`--- App doc: ${doc.slug} (${doc.title}) ---`, doc.content, "");
    }
  }

  return parts.join("\n").slice(0, MAX_CANONICAL_CHARS);
}

/** Trainer-owned pedagogical skeleton — learning paths, labs, verification (no speculative product facts). */
export function buildTrainerChapterBlueprint(
  chapter: TrainingChapterManifestEntry,
  brief: IronframeDocumentationBrief,
): string {
  const lines = [
    `# Trainer blueprint — ${chapter.title}`,
    "",
    `Track: ${chapter.track} · Primary route: \`${chapter.primaryRoute}\``,
    `Feature IDs: ${chapter.featureIds.join(", ")}`,
    "",
    "## Learning objectives (Trainer)",
    "",
    `Navigate to \`${chapter.primaryRoute}\` and complete labs for ${chapter.featureIds.join(" / ")} using tenant \`${brief.platformFacts.tenantId}\`.`,
    "",
    "## Navigation path (Trainer)",
    "",
    ...chapter.navigationPath.map((step, index) => `${index + 1}. ${step}`),
    "",
    "## Lab structure (Trainer)",
    "",
    "Include at least six hands-on labs with verification steps tied to the navigation path above.",
    "Each lab must cite source anchors at completion — no new product capabilities.",
    "",
    "## Screenshot requirement",
    "",
    `Embed screenshot asset for \`${chapter.captureRoute}\` using manifest file \`${chapter.screenshotFile}\`.`,
    "",
    "## Source anchors (mandatory)",
    "",
    ...chapter.sourceAnchors.map((anchor) => `- ${anchor}`),
  ];

  return lines.join("\n").slice(0, MAX_BLUEPRINT_CHARS);
}

export function resolvePeerTrainerChapterSlug(writerSlug: string): string | null {
  const match = writerSlug.match(/training\/level-2\/(\d{2})-/i);
  if (!match) return null;
  const chapterNum = match[1]!;
  const manifest = loadTrainingCorpusManifest();
  return (
    manifest.chapters.find(
      (chapter) =>
        chapter.authorAgent === "board-trainer" &&
        chapter.slug.toLowerCase().includes(`training/level-1/${chapterNum}-`),
    )?.slug ?? null
  );
}

export function buildPeerTrainerExcerpt(
  peerSlug: string | null,
  trainerChapterDrafts: Readonly<Record<string, string>>,
): string {
  if (!peerSlug) return "";
  const draft = trainerChapterDrafts[peerSlug];
  if (!draft?.trim()) return "";
  return [
    "=== LEVEL 1 TRAINER CHAPTER (peer collaboration — align facts, do not contradict) ===",
    draft.slice(0, MAX_PEER_EXCERPT_CHARS),
  ].join("\n");
}

const INLINE_ROUTE_RE = /`(\/[a-z0-9][a-z0-9\-/_]*)`/gi;

export function screenTrainingAppDocumentationParity(
  content: string,
  chapter: TrainingChapterManifestEntry,
  brief: IronframeDocumentationBrief,
): string[] {
  const violations: string[] = [];
  const allowedRoutes = collectAllowedTrainingRoutes(chapter, brief);

  const routeMatches = content.matchAll(INLINE_ROUTE_RE);
  for (const match of routeMatches) {
    const route = match[1]!;
    if (!allowedRoutes.has(route)) {
      violations.push(
        `Route \`${route}\` is not present in the Ironframe route manifest or chapter allowance set.`,
      );
    }
  }

  const speculativeMarkers = [
    /\bcoming soon\b/i,
    /\broadmap\b/i,
    /\bplanned feature\b/i,
    /\bfuture release\b/i,
    /\bwill support\b/i,
  ];
  for (const pattern of speculativeMarkers) {
    if (pattern.test(content)) {
      violations.push(
        "Speculative or forward-looking product language is forbidden — training must match current app documentation only.",
      );
      break;
    }
  }

  for (const anchor of chapter.sourceAnchors) {
    if (content.includes(anchor) || content.includes(`source-file: ${anchor}`)) continue;
    if (anchor.startsWith("app/") || anchor.startsWith("config/")) {
      if (!content.includes(anchor)) {
        violations.push(`Missing required source anchor reference: ${anchor}`);
      }
    }
  }

  return violations;
}

export function buildCollaborativeWriterPrompt(input: {
  chapter: TrainingChapterManifestEntry;
  brief: IronframeDocumentationBrief;
  trainerBlueprint: string;
  canonicalAppDocs: string;
  peerTrainerExcerpt: string;
  structuralBackbone: string;
}): string {
  const { chapter, brief, trainerBlueprint, canonicalAppDocs, peerTrainerExcerpt, structuralBackbone } =
    input;
  const manifest = loadTrainingCorpusManifest();

  return `You are board-writer collaborating with board-trainer on Ironframe training documentation.

board-trainer produced the pedagogical blueprint below.
You must author the final training chapter markdown in plain language that STRICTLY matches Ironframe app documentation.

${canonicalAppDocs}

${peerTrainerExcerpt ? `${peerTrainerExcerpt}\n\n` : ""}=== TRAINER BLUEPRINT (pedagogy only — do not add facts beyond canonical docs) ===
${trainerBlueprint}

=== STRUCTURAL BACKBONE (preserve sections; expand to >= ${manifest.chapterTargetWords} words) ===
${structuralBackbone.slice(0, 12_000)}

AUTHORING REQUIREMENTS:
1. Output ONLY markdown for this single chapter.
2. Minimum ${manifest.chapterTargetWords} words.
3. Include screenshot block for ${chapter.screenshotFile} at route ${chapter.captureRoute}.
4. Include "Feature location in the SaaS application" with route ${chapter.primaryRoute}.
5. Include numbered navigation steps and at least six hands-on labs with verification.
6. Every product fact must appear in CANONICAL APP DOCS — never contradict or extend.
7. Cite source-file paths: ${chapter.sourceAnchors.join(", ")}.
8. Use whole-integer cent strings for SYNTHETIC_DEMO_SEED slugs only: medshield 1110000000, vaultbank 590000000, gridcore 470000000 — never present these as real companies.
9. End with source anchors and ref: GET /api/board/shared-context · release ${brief.release}.

Write the complete collaborative chapter now:`;
}
