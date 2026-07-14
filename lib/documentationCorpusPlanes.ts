/**
 * Dual-Location Output Matrix — authoritative routing for Ironframe documentation planes.
 * Never cross-compile APP_DOCS (internal product corpus) with GOVERNANCE_BRIEFINGS (external GTM surface).
 */

export const DOCUMENTATION_PLANE_APP_DOCS = "APP_DOCS" as const;
export const DOCUMENTATION_PLANE_GOVERNANCE_BRIEFINGS = "GOVERNANCE_BRIEFINGS" as const;

export type DocumentationCorpusPlane =
  | typeof DOCUMENTATION_PLANE_APP_DOCS
  | typeof DOCUMENTATION_PLANE_GOVERNANCE_BRIEFINGS;

export const GOVERNANCE_BRIEFING_DOC_PREFIXES = [
  "briefing-queue/",
  "published-briefings/",
] as const;

export const APP_DOCS_REPOSITORY_PREFIXES = [
  "user-manuals/",
  "technical/",
  "training/",
] as const;

export const APP_DOCS_READER_ROUTE = "/docs" as const;
export const GOVERNANCE_FRAME_READER_ROUTE = "/governance-frame" as const;

export const APP_DOCS_EXECUTE_ENDPOINT = "POST /api/documentation/execute" as const;

export type DualLocationOutputTarget = {
  /** Primary reader or persistence surface */
  primary: string;
  /** Pre-publication staging (queue drafts or async pipeline ingress) */
  staging?: string;
  /** Git-tracked paths under docs/ (app docs plane only) */
  repositoryPaths?: readonly string[];
  /** External GTM publication channels */
  externalChannels?: readonly string[];
  /** Authoritative DB table for published ledger (governance plane) */
  databaseTable?: string;
};

export type DualLocationOutputMatrixEntry = {
  plane: DocumentationCorpusPlane;
  surface: "EXTERNAL_GTM_INTELLIGENCE" | "INTERNAL_PRODUCT_GRC_CORPUS";
  label: string;
  content: string;
  targetLocation: DualLocationOutputTarget;
  operationalRules: readonly string[];
  authorAgents: readonly string[];
  trigger: string;
};

/** Authoritative Dual-Location Output Matrix (Ironframe + IronBoard). */
export const DUAL_LOCATION_OUTPUT_MATRIX: Record<
  DocumentationCorpusPlane,
  DualLocationOutputMatrixEntry
> = {
  [DOCUMENTATION_PLANE_GOVERNANCE_BRIEFINGS]: {
    plane: DOCUMENTATION_PLANE_GOVERNANCE_BRIEFINGS,
    surface: "EXTERNAL_GTM_INTELLIGENCE",
    label: "Newsletters & Briefings",
    content:
      "Real-world market analysis, regulatory change narratives, and institutional briefing logs compiled by board agents during flywheel execution cycles.",
    targetLocation: {
      primary: `${GOVERNANCE_FRAME_READER_ROUTE}/[slug]`,
      staging: "docs/briefing-queue/",
      repositoryPaths: ["published-briefings/"],
      databaseTable: "PublishedBriefing",
      externalChannels: ["corporate Substack stream", "Ironcast newsletter compile"],
    },
    operationalRules: [
      "Dynamic, narrative-driven, and completely decoupled from internal system code.",
      "Communicates outward to prospects and design partners to showcase active intelligence posture.",
      "Drafts quarantined in briefing-queue/ — never compiled to /docs or public routes until promoted.",
      "Published ledger lives in PostgreSQL and renders at /governance-frame/[slug].",
      "Mandatory Section V citations before human promotion.",
      "board-trainer and board-writer must never write to this plane.",
    ],
    authorAgents: [
      "board-bot",
      "board-cfo",
      "board-compliance",
      "GTM flywheel agents",
      "Irontally narrate cron",
      "Ops Hub briefings/request",
      "Ops Hub newsletters/request",
      "autonomous GTM briefing-queue cron",
    ],
    trigger:
      "Autonomous weekday GTM cron (/api/cron/gtm-briefing-queue) or Ops Hub briefings/newsletters request (or flywheel/narrate) → briefing-queue draft → human Approve (promote) or Deny → PublishedBriefing → Ironcast newsletter/RSS syndicate",
  },
  [DOCUMENTATION_PLANE_APP_DOCS]: {
    plane: DOCUMENTATION_PLANE_APP_DOCS,
    surface: "INTERNAL_PRODUCT_GRC_CORPUS",
    label: "App Docs",
    content:
      "Highly structured dual-level framework manuals: Level 1 end-user quickstarts and Level 2 advanced technical specifications.",
    targetLocation: {
      primary: APP_DOCS_READER_ROUTE,
      staging: "GET /api/board/shared-context → documentationBrief",
      repositoryPaths: [...APP_DOCS_REPOSITORY_PREFIXES],
      databaseTable: "AppDocument",
    },
    operationalRules: [
      "Purely technical and strict — grounded in source anchors, TAS, and live telemetry baselines.",
      "Updates through asynchronous POST /api/documentation/execute on IronBoard (:8082).",
      "Architecture manuals, API definitions, and training paths must reflect real database baselines (BigInt cents).",
      "Content firewall validates every write before landing in docs/.",
      "Never publish app manuals to /governance-frame or external GTM channels.",
    ],
    authorAgents: ["board-trainer", "board-writer"],
    trigger: APP_DOCS_EXECUTE_ENDPOINT,
  },
};

