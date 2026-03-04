/**
 * GRCBOT Operations Simulator: simulates 1–100 companies, vendor artifact submissions,
 * and GRC acknowledge/process events so SLA Compliance on Reports can be stress-tested.
 * Every generated threat is persisted to the database (ThreatEvent) so triage is real and actionable.
 */

import { appendAuditLog, type CreateAuditLogInput } from "@/app/utils/auditLogger";
import { useRiskStore, type PipelineThreat } from "@/app/store/riskStore";
import { useAgentStore } from "@/app/store/agentStore";
import type { SerializedCompany } from "@/app/components/GlobalHealthSummaryCardClient";
import { createGrcBotThreatServer } from "@/app/actions/simulationActions";

const SECTORS = ["Healthcare", "Finance", "Energy"] as const;
const TENANT_BY_SECTOR: Record<(typeof SECTORS)[number], string> = {
  Healthcare: "Medshield",
  Finance: "Vaultbank",
  Energy: "Gridcore",
};
const STATUS_ACTIVE = "ACTIVE";
const STATUS_GAP = "GAP DETECTED";
const TTL_WINDOW_MS = 72 * 60 * 60 * 1000;

export type GrcBotCycleOptions = {
  failSlaProbability?: number;
  companyCount?: number;
};

let cycleId = 0;

/**
 * Generate simulated companies for Global Command Center (1–100 tenants).
 */
export function generateSimulatedCompanies(count: number): SerializedCompany[] {
  const companies: SerializedCompany[] = [];
  for (let i = 0; i < count; i++) {
    const sector = SECTORS[i % SECTORS.length];
    const numRisks = Math.floor(Math.random() * 4) + 0;
    const numPolicies = Math.floor(Math.random() * 3) + 0;
    companies.push({
      name: `${sector} Tenant ${i + 1}`,
      sector,
      risks: Array.from({ length: numRisks }, () => ({
        status: Math.random() > 0.4 ? STATUS_ACTIVE : "MITIGATED",
      })),
      policies: Array.from({ length: numPolicies }, () => ({
        status: Math.random() > 0.5 ? STATUS_GAP : "COMPLIANT",
      })),
      industry_avg_loss_cents: Math.random() > 0.2 ? Math.floor(Math.random() * 50000) + 10000 : null,
    });
  }
  return companies;
}

function logSimulation(input: CreateAuditLogInput & { metadata_tag?: string | null }): void {
  const tag = (input.metadata_tag ?? "").startsWith("SIMULATION")
    ? input.metadata_tag
    : `SIMULATION|GRCBOT|${input.metadata_tag ?? ""}`;
  appendAuditLog({
    ...input,
    log_type: "SIMULATION",
    metadata_tag: tag,
    user_id: "GRCBOT",
  });
}

/**
 * Run one GRCBOT cycle: persist threat to DB, add to pipeline (with DB id), then log simulation events.
 * Every card is real (ThreatEvent) so triage and audit log succeed.
 */
export async function runGrcBotCycle(options: GrcBotCycleOptions = {}): Promise<void> {
  const { failSlaProbability = 0.15 } = options;
  cycleId += 1;
  const sector = SECTORS[Math.floor(Math.random() * SECTORS.length)];
  const canonicalTenant = TENANT_BY_SECTOR[sector];
  const liability = Number((Math.random() * 8 + 0.5).toFixed(1));
  const severity = Math.min(10, Math.max(1, Math.round(liability)));
  const threatName = `Vendor artifact GRCBOT ${cycleId}`;

  const created = await createGrcBotThreatServer({
    title: threatName,
    // targetEntity in ThreatEvent must be a canonical tenant name to preserve DB integrity.
    sector: canonicalTenant,
    liability,
    source: "GRCBOT (Simulation)",
    severity,
  });

  const threatId = created.id;
  const ts = new Date().toISOString();
  useAgentStore.getState().addStreamMessage(
    `> [${ts}] GRCBOT: cycle ${threatId} | sector:${sector} | tenant:${canonicalTenant} | $${liability}M`,
  );

  logSimulation({
    action_type: "GRC_VENDOR_ARTIFACT_SUBMIT",
    description: `GRCBOT submitted vendor artifact: ${threatName} (sector: ${sector}, tenant: ${canonicalTenant}, liability: $${liability}M)`,
    metadata_tag: `SIMULATION|GRCBOT|vendor|sector:${sector}|tenant:${canonicalTenant}`,
  });

  const pipelineThreat: PipelineThreat = {
    id: created.id,
    name: created.title,
    loss: created.financialRisk_cents / 100_000_000,
    score: created.score,
    industry: created.targetEntity,
    source: created.sourceAgent,
    description: `Simulated vendor artifact · Liability: $${(created.financialRisk_cents / 100_000_000).toFixed(1)}M`,
  };
  useRiskStore.getState().upsertPipelineThreat(pipelineThreat);

  const now = Date.now();
  const failSla = Math.random() < failSlaProbability;
  const triageTs = failSla ? now - TTL_WINDOW_MS - 60 * 60 * 1000 : now - 60 * 60 * 1000;
  const processTs = now;
  const triageIso = new Date(triageTs).toISOString();
  const processIso = new Date(processTs).toISOString();

  logSimulation({
    action_type: "GRC_ACKNOWLEDGE_CLICK",
    description: `threat: ${threatId}`,
    metadata_tag: `SIMULATION|GRCBOT|ack|sector:${sector}|tenant:${canonicalTenant}|threatId:${threatId}`,
    timestamp: triageIso,
  });

  logSimulation({
    action_type: "GRC_PROCESS_THREAT",
    description: `Processed: ${threatId}`,
    metadata_tag: `SIMULATION|GRCBOT|process|sector:${sector}|tenant:${canonicalTenant}|${failSla ? "SLA_FAIL" : "SLA_OK"}|threatId:${threatId}`,
    timestamp: processIso,
  });
}
