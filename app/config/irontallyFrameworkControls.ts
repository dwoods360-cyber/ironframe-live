import { CONSTITUTIONAL_DIRECTIVE_BY_ID } from "@/app/config/constitutionalDirectives";

export type IrontallyFrameworkId =
  | "nist_csf"
  | "iso_27001"
  | "soc2_type2"
  | "csrd_esrs"
  | "eu_ai_act"
  | "dora"
  | "nydfs_500"
  | "uk_csr";

/** CSRD ESRS E1-6 — gross Scope 1/2/3 GHG emissions (Kimbot / Ironscribe sustainability export). */
export const IRONTALLY_CSRD_ESRS_E1_6 = {
  framework: "csrd_esrs" as const,
  controlId: "ESRS E1-6",
  controlTitle: "Gross Scopes 1, 2 and 3 GHG emissions",
  directiveId: "irontally",
  satisfaction:
    "Kimbot CSRD production ledger maps sealed `mitigatedValueCents` and kWh-averted telemetry to ESRS E1-6 disclosure units; simulation/chaos rows are excluded in productionMode.",
};

export type TasFrameworkControlMapping = {
  directiveId: string;
  directiveLabel: string;
  tasLine: number;
  anchorId: string;
  controlId: string;
  controlTitle: string;
  satisfaction: string;
};

function directiveRef(id: string): Pick<TasFrameworkControlMapping, "directiveId" | "directiveLabel" | "tasLine" | "anchorId"> {
  const d = CONSTITUTIONAL_DIRECTIVE_BY_ID[id];
  return {
    directiveId: id,
    directiveLabel: d?.label ?? id,
    tasLine: d?.tasLine ?? 0,
    anchorId: d?.anchorId ?? id,
  };
}

/** TAS.md constitutional directives cross-walked to global control catalogs. */
export const IRONTALLY_FRAMEWORK_CONTROL_MAPPINGS: Record<
  IrontallyFrameworkId,
  TasFrameworkControlMapping[]
