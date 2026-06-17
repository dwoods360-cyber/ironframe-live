import { createHash } from "node:crypto";

import {
  IRONFRAME_PRIVACY_VERSION,
  IRONFRAME_TERMS_VERSION,
} from "@/config/legal";

export function buildLegalAcceptanceHash(
  userId: string,
  acceptedAtIso: string,
  termsVersion: string = IRONFRAME_TERMS_VERSION,
  privacyVersion: string = IRONFRAME_PRIVACY_VERSION,
): string {
  const payload = `${userId}|${termsVersion}|${privacyVersion}|${acceptedAtIso}`;
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
