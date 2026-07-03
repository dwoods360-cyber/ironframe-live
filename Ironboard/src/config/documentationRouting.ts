/**
 * Canonical APP_DOCS slug targets — Trainer/Writer upsert these via POST /api/documentation/execute.
 * platform-sync.md sidecar stamps are retired in favor of real handbook slugs.
 */

export const TRAINER_DOCS_PREFIXES = ["user-manuals/", "training/"] as const;
export const WRITER_DOCS_PREFIXES = ["technical/"] as const;

export const TRAINER_CANONICAL_SLUGS = {
  readme: "readme",
  quickstart: "user-manuals/quickstart",
} as const;

export const WRITER_CANONICAL_SLUGS = {
  architecture: "technical/architecture-and-api",
  securityCompliance: "technical/security-and-compliance",
} as const;

/** @deprecated Use TRAINER_CANONICAL_SLUGS — retained for migration references only */
export const TRAINER_SYNC_ARTIFACT = "user-manuals/platform-sync.md" as const;
/** @deprecated Use WRITER_CANONICAL_SLUGS — retained for migration references only */
export const WRITER_SYNC_ARTIFACT = "technical/platform-sync.md" as const;

export function isTrainerPlacementPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return TRAINER_DOCS_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function isWriterPlacementPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return WRITER_DOCS_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function normalizeBriefPlacementTarget(target: string): string {
  return target.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/\.md$/i, "").toLowerCase();
}
