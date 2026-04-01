import "server-only";

import { LKG_COLD_STORE_ROOT, LKG_MANIFEST_PATH } from "@/app/utils/integrityVaultConstants";
import type { IntegrityVaultSnapshot, LkgWorkforceRow, WorkforceLkgStatus } from "@/app/types/integrityVault";

export { LKG_COLD_STORE_ROOT, LKG_MANIFEST_PATH };
export type { IntegrityVaultSnapshot, LkgWorkforceRow, WorkforceLkgStatus };

/** Canonical 19-agent Iron roster (Ironframe Constitution — LKG manifest + Workforce Inventory). */
export const LKG_WORKFORCE_ROSTER = [
  "Ironcore",
  "Ironwave",
  "Irontrust",
  "Ironsight",
  "Ironscribe",
  "Ironlock",
  "Ironcast",
  "Ironintel",
  "Ironlogic",
  "Ironmap",
  "Irontech",
  "Ironguard",
  "Ironwatch",
  "Irongate",
  "Ironquery",
  "Ironscout",
  "Ironbloom",
  "Ironethic",
  "Irontally",
] as const;

function normalizeManifestAgents(
  raw: unknown,
): Map<string, string> {
  const m = new Map<string, string>();
  if (!raw || typeof raw !== "object") return m;
  const agents = (raw as { agents?: unknown }).agents;
  if (!Array.isArray(agents)) return m;
  for (const a of agents) {
    if (!a || typeof a !== "object") continue;
    const name = typeof (a as { name?: string }).name === "string" ? (a as { name: string }).name.trim() : "";
    const sha =
      typeof (a as { sha256?: string }).sha256 === "string" ? (a as { sha256: string }).sha256.trim() : "";
    if (name && sha) m.set(name.toLowerCase(), sha);
  }
  return m;
}

/**
 * Reads `lkg_signatures.json` from the G: cold store (if present) and aligns rows to the 19-agent roster.
 */
export async function readIntegrityVaultSnapshot(): Promise<IntegrityVaultSnapshot> {
  const fsMod = await import("node:fs");
  const checkpointRoot = LKG_COLD_STORE_ROOT;
  const manifestPath = LKG_MANIFEST_PATH;

  if (!fsMod.existsSync(manifestPath)) {
    const agents: LkgWorkforceRow[] = LKG_WORKFORCE_ROSTER.map((name) => ({
      name,
      sha256: null,
      status: "VAULT_UNREACHABLE" as const,
    }));
    return {
      ok: false,
      manifestPath,
      checkpointRoot,
      error: "Cold store manifest not found (G: drive / path unavailable).",
      verifiedAt: null,
      agents,
    };
  }

  let byName: Map<string, string>;
  try {
    const txt = fsMod.readFileSync(manifestPath, "utf8");
    const json = JSON.parse(txt) as unknown;
    byName = normalizeManifestAgents(json);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const agents: LkgWorkforceRow[] = LKG_WORKFORCE_ROSTER.map((name) => ({
      name,
      sha256: null,
      status: "VAULT_UNREACHABLE" as const,
    }));
    return {
      ok: false,
      manifestPath,
      checkpointRoot,
      error: `Manifest unreadable: ${msg}`,
      verifiedAt: null,
      agents,
    };
  }

  const verifiedAt = new Date().toISOString();
  const agents: LkgWorkforceRow[] = LKG_WORKFORCE_ROSTER.map((name) => {
    const sha = byName.get(name.toLowerCase()) ?? null;
    return {
      name,
      sha256: sha,
      status: sha ? ("LKG_VERIFIED" as const) : ("NO_MANIFEST_ENTRY" as const),
    };
  });

  return {
    ok: true,
    manifestPath,
    checkpointRoot,
    verifiedAt,
    agents,
  };
}
