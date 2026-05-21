/** Display label for Integrity Hub (runtime reads use repo-local manifest). */
export const LKG_COLD_STORE_ROOT = "./storage/manifest (local notary)";

/** Repo-local LKG manifest — sole build-safe path. */
export const LKG_LOCAL_MANIFEST_PATH = "storage/manifest/lkg_signatures.json";

/** @deprecated Alias for UI copy; same as local path. */
export const LKG_MANIFEST_PATH = LKG_LOCAL_MANIFEST_PATH;
