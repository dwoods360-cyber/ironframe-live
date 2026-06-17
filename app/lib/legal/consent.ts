import "server-only";

import prisma from "@/lib/prisma";
import {
  IRONFRAME_PRIVACY_VERSION,
  IRONFRAME_TERMS_VERSION,
} from "@/config/legal";
import { buildLegalAcceptanceHash } from "@/app/lib/legal/acceptanceHash";

export async function hasCurrentLegalConsent(userId: string): Promise<boolean> {
  const row = await prisma.userLegalConsent.findUnique({
    where: { userId },
    select: { termsVersion: true, privacyVersion: true },
  });
  if (!row) return false;
  return (
    row.termsVersion === IRONFRAME_TERMS_VERSION &&
    row.privacyVersion === IRONFRAME_PRIVACY_VERSION
  );
}

export async function recordLegalConsent(userId: string): Promise<{ acceptanceHash: string }> {
  const acceptedAt = new Date();
  const acceptedAtIso = acceptedAt.toISOString();
  const acceptanceHash = buildLegalAcceptanceHash(userId, acceptedAtIso);

  await prisma.userLegalConsent.upsert({
    where: { userId },
    create: {
      userId,
      termsVersion: IRONFRAME_TERMS_VERSION,
      privacyVersion: IRONFRAME_PRIVACY_VERSION,
      acceptanceHash,
      acceptedAt,
    },
    update: {
      termsVersion: IRONFRAME_TERMS_VERSION,
      privacyVersion: IRONFRAME_PRIVACY_VERSION,
      acceptanceHash,
      acceptedAt,
    },
  });

  return { acceptanceHash };
}
