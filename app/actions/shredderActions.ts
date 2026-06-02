"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { ironwatchEmitForensicShredIntel, ironwatchSignShredReceiptPayload } from "@/app/actions/agentActions";
import {
  EPIC_12_SHRED_BLOCK_MESSAGE,
  riskEventHasSignedAttestationBlockingShred,
  riskEventHasWormProtectedEvidence,
} from "@/app/lib/evidence/signedAttestationGuard";
import {
  assertStorageDeletePermitted,
  EPIC_12_WORM_DELETE_BLOCK_MESSAGE,
} from "@/app/lib/evidence/wormStoragePolicy";
import { removeStorageObjectIfPermitted } from "@/app/lib/evidence/supabaseWormStorage";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function deleteVaultArtifact(postMortemReportPath: string | null): Promise<void> {
  const raw = postMortemReportPath?.trim();
  if (!raw) return;
  await removeStorageObjectIfPermitted(raw);
}

function buildReceiptNumber(): string {
  const suffix = createHash("sha256").update(`${Date.now()}-${Math.random()}`).digest("hex").slice(0, 4).toUpperCase();
  return `SHRED-9921-${suffix}`;
}

export type ExecuteDigitalShredResult =
  | { ok: true; receiptNumber: string; receiptHashSha256: string; narrative: string }
  | { ok: false; error: string };

/**
 * Digital Shredder — expunge vault artifacts for a chapter / risk case and persist a non-repudiable AuditReceipt.
 * `chapterId` may be an `EvidenceChapter.id` or a shadow `RiskEvent.id`.
 */
export async function executeDigitalShred(chapterId: string, userUuid: string): Promise<ExecuteDigitalShredResult> {
  noStore();
  const cid = chapterId.trim();
  const uid = userUuid.trim();
  if (!cid) return { ok: false, error: "Missing chapter id." };

  const sessionUser = await getSupabaseSessionUser();
  const effectiveUserId =
    typeof sessionUser?.id === "string" && sessionUser.id.trim().length > 0
      ? sessionUser.id.trim()
      : "shadow-operator";
  if (uid !== effectiveUserId) {
    return { ok: false, error: "Operator identity does not match active session." };
  }

  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (!UUID_RE.test(tenantUuid)) {
    return { ok: false, error: "Invalid tenant context." };
  }

  const companies = await prisma.company.findMany({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });
  const companyIds = companies.map((c) => c.id);
  if (companyIds.length === 0) {
    return { ok: false, error: "No company for tenant." };
  }

  const chapterRow = await prisma.evidenceChapter.findFirst({
    where: { OR: [{ id: cid }, { riskEventId: cid }] },
    select: { id: true, riskEventId: true },
  });
  const riskEventId = chapterRow?.riskEventId ?? cid;

  const risk = await prisma.riskEvent.findFirst({
    where: { id: riskEventId, tenantCompanyId: { in: companyIds } },
    select: {
      id: true,
      title: true,
      financialRisk_cents: true,
      postMortemReportPath: true,
      tenantCompanyId: true,
    },
  });
  if (!risk || risk.tenantCompanyId == null) {
    return { ok: false, error: "Chapter not found for this tenant." };
  }

  const existingReceipt = await prisma.auditReceipt.findUnique({
    where: {
      tenantId_riskEventId: { tenantId: tenantUuid, riskEventId: risk.id },
    },
    select: { id: true },
  });
  if (existingReceipt) {
    return { ok: false, error: "This case was already shredded (receipt on file)." };
  }

  const attestationBlocksShred = await riskEventHasSignedAttestationBlockingShred({
    tenantUuid,
    riskEventId: risk.id,
    companyIds,
  });
  if (attestationBlocksShred) {
    return { ok: false, error: EPIC_12_SHRED_BLOCK_MESSAGE };
  }

  const wormEvidenceBlocksShred = await riskEventHasWormProtectedEvidence({
    tenantUuid,
    riskEventId: risk.id,
  });
  if (wormEvidenceBlocksShred) {
    return { ok: false, error: EPIC_12_WORM_DELETE_BLOCK_MESSAGE };
  }

  const artifactPath = risk.postMortemReportPath;
  const wormBlocksShred = !assertStorageDeletePermitted(artifactPath).ok;
  if (wormBlocksShred) {
    return { ok: false, error: EPIC_12_WORM_DELETE_BLOCK_MESSAGE };
  }

  const company = await prisma.company.findUnique({
    where: { id: risk.tenantCompanyId },
    select: { sector: true },
  });
  const sector = company?.sector?.trim() || "Unknown";
  const title = risk.title.trim() || "(untitled)";
  const aleCents = risk.financialRisk_cents?.toString() ?? "0";

  const shreddedAt = new Date();
  const iso = shreddedAt.toISOString();
  const receiptNumber = buildReceiptNumber();

  const narrative = `Chapter [${title}] was expunged by User [${effectiveUserId}] at [${iso}] under NIST 800-88 protocols.`;

  const canonicalPayload = [
    "IRONWATCH_SHRED_V1",
    tenantUuid,
    risk.id,
    receiptNumber,
    narrative,
    aleCents,
    sector,
    effectiveUserId,
    iso,
  ].join("|");

  const receiptHashSha256 = await ironwatchSignShredReceiptPayload(canonicalPayload);

  await prisma.$transaction([
    prisma.riskEvent.updateMany({
      where: { id: risk.id },
      data: { postMortemReportPath: null },
    }),
    prisma.evidenceChapter.deleteMany({
      where: { riskEventTenantId: tenantUuid, riskEventId: risk.id },
    }),
    prisma.auditReceipt.create({
      data: {
        tenantId: tenantUuid,
        riskEventId: risk.id,
        receiptNumber,
        narrative,
        receiptHashSha256,
        titleSnapshot: title,
        sectorSnapshot: sector,
        aleImpactCents: aleCents,
        shreddedByUserId: effectiveUserId,
        shreddedAt,
      },
      select: { id: true },
    }),
  ]);

  await deleteVaultArtifact(artifactPath);

  await ironwatchEmitForensicShredIntel({ receiptNumber, riskEventId: risk.id });
  revalidatePath("/evidence");

  return { ok: true, receiptNumber, receiptHashSha256, narrative };
}

