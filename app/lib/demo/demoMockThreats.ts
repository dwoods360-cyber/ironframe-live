import type { PipelineThreat } from "@/app/store/riskStore";
import { DEMO_ENCLAVE_UUID, DEMO_INDUSTRY_UUIDS } from "@/app/lib/demo/demoMode";

/** Static pipeline queue for demo sandbox — no DB or Ironguard writes. */
export function buildDemoPipelineThreats(): PipelineThreat[] {
  const now = new Date().toISOString();
  return [
    {
      id: `demo-threat-${DEMO_INDUSTRY_UUIDS.medshield}-01`,
      name: "PHI Exfiltration — EHR Perimeter",
      loss: 4_200_000,
      industry: "Healthcare",
      description:
        "Anomalous east-west volume on clinical VLAN; Medshield ALE baseline engaged for triage preview.",
      source: "Ironwatch",
      target: "Epic Hyperspace Cluster",
      lifecycleState: "pipeline",
      createdAt: now,
      ttlSeconds: 86_400,
    },
    {
      id: `demo-threat-${DEMO_INDUSTRY_UUIDS.vaultbank}-02`,
      name: "SWIFT Gateway Credential Rotation Gap",
      loss: 2_850_000,
      industry: "Finance",
      description:
        "Vaultbank treasury lane shows stale HSM attestation; constitutional BIGINT lock held at baseline.",
      source: "CoreIntel",
      target: "SWIFT Alliance Access",
      lifecycleState: "pipeline",
      createdAt: now,
      ttlSeconds: 86_400,
    },
    {
      id: `demo-threat-${DEMO_ENCLAVE_UUID}-03`,
      name: "OT Segment Lateral Movement — Gridcore",
      loss: 1_950_000,
      industry: "Infrastructure",
      description:
        "ICS honeypot trip correlated with Acme demo enclave aggregate dashboard scope.",
      source: "Irongate",
      target: "SCADA DMZ",
      lifecycleState: "active",
      createdAt: now,
      ttlSeconds: 43_200,
      threatStatus: "ESCALATED",
    },
  ];
}
