import "server-only";

import prisma from "@/lib/prisma";
import { initiateStateFreeze } from "@/src/services/ironlock/freezeEngine";
import { logStructuredEvent } from "@/lib/structuredServerLog";
import { escalateQuarantineSecondStrikersAfterSystemFreeze } from "@/app/lib/security/quarantineLedgerGuard";

const WINDOW_MS = 60 * 60 * 1000;
const VIOLATION_THRESHOLD = 3;

/**
 * Ironwatch (Agent 15): if Ironguard violations in the last hour exceed threshold, arm Ironlock global freeze.
 */
export async function runIronwatchSecurityMonitor(): Promise<{
  ok: true;
  violations1h: number;
  freezeTriggered: boolean;
}> {
  const since = new Date(Date.now() - WINDOW_MS);
  const violations1h = await prisma.ironguardViolation.count({
    where: { createdAt: { gte: since } },
  });

  if (violations1h <= VIOLATION_THRESHOLD) {
    return { ok: true, violations1h, freezeTriggered: false };
  }

  const freeze = await initiateStateFreeze(
    `[Ironwatch] IronguardViolation count=${violations1h} in rolling 1h window (threshold>${VIOLATION_THRESHOLD}).`,
  );
  if (!freeze.ok) {
    logStructuredEvent("Ironwatch", "security_monitor_freeze_failed", { error: freeze.error }, "error");
    return { ok: true, violations1h, freezeTriggered: false };
  }
  if (freeze.alreadyActive === true) {
    return { ok: true, violations1h, freezeTriggered: false };
  }

  logStructuredEvent(
    "Ironwatch",
    "AUTONOMOUS_STATE_FREEZE_TRIGGERED",
    { violations1h, threshold: VIOLATION_THRESHOLD, newFreeze: true },
    "warn",
  );

  await escalateQuarantineSecondStrikersAfterSystemFreeze();

  return { ok: true, violations1h, freezeTriggered: true };
}
