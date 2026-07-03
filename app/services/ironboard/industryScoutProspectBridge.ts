import "server-only";

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

import prisma from "@/lib/prisma";
import { readRegulatoryIngestionState } from "@/app/lib/regulatoryIngestionState";
import type { IngestedRegulationRecord } from "@/app/types/regulatoryIngestion";

export const INDUSTRY_SCOUT_PROSPECT_CATALYST = "INDUSTRY_SCOUT_PROSPECT_CATALYST" as const;

export type IndustryScoutProspectCatalystEnvelope = {
  classification: typeof INDUSTRY_SCOUT_PROSPECT_CATALYST;
  regulationId: string;
  authority: string;
  title: string;
  sourceUrl: string;
  matchedFramework: "SOC2" | "ISO27001";
  prospectDomain: string;
  prospectRegion: string;
  whyNow: string;
  ingestedAt: string;
  linkedAt: string;
};

type BridgeState = {
  lastRunAt: string | null;
  linkedPairKeys: string[];
};

const STATE_DIR = join(process.cwd(), "storage", "constitutional");
const BRIDGE_STATE_FILE = join(STATE_DIR, "industry-scout-prospect-bridge.json");

const AUTHORITY_JURISDICTIONS: Record<string, readonly string[]> = {
  SEC: ["United States", "US", "USA", "America", "New York", "California"],
  NIST: [
    "United States",
    "US",
    "USA",
    "United Kingdom",
    "London",
    "Singapore",
    "Germany",
    "Canada",
    "Australia",
    "Ireland",
    "France",
    "Netherlands",
  ],
  Colorado: ["United States", "US", "USA", "Colorado"],
};

function readBridgeState(): BridgeState {
  try {
    if (!existsSync(BRIDGE_STATE_FILE)) {
      return { lastRunAt: null, linkedPairKeys: [] };
    }
    const parsed = JSON.parse(readFileSync(BRIDGE_STATE_FILE, "utf8")) as Partial<BridgeState>;
    return {
      lastRunAt: parsed.lastRunAt ?? null,
      linkedPairKeys: parsed.linkedPairKeys ?? [],
    };
  } catch {
    return { lastRunAt: null, linkedPairKeys: [] };
  }
}

function writeBridgeState(state: BridgeState): void {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(
    BRIDGE_STATE_FILE,
    JSON.stringify(
      {
        ...state,
        linkedPairKeys: state.linkedPairKeys.slice(-2000),
      },
      null,
      2,
    ),
    "utf8",
  );
}

function pairKey(regulationId: string, prospectDomain: string): string {
  return `${regulationId}|${prospectDomain.toLowerCase()}`;
}

export function inferFrameworksFromRegulation(reg: IngestedRegulationRecord): Array<"SOC2" | "ISO27001"> {
  const text = `${reg.title} ${reg.blocks.map((b) => `${b.title} ${b.body}`).join(" ")}`.toLowerCase();
  const frameworks = new Set<"SOC2" | "ISO27001">();
  if (/soc\s*2|soc2|trust services|aicpa|service organization/.test(text)) {
    frameworks.add("SOC2");
  }
  if (/iso\s*27001|iso27001|information security management|isms/.test(text)) {
    frameworks.add("ISO27001");
  }
  if (/nist|800-53|800-137|cybersecurity framework|csf\b/.test(text)) {
    frameworks.add("SOC2");
    frameworks.add("ISO27001");
  }
  if (/breach notification|incident response|safeguards/.test(text)) {
    frameworks.add("SOC2");
  }
  if (frameworks.size === 0) {
    frameworks.add("SOC2");
    frameworks.add("ISO27001");
  }
  return [...frameworks];
}

export function regionMatchesAuthority(prospectRegion: string, authority: string): boolean {
  const normalized = prospectRegion.trim().toLowerCase();
  const jurisdictions = AUTHORITY_JURISDICTIONS[authority] ?? AUTHORITY_JURISDICTIONS.NIST;
  return jurisdictions.some((j) => normalized.includes(j.toLowerCase()) || j.toLowerCase().includes(normalized));
}

export function frameworkMatchesProspect(
  prospectCompliance: string,
  framework: "SOC2" | "ISO27001",
): boolean {
  const pressure = prospectCompliance.trim().toUpperCase();
  if (framework === "SOC2") return pressure === "SOC2";
  if (framework === "ISO27001") return pressure === "ISO27001";
  return false;
}

function buildWhyNow(reg: IngestedRegulationRecord, framework: "SOC2" | "ISO27001"): string {
  const deadlineBlock = reg.blocks.find((b) => b.effectiveDate)?.effectiveDate;
  const deadline = deadlineBlock ? ` Effective date signal: ${deadlineBlock}.` : "";
  return `${reg.authority} published "${reg.title}" — immediate ${framework} alignment pressure for fintech operators in scope.${deadline}`;
}

