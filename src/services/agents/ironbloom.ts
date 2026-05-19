import { SovereignGraphState } from "../orchestration/state";
import { computeSustainabilityAleForTenantUuid } from "@/app/services/ironbloom/scoring";
import { IronbloomCriticalIngestionError } from "@/lib/sustainability/constants";
import { isDependencyOrTimeoutError } from "@/src/services/irontech/agentFailureSignals";
import {
  blastRadiusWorkforcePctForProvider,
  formatTier1BlockBypassLog,
  logSelfHealingIntervention,
  recordHealthyAgentCheckpoint,
  registerConcurrentAgentFailure,
} from "@/src/services/irontech/autonomousDecoupling";

/**
 * Agent 18 (Ironbloom) — LangGraph node: Sustainability ALE + BigInt `mitigatedValueCents`.
 */
export class Ironbloom {
  static async scoreCarbonRisk(
    state: typeof SovereignGraphState.State,
  ): Promise<Partial<typeof SovereignGraphState.State>> {
    const raw = state.raw_payload ?? {};
    const assetId =
      typeof raw.asset_id === "string"
        ? raw.asset_id
        : typeof raw.assetId === "string"
          ? raw.assetId
          : "ESG_ORCHESTRATION";
    const unitsKwh =
      typeof raw.units_kwh === "number"
        ? raw.units_kwh
        : typeof raw.kwh === "number"
          ? raw.kwh
          : typeof raw.unitsKwh === "number"
            ? raw.unitsKwh
            : Number(raw.kwhAverted ?? 0);

    try {
      const breakdown = await computeSustainabilityAleForTenantUuid({
        tenantUuid: state.tenant_id,
        unitsKwh,
        assetId,
        payload: raw,
      });

      void recordHealthyAgentCheckpoint({
        agentName: "Ironbloom",
        tenantId: state.tenant_id,
        snapshot: {
          mitigated_value_cents: breakdown.mitigatedValueCents.toString(),
          sustainability_ale_cents: breakdown.mitigatedValueCents.toString(),
          financial_ale_cents: breakdown.tenantTotalAleCents.toString(),
          unitsKwh: breakdown.unitsKwh,
          carbonIntensityGco2PerKwh: breakdown.carbonIntensityGco2PerKwh,
        },
      }).catch(() => undefined);

      return {
        current_agent: "IRONTRUST",
        status: "PROCESSING",
        mitigated_value_cents: breakdown.mitigatedValueCents.toString(),
        sustainability_ale_cents: breakdown.mitigatedValueCents.toString(),
        financial_ale_cents: breakdown.tenantTotalAleCents.toString(),
        carbon_intensity_gco2: breakdown.carbonIntensityGco2PerKwh,
        agent_logs: [
          `Ironbloom: ALE_carbon=${breakdown.aleCarbonUsd.toFixed(2)} USD (${breakdown.mitigatedValueCents.toString()} cents)`,
          `Ironbloom: ${breakdown.unitsKwh} kWh × ${breakdown.carbonIntensityGco2PerKwh} gCO₂/kWh × $${breakdown.offsetPriceUsdPerMetricTon}/t × R_tax=${breakdown.regulatoryMultiplier}`,
          `Ironbloom: carbon share ${breakdown.carbonShareOfTenantAleBps.toString()} bps of tenant ALE (${breakdown.tenantTotalAleCents.toString()} cents baseline)`,
        ],
      };
    } catch (e) {
      if (e instanceof IronbloomCriticalIngestionError) {
        registerConcurrentAgentFailure("ironbloom");
        return {
          current_agent: "END",
          status: "FAILED",
          agent_logs: [`CRITICAL_INGESTION_FAILURE: ${e.message}`],
        };
      }
      if (isDependencyOrTimeoutError(e)) {
        const { emergency } = registerConcurrentAgentFailure("ironbloom");
        if (emergency) {
          return {
            current_agent: "END",
            status: "FAILED",
            agent_logs: [
              `CONSTITUTIONAL_EMERGENCY_GATE:>3_distinct_agents_simultaneous_window`,
              `DEPENDENCY_ERROR:ironbloom:${e instanceof Error ? e.message : String(e)}`,
            ],
          };
        }
        const nowIso = new Date().toISOString();
        void logSelfHealingIntervention({
          tenantId: state.tenant_id,
          kind: "TIER1_DECOUPLE",
          agentX: "Ironbloom",
          decoupledAtIso: nowIso,
          blastRadiusWorkforcePct: blastRadiusWorkforcePctForProvider(),
          constitutionalEmergencyGate: false,
          manualIntervention: false,
        });
        return {
          current_agent: "IRONTRUST",
          status: "PROCESSING",
          irontech_blocked_paths: ["ironbloom"],
          agent_logs: [
            formatTier1BlockBypassLog("ironbloom"),
            `DEPENDENCY_ERROR:ironbloom:${e instanceof Error ? e.message : String(e)}`,
            "IRONTECH: parallel_independent_nodes=IRONTRUST,ironsight,irontally_non_esg",
          ],
        };
      }
      throw e;
    }
  }
}