export type DocumentationPlaneDescriptor = {
  plane: DocumentationCorpusPlane;
  label: string;
  readerRoute: string;
  docsPrefixes: readonly string[];
  authorAgents: readonly string[];
  promotionWorkflow: string;
  matrix: DualLocationOutputMatrixEntry;
};

export const DOCUMENTATION_CORPUS_PLANES: Record<
  DocumentationCorpusPlane,
  DocumentationPlaneDescriptor
> = {
  [DOCUMENTATION_PLANE_APP_DOCS]: {
    plane: DOCUMENTATION_PLANE_APP_DOCS,
    label: DUAL_LOCATION_OUTPUT_MATRIX.APP_DOCS.label,
    readerRoute: APP_DOCS_READER_ROUTE,
    docsPrefixes: [
      ...APP_DOCS_REPOSITORY_PREFIXES,
      "product/",
      "support/",
      "end-users/",
      "qa/",
      "hub.md",
      "README.md",
      "TAS.md",
    ],
    authorAgents: DUAL_LOCATION_OUTPUT_MATRIX.APP_DOCS.authorAgents,
    promotionWorkflow: `${DUAL_LOCATION_OUTPUT_MATRIX.APP_DOCS.trigger} → content firewall → docs/`,
    matrix: DUAL_LOCATION_OUTPUT_MATRIX.APP_DOCS,
  },
  [DOCUMENTATION_PLANE_GOVERNANCE_BRIEFINGS]: {
    plane: DOCUMENTATION_PLANE_GOVERNANCE_BRIEFINGS,
    label: DUAL_LOCATION_OUTPUT_MATRIX.GOVERNANCE_BRIEFINGS.label,
    readerRoute: GOVERNANCE_FRAME_READER_ROUTE,
    docsPrefixes: [...GOVERNANCE_BRIEFING_DOC_PREFIXES],
    authorAgents: DUAL_LOCATION_OUTPUT_MATRIX.GOVERNANCE_BRIEFINGS.authorAgents,
    promotionWorkflow: DUAL_LOCATION_OUTPUT_MATRIX.GOVERNANCE_BRIEFINGS.trigger,
    matrix: DUAL_LOCATION_OUTPUT_MATRIX.GOVERNANCE_BRIEFINGS,
  },
};

export function buildDualLocationOutputMatrixPromptBlock(): string {
  const blocks = Object.values(DUAL_LOCATION_OUTPUT_MATRIX).map((entry, index) => {
    const rules = entry.operationalRules.map((rule) => `  - ${rule}`).join("\n");
    const targets = [
      `primary: ${entry.targetLocation.primary}`,
      entry.targetLocation.staging ? `staging: ${entry.targetLocation.staging}` : "",
      entry.targetLocation.databaseTable
        ? `database: ${entry.targetLocation.databaseTable}`
        : "",
      entry.targetLocation.repositoryPaths?.length
        ? `repository: ${entry.targetLocation.repositoryPaths.join(", ")}`
        : "",
      entry.targetLocation.externalChannels?.length
        ? `external: ${entry.targetLocation.externalChannels.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ");

    return [
      `${index + 1}. ${entry.label} (${entry.surface})`,
      `   Content: ${entry.content}`,
      `   Target: ${targets}`,
      `   Trigger: ${entry.trigger}`,
      `   Authors: ${entry.authorAgents.join(", ")}`,
      `   Rules:`,
      rules,
    ].join("\n");
  });

  return `[DUAL-LOCATION OUTPUT MATRIX — AUTHORITATIVE]\n${blocks.join("\n\n")}`;
}

export function isGovernanceBriefingDocSlug(slug: string[]): boolean {
  if (slug.length === 0) return false;
  const joined = `${slug.join("/")}/`;
  return GOVERNANCE_BRIEFING_DOC_PREFIXES.some(
    (prefix) => joined.startsWith(prefix) || slug[0] === prefix.replace(/\/$/, ""),
  );
}

export function isAppDocsMarkdownSlug(slug: string[]): boolean {
  return !isGovernanceBriefingDocSlug(slug);
}
