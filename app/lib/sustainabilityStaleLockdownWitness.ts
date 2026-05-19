import "server-only";

import { createHash } from "crypto";

export function hashStaleLockdownWitnessPayload(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
