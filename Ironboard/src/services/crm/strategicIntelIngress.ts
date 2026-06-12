import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
  STRATEGIC_INTEL_UPDATE_CLASSIFICATION,
  type StrategicIntelInteractionEnvelope,
  type StrategicIntelResearchManifest,
} from '../../types/strategicIntelResearch.js';
import { requireTenantId, runIronboardCrmTransaction } from './crmTenantContext.js';
import { validateStrategicIntelManifest } from './strategicIntelSanitizer.js';
import { loadGrcProfessionalManifestFromDisk } from './strategicIntelManifestLoader.js';

export type StrategicIntelIngressResult = {
  interactionId: string;
  manifestId: string;
  ingestedAt: string;
  skippedDuplicate: boolean;
};

function parseEnvelope(summary: string): StrategicIntelInteractionEnvelope | null {
  try {
    const parsed = JSON.parse(summary) as StrategicIntelInteractionEnvelope;
    if (parsed.classification !== STRATEGIC_INTEL_UPDATE_CLASSIFICATION) return null;
    if (!parsed.manifestId || !parsed.manifest) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function findExistingManifestInteraction(
  tx: Prisma.TransactionClient,
  tenantId: string,
  manifestId: string,
): Promise<{ id: string; ingestedAt: string } | null> {
  const rows = await tx.ironboardCrmInteraction.findMany({
    where: {
      tenantId,
      channel: 'NOTE',
      summary: { contains: STRATEGIC_INTEL_UPDATE_CLASSIFICATION },
    },
    orderBy: { occurredAt: 'desc' },
    take: 32,
    select: { id: true, summary: true },
  });

  for (const row of rows) {
    const envelope = parseEnvelope(row.summary);
    if (envelope?.manifestId === manifestId) {
      return { id: row.id, ingestedAt: envelope.ingestedAt };
    }
  }
  return null;
}

/** Board organizational tenant — override via IRONBOARD_BOARD_ORG_TENANT_UUID. */
export function resolveBoardOrgTenantId(): string {
  const fromEnv = process.env.IRONBOARD_BOARD_ORG_TENANT_UUID?.trim();
  if (fromEnv) return requireTenantId(fromEnv);
  return requireTenantId('5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01');
}

export async function persistStrategicIntelManifest(
  tenantIdRaw: unknown,
  manifestInput: unknown,
): Promise<StrategicIntelIngressResult> {
  const manifest = validateStrategicIntelManifest(manifestInput);

  return runIronboardCrmTransaction(tenantIdRaw, async (tx, tenantId) => {
    const existing = await findExistingManifestInteraction(tx, tenantId, manifest.manifestId);
    if (existing) {
      return {
        interactionId: existing.id,
        manifestId: manifest.manifestId,
        ingestedAt: existing.ingestedAt,
        skippedDuplicate: true,
      };
    }

    const ingestedAt = new Date().toISOString();
    const envelope: StrategicIntelInteractionEnvelope = {
      classification: STRATEGIC_INTEL_UPDATE_CLASSIFICATION,
      manifestId: manifest.manifestId,
      manifestVersion: manifest.manifestVersion,
      sanitizedBy: 'Irongate-Agent-14',
      ingestedAt,
      manifest,
    };

    const row = await tx.ironboardCrmInteraction.create({
      data: {
        id: randomUUID(),
        tenantId,
        dealId: null,
        contactId: null,
        channel: 'NOTE',
        summary: JSON.stringify(envelope),
        occurredAt: new Date(ingestedAt),
      },
    });

    return {
      interactionId: row.id,
      manifestId: manifest.manifestId,
      ingestedAt,
      skippedDuplicate: false,
    };
  });
}

export async function ingestGrcProfessionalResearchCorpus(): Promise<StrategicIntelIngressResult> {
  const manifest = loadGrcProfessionalManifestFromDisk();
  const tenantId = resolveBoardOrgTenantId();
  return persistStrategicIntelManifest(tenantId, manifest);
}

export async function fetchLatestStrategicIntelManifest(
  tenantIdRaw: unknown,
): Promise<StrategicIntelResearchManifest | null> {
  return runIronboardCrmTransaction(tenantIdRaw, async (tx, tenantId) => {
    const rows = await tx.ironboardCrmInteraction.findMany({
      where: {
        tenantId,
        channel: 'NOTE',
        summary: { contains: STRATEGIC_INTEL_UPDATE_CLASSIFICATION },
      },
      orderBy: { occurredAt: 'desc' },
      take: 8,
      select: { summary: true },
    });

    for (const row of rows) {
      const envelope = parseEnvelope(row.summary);
      if (envelope?.manifest) {
        try {
          return validateStrategicIntelManifest(envelope.manifest);
        } catch {
          continue;
        }
      }
    }
    return null;
  });
}
