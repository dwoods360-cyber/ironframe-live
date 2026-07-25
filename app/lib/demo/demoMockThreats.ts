import type { PipelineThreat } from "@/app/store/riskStore";
import { DEMO_ENCLAVE_UUID, DEMO_INDUSTRY_UUIDS } from "@/app/lib/demo/demoMode";

/** Static pipeline queue for demo sandbox — no DB or production API writes. */
export function buildDemoPipelineThreats(): PipelineThreat[] {
  const now = new Date().toISOString();
  return [
    {
      id: `demo-threat-${DEMO_INDUSTRY_UUIDS.medshield}-01`,
      name: "PHI Exfiltration Risk — EHR Perimeter",
      loss: 4_200_000,
      industry: "Healthcare",
      description:
        "Anomalous east-west volume on a clinical VLAN; healthcare exposure baseline used for triage preview.",
      source: "Perimeter monitoring",
      target: "EHR cluster",
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
        "Treasury lane shows stale HSM attestation; whole-cent exposure baseline held for board-ready triage.",
      source: "Treasury controls",
      target: "SWIFT Alliance Access",
      lifecycleState: "pipeline",
      createdAt: now,
      ttlSeconds: 86_400,
    },
    {
      id: `demo-threat-${DEMO_ENCLAVE_UUID}-03`,
      name: "OT Network Segment Lateral Movement",
      loss: 1_950_000,
      industry: "Infrastructure",
      description:
        "ICS honeypot trip correlated with critical-infrastructure segment isolation in the demo workspace.",
      source: "OT monitoring",
      target: "SCADA DMZ",
      lifecycleState: "active",
      createdAt: now,
      ttlSeconds: 43_200,
      threatStatus: "ESCALATED",
    },
  ];
}