export function resolveBoardOrgTenantUuid(): string {
  const fromEnv = process.env.IRONBOARD_BOARD_ORG_TENANT_UUID?.trim();
  if (fromEnv) return fromEnv;
  return "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";
}

export type IndustryScoutProspectBridgeResult = {
  regulationsScanned: number;
  prospectsScanned: number;
  linksCreated: number;
  scoreBumps: number;
  skippedDuplicates: number;
};

/**
 * Nightly (post–Industry Scout) matcher: links new regulatory items to active GTM prospects
 * by jurisdiction + SOC2/ISO27001 framework fit, persisting CRM catalyst notes.
 */
export async function runIndustryScoutProspectBridge(options?: {
  tenantId?: string;
  sinceIso?: string;
}): Promise<IndustryScoutProspectBridgeResult> {
  const tenantId = options?.tenantId?.trim() || resolveBoardOrgTenantUuid();
  const bridgeState = readBridgeState();
  const linked = new Set(bridgeState.linkedPairKeys);

  const ingestState = await readRegulatoryIngestionState();
  const sinceMs = options?.sinceIso
    ? Date.parse(options.sinceIso)
    : bridgeState.lastRunAt
      ? Date.parse(bridgeState.lastRunAt)
      : Date.now() - 86_400_000;

  const regulations = ingestState.regulations.filter((reg) => Date.parse(reg.ingestedAt) >= sinceMs);

  const prospects = await prisma.marketProspect.findMany({
    where: {
      dealStage: { not: "REJECTED" },
      aiFitnessScore: { gte: 100 },
    },
    orderBy: { aiFitnessScore: "desc" },
    take: 200,
  });

  let linksCreated = 0;
  let scoreBumps = 0;
  let skippedDuplicates = 0;

  for (const reg of regulations) {
    const frameworks = inferFrameworksFromRegulation(reg);
    for (const prospect of prospects) {
      if (!regionMatchesAuthority(prospect.region, reg.authority)) continue;

      for (const framework of frameworks) {
        if (!frameworkMatchesProspect(prospect.compliancePressure, framework)) continue;

        const key = pairKey(reg.id, prospect.domain);
        if (linked.has(key)) {
          skippedDuplicates += 1;
          continue;
        }

        const linkedAt = new Date().toISOString();
        const envelope: IndustryScoutProspectCatalystEnvelope = {
          classification: INDUSTRY_SCOUT_PROSPECT_CATALYST,
          regulationId: reg.id,
          authority: reg.authority,
          title: reg.title,
          sourceUrl: reg.sourceUrl,
          matchedFramework: framework,
          prospectDomain: prospect.domain,
          prospectRegion: prospect.region,
          whyNow: buildWhyNow(reg, framework),
          ingestedAt: reg.ingestedAt,
          linkedAt,
        };

        await prisma.ironboardCrmInteraction.create({
          data: {
            tenantId,
            channel: "NOTE",
            summary: JSON.stringify(envelope),
            occurredAt: new Date(linkedAt),
          },
        });

        await prisma.marketProspect.update({
          where: { id: prospect.id },
          data: { aiFitnessScore: { increment: 10 } },
        });

        await prisma.marketIntelligenceFlywheelLog.create({
          data: {
            component: "INDUSTRY_SCOUT_PROSPECT_BRIDGE",
            message: `Linked ${reg.authority} "${reg.title}" → ${prospect.domain} (${framework})`,
          },
        });

        linked.add(key);
        linksCreated += 1;
        scoreBumps += 1;
      }
    }
  }

  writeBridgeState({
    lastRunAt: new Date().toISOString(),
    linkedPairKeys: [...linked],
  });

  return {
    regulationsScanned: regulations.length,
    prospectsScanned: prospects.length,
    linksCreated,
    scoreBumps,
    skippedDuplicates,
  };
}

export async function findLatestRegulatoryCatalystForDomain(
  domain: string,
  tenantId?: string,
): Promise<IndustryScoutProspectCatalystEnvelope | null> {
  const tenant = tenantId?.trim() || resolveBoardOrgTenantUuid();
  const needle = domain.trim().toLowerCase();
  const rows = await prisma.ironboardCrmInteraction.findMany({
    where: {
      tenantId: tenant,
      channel: "NOTE",
      summary: { contains: INDUSTRY_SCOUT_PROSPECT_CATALYST },
    },
    orderBy: { occurredAt: "desc" },
    take: 40,
    select: { summary: true },
  });

  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.summary) as IndustryScoutProspectCatalystEnvelope;
      if (
        parsed.classification === INDUSTRY_SCOUT_PROSPECT_CATALYST &&
        parsed.prospectDomain?.toLowerCase() === needle
      ) {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function catalystFingerprint(envelope: IndustryScoutProspectCatalystEnvelope): string {
  return createHash("sha256")
    .update(`${envelope.regulationId}|${envelope.prospectDomain}|${envelope.matchedFramework}`, "utf8")
    .digest("hex")
    .slice(0, 16);
}
