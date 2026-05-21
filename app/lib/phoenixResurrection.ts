import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import prisma from "@/lib/prisma";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import {
  fetchLastWillFromOffSite,
  findLatestLocalLwtArchiveId,
  type LastWillPlaintext,
} from "@/app/lib/lastWillAndTestament";
import { recordDeadManSwitchResolution } from "@/app/lib/deadMansSwitch";
import {
  forceRefreshTasMdFromGoldImage,
  performIrontechRebaselineVerification,
  broadcastConstitutionalFingerprintToWorkforce,
  invalidateTasFingerprintCache,
} from "@/app/utils/tasFingerprint";
import { clearChaosConstitutionalVoid } from "@/app/lib/chaosConstitutionalVoid";

export const PHOENIX_RESURRECTION_ACTION = "PHOENIX_RESURRECTION";

export type PhoenixUnlockRecord = {
  tenantId: string;
  unlockedAt: string;
  tripartiteOverride: boolean;
  constitutionalHash?: string;
  lwtArchiveId?: string;
};

type PhoenixStateFile = {
  unlocks: Record<string, PhoenixUnlockRecord>;
  lastResurrection?: {
    tenantId: string;
    at: string;
    constitutionalHash: string | null;
  };
};

const STATE_DIR = join(process.cwd(), "storage", "constitutional");
const STATE_FILE = join(STATE_DIR, "phoenix-resurrection.json");

function readState(): PhoenixStateFile {
  try {
    if (!existsSync(STATE_FILE)) return { unlocks: {} };
    return JSON.parse(readFileSync(STATE_FILE, "utf8")) as PhoenixStateFile;
  } catch {
    return { unlocks: {} };
  }
}

function writeState(state: PhoenixStateFile): void {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

export function markPhoenixUnlockedForTripartiteOverride(params: {
  tenantId: string;
  constitutionalHash: string;
  lwtArchiveId?: string;
}): void {
  const state = readState();
  state.unlocks[params.tenantId] = {
    tenantId: params.tenantId,
    unlockedAt: new Date().toISOString(),
    tripartiteOverride: true,
    constitutionalHash: params.constitutionalHash,
    lwtArchiveId: params.lwtArchiveId,
  };
  writeState(state);
}

export function isPhoenixResurrectionUnlocked(tenantId: string): boolean {
  const rec = readState().unlocks[tenantId.trim()];
  return Boolean(rec?.tripartiteOverride);
}

export function getPhoenixUnlockRecord(tenantId: string): PhoenixUnlockRecord | null {
  return readState().unlocks[tenantId.trim()] ?? null;
}

export async function resolveRestorationReportForTenant(
  tenantId: string,
): Promise<LastWillPlaintext | null> {
  const unlock = getPhoenixUnlockRecord(tenantId);
  const archiveId = unlock?.lwtArchiveId ?? findLatestLocalLwtArchiveId();
  if (!archiveId) return null;
  return fetchLastWillFromOffSite(archiveId);
}

export type PhoenixResurrectionResult =
  | {
      ok: true;
      constitutionalHash: string;
      restorationReport: LastWillPlaintext | null;
    }
  | { ok: false; error: string };

/**
 * Phoenix protocol — redeploy tenant state, lift constitutional emergency, forensic handshake.
 */
export async function executePhoenixResurrection(tenantId: string): Promise<PhoenixResurrectionResult> {
  if (!isPhoenixResurrectionUnlocked(tenantId)) {
    return {
      ok: false,
      error: "Phoenix resurrection locked until Tripartite Nuclear Override succeeds.",
    };
  }

  const restorationReport = await resolveRestorationReportForTenant(tenantId);

  const gold = forceRefreshTasMdFromGoldImage();
  if (!gold.ok || !gold.sha256) {
    return { ok: false, error: gold.message ?? "Gold image restoration failed." };
  }

  clearChaosConstitutionalVoid(tenantId);
  invalidateTasFingerprintCache();

  const rebaseline = await performIrontechRebaselineVerification();
  const constitutionalHash = rebaseline.sha256 ?? gold.sha256;
  if (!constitutionalHash) {
    return { ok: false, error: "RE-BASELINE did not produce a constitutional hash." };
  }

  await broadcastConstitutionalFingerprintToWorkforce(constitutionalHash);
  await recordDeadManSwitchResolution(constitutionalHash);

  try {
    await auditLogCreateLoose({
      data: {
        action: PHOENIX_RESURRECTION_ACTION,
        justification: JSON.stringify({
          event: "PHOENIX_RESURRECTION",
          tenantId,
          constitutionalHash,
          lwtArchiveId: restorationReport?.archiveId ?? null,
          brickingEvents: restorationReport?.auditEntries?.slice(0, 10) ?? [],
        }),
        operatorId: "PHOENIX_PROTOCOL",
        threatId: null,
        isSimulation: false,
        governance_tenant_uuid: tenantId,
      },
    });
  } catch (e) {
    console.error("[executePhoenixResurrection] audit failed", e);
  }

  const state = readState();
  state.lastResurrection = {
    tenantId,
    at: new Date().toISOString(),
    constitutionalHash,
  };
  writeState(state);

  try {
    const { appendChaosRunEvent, closeChaosRunTelemetry } = await import("@/app/lib/chaosRunTelemetry");
    appendChaosRunEvent(tenantId, "PHOENIX_RESURRECTION", {
      constitutionalHash,
      lwtArchiveId: restorationReport?.archiveId ?? null,
    });
    const closedRun = closeChaosRunTelemetry(tenantId);
    const { generateIrontechPostMortemReport } = await import("@/app/services/irontechPostMortem");
    const { buildIrontechPostMortemPdfBytes } = await import("@/app/utils/irontechPostMortemPdf");
    const { writeFileSync, existsSync, mkdirSync } = await import("fs");
    const { getPostMortemPdfStoragePath } = await import("@/app/services/irontechPostMortem");
    const report = await generateIrontechPostMortemReport({
      tenantId,
      run: closedRun,
      lwtArchiveId:
        restorationReport?.archiveId ?? getPhoenixUnlockRecord(tenantId)?.lwtArchiveId ?? null,
    });
    const pdfPath = getPostMortemPdfStoragePath(tenantId, report.reportId);
    const dir = pdfPath.replace(/[^/\\]+$/, "");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(pdfPath, Buffer.from(buildIrontechPostMortemPdfBytes(report)));
  } catch (e) {
    console.error("[executePhoenixResurrection] post-mortem generation failed", e);
  }

  return { ok: true, constitutionalHash, restorationReport };
}
