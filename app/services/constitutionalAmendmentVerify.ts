import "server-only";

import { createHash } from "crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getTasMdAbsolutePath } from "@/app/lib/tasMdIntegrity";
import { getAmendmentStagingPath } from "@/app/lib/simulatedAuditState";

const GOLD_BACKUP = join(process.cwd(), "storage", "constitutional", "TAS.md.pre-amendment");

/**
 * Task 5 — Promote amendment to docs/TAS.md only when simulated audit confirms posture.
 */
export async function promoteVerifiedAmendmentToConstitution(params: {
  virtualTasContent: string;
  virtualTasSha256: string;
  alertId: string;
  auditNarrative: string;
}): Promise<{ promoted: boolean; sha256: string | null; reason: string }> {
  const canonical = getTasMdAbsolutePath();
  const staging = getAmendmentStagingPath();

  if (!existsSync(staging)) {
    return { promoted: false, sha256: null, reason: "No amendment staging file." };
  }

  const stagingContent = readFileSync(staging, "utf8");
  const stagingHash = createHash("sha256").update(stagingContent, "utf8").digest("hex");
  if (stagingHash !== params.virtualTasSha256) {
    return { promoted: false, sha256: null, reason: "Staging hash mismatch — hot-swap expired." };
  }

  try {
    if (existsSync(canonical)) {
      copyFileSync(canonical, GOLD_BACKUP);
    }
    writeFileSync(canonical, stagingContent, "utf8");
    const newHash = createHash("sha256").update(stagingContent, "utf8").digest("hex");

    try {
      const { auditLogCreateLoose } = await import("@/lib/auditLogLoose");
      await auditLogCreateLoose({
        data: {
          action: "TAS_CONSTITUTIONAL_AMENDMENT_PROMOTED",
          justification: JSON.stringify({
            alertId: params.alertId,
            previousBackup: GOLD_BACKUP,
            newSha256: newHash,
            narrative: params.auditNarrative,
          }),
          operatorId: "IRONTALLY_AGENT_19",
          threatId: null,
          isSimulation: false,
        },
      });
    } catch {
      /* best-effort */
    }

    return { promoted: true, sha256: newHash, reason: "Amendment promoted; new constitutional hash active." };
  } catch (e) {
    return {
      promoted: false,
      sha256: null,
      reason: e instanceof Error ? e.message : "Promotion failed.",
    };
  }
}