> = {
  nist_csf: [
    {
      ...directiveRef("irongate"),
      controlId: "PR.DS-01",
      controlTitle: "Data-at-rest protection",
      satisfaction:
        "Directive 14 (Irongate) enforces DMZ sanitization and tenant-stamped ingestion before data enters the trust zone.",
    },
    {
      ...directiveRef("ironlock"),
      controlId: "DE.CM-01",
      controlTitle: "Continuous monitoring",
      satisfaction:
        "Directive 6 (Ironlock) provides priority interrupt, quarantine, and constitutional freeze on anomaly detection.",
    },
    {
      ...directiveRef("rls"),
      controlId: "PR.AC-03",
      controlTitle: "Remote access managed",
      satisfaction:
        "RLS mandate requires validated tenant context on every scoped read/write — cross-tenant bleed is forbidden.",
    },
    {
      ...directiveRef("irontech"),
      controlId: "RC.RP-01",
      controlTitle: "Recovery plan executed",
      satisfaction:
        "Irontech LKG restoration and chaos post-mortem close the Identify–Protect–Recover loop after constitutional collapse.",
    },
    {
      ...directiveRef("irontally"),
      controlId: "GV.OC-02",
      controlTitle: "Cybersecurity supply chain risk",
      satisfaction:
        "Irontally (Agent 19) maps operational telemetry to CSF tiers and external disclosure frameworks.",
    },
  ],
  iso_27001: [
    {
      ...directiveRef("irongate"),
      controlId: "A.8.12",
      controlTitle: "Data masking",
      satisfaction:
        "Directive 14 (Irongate) satisfies ISO Control A.8.12 (Data Masking) via mandatory DMZ schema gate and payload sanitization.",
    },
    {
      ...directiveRef("ironlock"),
      controlId: "A.8.16",
      controlTitle: "Monitoring activities",
      satisfaction:
        "Ironlock constitutional void and Ironlock freeze satisfy A.8.16 monitoring and incident containment expectations.",
    },
    {
      ...directiveRef("rls"),
      controlId: "A.5.15",
      controlTitle: "Access control",
      satisfaction:
        "Supabase RLS + tenant UUID isolation enforce A.5.15 logical access separation per tenant.",
    },
    {
      ...directiveRef("bigint_ledger"),
      controlId: "A.8.24",
      controlTitle: "Use of cryptography",
      satisfaction:
        "BIGINT ledger lock and SHA-256 constitutional fingerprinting align with integrity controls in Annex A.",
    },
    {
      ...directiveRef("irontally"),
      controlId: "A.5.36",
      controlTitle: "Compliance with policies",
      satisfaction:
        "Irontally attests ISO 27001:2022 maturity levels against Ironframe System Maturity Score.",
    },
  ],
  soc2_type2: [
    {
      ...directiveRef("irongate"),
      controlId: "CC6.1",
      controlTitle: "Logical access security",
      satisfaction:
        "Irongate DMZ stamping satisfies CC6.1 logical access boundaries for ingested payloads.",
    },
    {
      ...directiveRef("ironlock"),
      controlId: "CC7.2",
      controlTitle: "System monitoring",
      satisfaction:
        "Ironlock agent halts pipelines and records IRONLOCK_FREEZE telemetry for Type II monitoring evidence.",
    },
    {
      ...directiveRef("irontech"),
      controlId: "CC9.1",
      controlTitle: "Risk mitigation",
      satisfaction:
        "Irontech post-mortem and Phoenix resurrection document risk treatment after chaos drills.",
    },
    {
      ...directiveRef("irontrust"),
      controlId: "CC3.2",
      controlTitle: "Risk assessment",
      satisfaction:
        "Irontrust ALE engine provides BIGINT-cents risk quantification for SOC 2 risk criteria.",
    },
    {
      ...directiveRef("irontally"),
      controlId: "CC4.1",
      controlTitle: "Monitoring controls",
      satisfaction:
        "Irontally shadow mode silently evaluates certification status after each chaos post-mortem.",
    },
  ],
  csrd_esrs: [
    {
      ...directiveRef("irontally"),
      controlId: IRONTALLY_CSRD_ESRS_E1_6.controlId,
      controlTitle: IRONTALLY_CSRD_ESRS_E1_6.controlTitle,
      satisfaction: IRONTALLY_CSRD_ESRS_E1_6.satisfaction,
    },
    {
      ...directiveRef("ironscribe"),
      controlId: "ESRS E1-5",
      controlTitle: "Energy consumption and mix",
      satisfaction:
        "Ironscribe Carbon Pulse retention and achievement reports attest grid intensity samples used for CSRD energy disclosures.",
    },
  ],
  eu_ai_act: [
    {
      ...directiveRef("irontally"),
      controlId: "Art. 9",
      controlTitle: "Risk management system",
      satisfaction:
        "Irontrust BigInt ALE baselines and Irontally crosswalk map high-risk AI workloads to documented risk treatment.",
    },
    {
      ...directiveRef("irongate"),
      controlId: "Art. 10",
      controlTitle: "Data and data governance",
      satisfaction:
        "Irongate DMZ sanitization enforces tenant-stamped ingress before AI training or inference payloads enter the trust zone.",
    },
    {
      ...directiveRef("ironlock"),
      controlId: "Art. 15",
      controlTitle: "Human oversight",
      satisfaction:
        "Bank Vault dual-gate HITL and Ironlock constitutional freeze provide human-in-the-loop override on autonomous agent actions.",
    },
  ],
  dora: [
    {
      ...directiveRef("irontech"),
      controlId: "Art. 11",
      controlTitle: "ICT-related incident management",
      satisfaction:
        "Irontech post-mortem checkpoints and Ironcast notification cycles document ICT incident detection and recovery.",
    },
    {
      ...directiveRef("ironwatch"),
      controlId: "Art. 17",
      controlTitle: "ICT risk management framework",
      satisfaction:
        "Ironwatch telemetry triage and health-posture crons provide continuous ICT risk monitoring for financial entities.",
    },
    {
      ...directiveRef("rls"),
      controlId: "Art. 28",
      controlTitle: "Third-party ICT risk management",
      satisfaction:
        "Ironmap vendor blast-radius mapping and tenant RLS isolation enforce third-party ICT dependency boundaries.",
    },
  ],
  nydfs_500: [
    {
      ...directiveRef("ironlock"),
      controlId: "500.07",
      controlTitle: "Access privileges",
      satisfaction:
        "Ironlock quarantine and RBAC role gates restrict privileged access to governed threat resolution workflows.",
    },
    {
      ...directiveRef("irongate"),
      controlId: "500.12",
      controlTitle: "Multi-factor authentication",
      satisfaction:
        "Constitutional emergency overlay and Bank Vault Gate A PKI signatures satisfy MFA-equivalent supervisor attestation.",
    },
    {
      ...directiveRef("ironwatch"),
      controlId: "500.14",
      controlTitle: "Audit trail",
      satisfaction:
        "IntegrityEvent hash chain and AuditLog mirror provide non-repudiable audit trails for cybersecurity events.",
    },
  ],
  uk_csr: [
    {
      ...directiveRef("ironcast"),
      controlId: "Reg 12",
      controlTitle: "Material incident notification",
      satisfaction:
        "Ironcast escalation paths target executive notification within governed SLA windows (default 45-day cycle; drill overrides).",
    },
    {
      ...directiveRef("irontech"),
      controlId: "Reg 15",
      controlTitle: "Incident response and recovery",
      satisfaction:
        "Irontech LKG restoration and forensic rollback tests prove recoverability after material ICT disruptions.",
    },
    {
      ...directiveRef("ironmap"),
      controlId: "Reg 18",
      controlTitle: "Supply chain risk",
      satisfaction:
        "Ironmap vendor supply-chain graph surfaces N-tier subprocessors and cascaded blast-radius for material providers.",
    },
  ],
};

export function getFrameworkControlMappings(
  framework: IrontallyFrameworkId,
): TasFrameworkControlMapping[] {
  return IRONTALLY_FRAMEWORK_CONTROL_MAPPINGS[framework] ?? [];
}
