import path from "node:path";

/** GRC cold-store root label (display). Runtime reads use local manifest first. */
export const LKG_COLD_STORE_ROOT = "G:\\ironframe_store";

/** Repo-local LKG manifest (authoritative for dev/build when G: is EISDIR or unmapped). */
export const LKG_LOCAL_MANIFEST_PATH = "storage/manifest/lkg_signatures.json";

/**
 * Legacy G: manifest path — skipped at runtime when not a regular file.
 * @deprecated Prefer local path from `resolveLkgManifestCandidates()`.
 */
export const LKG_MANIFEST_PATH = `${LKG_COLD_STORE_ROOT}\\manifest\\lkg_signatures.json`;

/** Local-first, then optional G: cold store. */
export function resolveLkgManifestCandidates(cwd: string = process.cwd()): string[] {
  const localAbs = path.join(cwd, ...LKG_LOCAL_MANIFEST_PATH.split("/"));
  return [localAbs, LKG_MANIFEST_PATH];
}