export type AuditReceiptRow = {
  id: string;
  receiptNumber: string;
  narrative: string;
  receiptHashSha256: string;
  titleSnapshot: string;
  sectorSnapshot: string | null;
  aleImpactCents: string;
  shreddedAtIso: string;
};

export async function listAuditReceiptsForTenant(): Promise<
  { ok: true; receipts: AuditReceiptRow[] } | { ok: false; error: string }
> {
  noStore();
  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (!UUID_RE.test(tenantUuid)) {
    return { ok: false, error: "Invalid tenant context." };
  }

  const rows = await prisma.auditReceipt.findMany({
    where: { tenantId: tenantUuid },
    orderBy: { shreddedAt: "desc" },
    take: 50,
    select: {
      id: true,
      receiptNumber: true,
      narrative: true,
      receiptHashSha256: true,
      titleSnapshot: true,
      sectorSnapshot: true,
      aleImpactCents: true,
      shreddedAt: true,
    },
  });

  return {
    ok: true,
    receipts: rows.map((r) => ({
      id: r.id,
      receiptNumber: r.receiptNumber,
      narrative: r.narrative,
      receiptHashSha256: r.receiptHashSha256,
      titleSnapshot: r.titleSnapshot,
      sectorSnapshot: r.sectorSnapshot,
      aleImpactCents: r.aleImpactCents,
      shreddedAtIso: r.shreddedAt.toISOString(),
    })),
  };
}

/** Client hint for shred button — matches server-side identity checks. */
export async function getShredderActorUserId(): Promise<string> {
  noStore();
  const sessionUser = await getSupabaseSessionUser();
  if (typeof sessionUser?.id === "string" && sessionUser.id.trim().length > 0) {
    return sessionUser.id.trim();
  }
  return "shadow-operator";
}
