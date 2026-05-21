import "server-only";

import path from "node:path";
import {
  LKG_COLD_STORE_ROOT,
  LKG_LOCAL_MANIFEST_PATH,
  LKG_MANIFEST_PATH,
  resolveLkgManifestCandidates,
} from "@/app/utils/integrityVaultConstants";
import type { IntegrityVaultSnapshot, LkgWorkforceRow, WorkforceLkgStatus } from "@/app/types/integrityVault";
import prisma from "@/lib/prisma";
import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import { SIMULATION_SOURCE_AGENTS } from "@/app/config/simulationAgents";
import {
  mergeAgentRegistryIntoSnapshot,
  performWorkforceAudit,
} from "@/app/lib/workforceAgentRegistryServer";

export { performWorkforceAudit, mergeAgentRegistryIntoSnapshot } from "@/app/lib/workforceAgentRegistryServer";

export { LKG_COLD_STORE_ROOT, LKG_LOCAL_MANIFEST_PATH, LKG_MANIFEST_PATH };
export type { IntegrityVaultSnapshot, LkgWorkforceRow, WorkforceLkgStatus };

/** Canonical 19-agent Iron roster (Ironframe Constitution — LKG manifest + Workforce Inventory). */
export const LKG_WORKFORCE_ROSTER = CORE_WORKFORCE_AGENTS.map((a) => a.name) as readonly string[];

async function readSustainabilityLedgerReady(): Promise<boolean> {
  try {
    const count = await prisma.sustainabilityMetric.count({
      where: {
        threat: {
          sourceAgent: {
            notIn: Array.from(SIMULATION_SOURCE_AGENTS),
          },
        },
      },
    });
    return count > 0;
  } catch {
    return false;
  }
}

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
  const candidates = resolveLkgManifestCandidates(process.cwd());
  const sustainabilityLedgerReady = await readSustainabilityLedgerReady();

  let manifestPathUsed: string | null = null;
  for (const candidate of candidates) {
    try {
      if (!fsMod.existsSync(candidate)) {
        continue;
      }
      const st = fsMod.statSync(candidate);
      if (!st.isFile()) {
        continue;
      }
      manifestPathUsed = candidate;
      break;
    } catch {
      continue;
    }
  }

  if (manifestPathUsed == null) {
    const agents: LkgWorkforceRow[] = LKG_WORKFORCE_ROSTER.map((name) => ({
      name,
      sha256: null,
      status:
        name === "Ironbloom"
          ? sustainabilityLedgerReady
            ? ("LKG_VERIFIED" as const)
            : ("NO_ENTRY" as const)
          : ("VAULT_UNREACHABLE" as const),
    }));
    return {
      ok: false,
      manifestPath: LKG_MANIFEST_PATH,
      checkpointRoot,
      error: `Cold store manifest not found (./${LKG_LOCAL_MANIFEST_PATH} or G: fallback).`,
      verifiedAt: null,
      agents,
    };
  }

  let byName: Map<string, string>;
  try {
    const txt = fsMod.readFileSync(manifestPathUsed, "utf8");
    const json = JSON.parse(txt) as unknown;
    byName = normalizeManifestAgents(json);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const agents: LkgWorkforceRow[] = LKG_WORKFORCE_ROSTER.map((name) => ({
      name,
      sha256: null,
      status:
        name === "Ironbloom"
          ? sustainabilityLedgerReady
            ? ("LKG_VERIFIED" as const)
            : ("NO_ENTRY" as const)
          : ("VAULT_UNREACHABLE" as const),
    }));
    return {
      ok: false,
      manifestPath: manifestPathUsed,
      checkpointRoot,
      error: `Manifest unreadable: ${msg}`,
      verifiedAt: null,
      agents,
    };
  }

  const verifiedAt = new Date().toISOString();
  const agents: LkgWorkforceRow[] = LKG_WORKFORCE_ROSTER.map((name) => {
    if (name === "Ironbloom") {
      return {
        name,
        sha256: byName.get(name.toLowerCase()) ?? null,
        status: sustainabilityLedgerReady ? ("LKG_VERIFIED" as const) : ("NO_ENTRY" as const),
      };
    }
    const sha = byName.get(name.toLowerCase()) ?? null;
    return {
      name,
      sha256: sha,
      status: sha ? ("LKG_VERIFIED" as const) : ("NO_ENTRY" as const),
    };
  });

  return {
    ok: true,
    manifestPath: manifestPathUsed,
    checkpointRoot,
    verifiedAt,
    agents,
  };
}

/**
 * Integrity Hub entrypoint: runs `performWorkforceAudit()` (AgentRegistry TTL + Ironwatch pulses),
 * reads cold-store manifest snapshot, then overlays DB workforce status on each roster row.
 */
export async function readIntegrityVaultSnapshotWithRegistry(): Promise<IntegrityVaultSnapshot> {
  await performWorkforceAudit();
  const snap = await readIntegrityVaultSnapshot();
  return mergeAgentRegistryIntoSnapshot(snap);
}
