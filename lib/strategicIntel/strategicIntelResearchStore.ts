import { z } from "zod";
import { runIronboardCrmTransaction } from "@/lib/ironboard/crmTenantContext";
import { resolveBoardOrgTenantId } from "@/lib/strategicIntel/boardOrgTenant";
import type { IndustryProfileResearchContext } from "@/lib/strategicIntel/strategicIntelResearchShared";

export type { IndustryProfileResearchContext } from "@/lib/strategicIntel/strategicIntelResearchShared";
export { formatPeerAleMillionsFromCents } from "@/lib/strategicIntel/strategicIntelResearchShared";

export const STRATEGIC_INTEL_UPDATE_CLASSIFICATION = "Strategic Intel Update" as const;

const industryProfileSchema = z.object({
  industryKey: z.string(),
  displayName: z.string(),
  peerAleBaselineCents: z.string().regex(/^\d+$/),
  regulatoryPressureIndex: z.number().int(),
  saasDisruptionExposureIndex: z.number().int(),
  continuousAuditPriority: z.string(),
  narrativeSummary: z.string(),
});

const manifestSchema = z.object({
  manifestVersion: z.literal("1.0.0"),
  classification: z.literal(STRATEGIC_INTEL_UPDATE_CLASSIFICATION),
  sourceCorpus: z.string(),
  manifestId: z.string(),
  generatedAt: z.string(),
  documents: z.array(
    z.object({
      documentId: z.string(),
      title: z.string(),
      sourceType: z.string(),
      executiveSummary: z.string(),
      keyFindings: z.array(z.string()),
      industryProfiles: z.array(industryProfileSchema),
      riskMetricsCents: z.record(z.string().regex(/^\d+$/)),
    }),
  ),
  ragChunks: z.array(
    z.object({
      chunkId: z.string(),
      documentId: z.string(),
      section: z.string(),
      text: z.string(),
      tags: z.array(z.string()),
      priorityAgents: z.array(z.string()),
    }),
  ),
});

const envelopeSchema = z.object({
  classification: z.literal(STRATEGIC_INTEL_UPDATE_CLASSIFICATION),
  manifestId: z.string(),
  manifestVersion: z.literal("1.0.0"),
  sanitizedBy: z.literal("Irongate-Agent-14"),
  ingestedAt: z.string(),
  manifest: manifestSchema,
});

export type StrategicIntelManifestWire = z.infer<typeof manifestSchema>;

function parseEnvelope(summary: string): z.infer<typeof envelopeSchema> | null {
  try {
    const parsed = envelopeSchema.safeParse(JSON.parse(summary));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function normalizeIndustryKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

function industryKeysMatch(manifestKey: string, uiLabel: string): boolean {
  const a = normalizeIndustryKey(manifestKey);
  const b = normalizeIndustryKey(uiLabel);
  if (a === b) return true;
  if (b.startsWith("state") && a === "public sector") return true;
  if (b.startsWith("federal") && a === "public sector") return true;
  return false;
}

export async function fetchLatestStrategicIntelManifest(
  tenantIdRaw?: unknown,
): Promise<StrategicIntelManifestWire | null> {
  const tenantId = tenantIdRaw ?? resolveBoardOrgTenantId();
  return runIronboardCrmTransaction(tenantId, async (tx, boundTenantId) => {
    const rows = await tx.ironboardCrmInteraction.findMany({
      where: {
        tenantId: boundTenantId,
        channel: "NOTE",
        summary: { contains: STRATEGIC_INTEL_UPDATE_CLASSIFICATION },
      },
      orderBy: { occurredAt: "desc" },
      take: 8,
      select: { summary: true },
    });

    for (const row of rows) {
      const envelope = parseEnvelope(row.summary);
      if (envelope?.manifest) return envelope.manifest;
    }
    return null;
  });
}

export async function getIndustryProfileResearchContext(
  tenantIdRaw: unknown,
  uiIndustry: string,
): Promise<IndustryProfileResearchContext | null> {
  const manifest = await fetchLatestStrategicIntelManifest(tenantIdRaw);
  if (!manifest) return null;

  const matches: Array<{
    profile: z.infer<typeof industryProfileSchema>;
    documentTitle: string;
  }> = [];

  for (const doc of manifest.documents) {
    for (const profile of doc.industryProfiles) {
      if (industryKeysMatch(profile.industryKey, uiIndustry)) {
        matches.push({ profile, documentTitle: doc.title });
      }
    }
  }
  if (matches.length === 0) return null;

  const primary = matches[0].profile;
  const ragExcerpts = manifest.ragChunks
    .filter(chunk =>
      chunk.tags.some(tag => tag.includes("industry") || tag.includes("continuous-audit")),
    )
    .slice(0, 4)
    .map(chunk => chunk.text);

  return {
    manifestId: manifest.manifestId,
    ingestedAt: manifest.generatedAt,
    industryKey: primary.industryKey,
    displayName: primary.displayName,
    peerAleBaselineCents: primary.peerAleBaselineCents,
    regulatoryPressureIndex: primary.regulatoryPressureIndex,
    saasDisruptionExposureIndex: primary.saasDisruptionExposureIndex,
    continuousAuditPriority: primary.continuousAuditPriority,
    narrativeSummary: primary.narrativeSummary,
    sourceDocuments: matches.map(m => m.documentTitle),
    ragExcerpts,
  };
}

export function buildBoardReportStrategicIntelSnippet(
  manifest: StrategicIntelManifestWire | null,
): string {
  if (!manifest) {
    return "Strategic Intel Update corpus not yet ingested — LP-10/LP-16 board sections use live readiness only.";
  }

  const workday = manifest.documents.find(d =>
    d.sourceType.includes("WORKDAY"),
  );
  const saas = manifest.documents.find(d => d.sourceType.includes("SAAS"));
  const ironintelChunks = manifest.ragChunks
    .filter(c => c.priorityAgents.includes("Ironintel"))
    .map(c => c.text)
    .slice(0, 2);
  const ironscribeChunks = manifest.ragChunks
    .filter(c => c.priorityAgents.includes("Ironscribe"))
    .map(c => c.text)
    .slice(0, 2);

  return [
    `STRATEGIC INTEL UPDATE (${manifest.manifestId}) — Infasys Knowledge Base`,
    workday ? `Workday analysis: ${workday.executiveSummary}` : "",
    saas ? `SaaS disruption: ${saas.executiveSummary}` : "",
    "Ironintel (Agent 11) priority excerpts:",
    ...ironintelChunks.map(line => `- ${line}`),
    "Ironscribe (Agent 05) LP-10/LP-16 priority excerpts:",
    ...ironscribeChunks.map(line => `- ${line}`),
  ]
    .filter(Boolean)
    .join("\n");
}

export async function loadStrategicIntelForBoardReport(): Promise<{
  manifest: StrategicIntelManifestWire | null;
  snippet: string;
}> {
  const manifest = await fetchLatestStrategicIntelManifest();
  return {
    manifest,
    snippet: buildBoardReportStrategicIntelSnippet(manifest),
  };
}
