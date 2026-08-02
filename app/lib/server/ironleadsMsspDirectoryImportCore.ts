import "server-only";

import type { Prisma } from "@prisma/client";

import { isSalesDispatchHoldCompany } from "@/app/lib/approvalDispatchValidation";
import { looksLikeOsintTitleNoise } from "@/app/lib/server/ironleadsBuyingCommitteeExtract";
import { ingestIronleadsLead } from "@/app/lib/server/ironleadsIngressCore";
import {
  MSSP_FREE_DIRECTORY_SEEDS,
  listMsspFreeDirectorySeeds,
  parseDirectoryImportPaste,
  type DirectoryImportRow,
  type MsspDirectorySeed,
} from "@/app/lib/ironleadsMsspFreeDirectorySeeds";
import { normalizeAccountDomain } from "@/app/lib/ingress/ironleadsSuspectIdentity";
import { parkImportedOverflow } from "@/app/lib/server/ironleadsPendingPoolCore";
import { websiteUrlFromDomainOrUrl } from "@/app/lib/server/ironleadsSuspectLocation";
import prisma from "@/lib/prisma";

export type { DirectoryImportRow, MsspDirectorySeed };
export { listMsspFreeDirectorySeeds, parseDirectoryImportPaste };

export type DirectoryImportResultRow = {
  companyName: string;
  ok: boolean;
  skipped?: boolean;
  skipReason?: string;
  contactId?: string;
  dealId?: string;
  deduped?: boolean;
};

const PROSPECT_POOL = "prospect-pool";
const DEFAULT_TRIGGER = "COMPLIANCE_JOB_POST";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

async function stampDirectoryMetadata(input: {
  contactId: string;
  websiteUrl: string | null;
  directorySource: string;
  notes: string | null;
}): Promise<void> {
  const contact = await prisma.ironboardCrmContact.findUnique({
    where: { id: input.contactId },
    select: { metadata: true },
  });
  if (!contact) return;
  const meta = asRecord(contact.metadata);
  const websiteUrl =
    websiteUrlFromDomainOrUrl(input.websiteUrl) ??
    (typeof meta.websiteUrl === "string" ? meta.websiteUrl : null);
  if (websiteUrl) meta.websiteUrl = websiteUrl;
  meta.directoryImport = {
    source: input.directorySource,
    importedAt: new Date().toISOString(),
    notes: input.notes,
  };
  await prisma.ironboardCrmContact.update({
    where: { id: input.contactId },
    data: {
      ingestionSource: "MANUAL_INPUT",
      title: "Suspect — free directory import",
      metadata: meta as Prisma.InputJsonValue,
    },
  });
}

export async function importMsspDirectoryAccounts(
  rows: DirectoryImportRow[],
): Promise<{
  importedAt: string;
  total: number;
  created: number;
  deduped: number;
  skipped: number;
  keptActive: number;
  parkedPending: number;
  activeCap: number;
  results: DirectoryImportResultRow[];
}> {
  const results: DirectoryImportResultRow[] = [];
  let created = 0;
  let deduped = 0;
  let skipped = 0;
  const importedContactIds: string[] = [];

  for (const row of rows) {
    const companyName = row.companyName.trim();
    if (!companyName) continue;

    if (looksLikeOsintTitleNoise(companyName) || isSalesDispatchHoldCompany(companyName)) {
      skipped += 1;
      results.push({
        companyName,
        ok: false,
        skipped: true,
        skipReason: looksLikeOsintTitleNoise(companyName)
          ? "OSINT title noise"
          : "HOLD / channel-competitor — not imported",
      });
      continue;
    }

    const websiteUrl = websiteUrlFromDomainOrUrl(row.websiteUrl ?? row.accountDomain ?? null);
    const accountDomain =
      normalizeAccountDomain(row.accountDomain) ||
      normalizeAccountDomain(websiteUrl);

    try {
      const ingested = await ingestIronleadsLead({
        companyName,
        industrySector: "MSSP_ENCLAVE",
        detectedTrigger: (row.detectedTrigger?.trim() || DEFAULT_TRIGGER).slice(0, 120),
        targetTenantSlug: PROSPECT_POOL,
        contactEmail: row.contactEmail?.trim() || undefined,
        contactName: row.contactName?.trim() || undefined,
        accountDomain: accountDomain ?? undefined,
      });

      await stampDirectoryMetadata({
        contactId: ingested.contact.id,
        websiteUrl,
        directorySource: row.directorySource ?? "manual_paste",
        notes: row.notes?.trim() || null,
      });

      if (ingested.deduped) deduped += 1;
      else created += 1;

      importedContactIds.push(ingested.contact.id);
      results.push({
        companyName,
        ok: true,
        contactId: ingested.contact.id,
        dealId: ingested.deal.id,
        deduped: ingested.deduped,
      });
    } catch (err) {
      skipped += 1;
      results.push({
        companyName,
        ok: false,
        skipped: true,
        skipReason: err instanceof Error ? err.message : "Import failed",
      });
    }
  }

  const overflow = await parkImportedOverflow(importedContactIds);

  return {
    importedAt: new Date().toISOString(),
    total: results.length,
    created,
    deduped,
    skipped,
    keptActive: overflow.keptActive,
    parkedPending: overflow.parkedPending,
    activeCap: overflow.activeCap,
    results,
  };
}

export async function importMsspFreeDirectorySeeds(): Promise<
  Awaited<ReturnType<typeof importMsspDirectoryAccounts>>
> {
  return importMsspDirectoryAccounts(
    MSSP_FREE_DIRECTORY_SEEDS.map((seed) => ({
      companyName: seed.companyName,
      websiteUrl: seed.websiteUrl,
      detectedTrigger: seed.detectedTrigger,
      directorySource: seed.directorySource,
      notes: seed.notes,
    })),
  );
}
