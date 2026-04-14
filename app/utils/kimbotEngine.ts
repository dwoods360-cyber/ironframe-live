/**
 * KIMBOT Red Team signal generator.
 * Industry-aware: generates alerts tailored to selectedIndustry.
 * Occasionally fires Critical (>$10M) to test GRC gates and 15-min notification.
 */

export type KimbotAttackType = "Ransomware" | "Data Leak" | "API Breach";

export type KimbotRawSignal = {
  id: string;
  title: string;
  source: "SOC_EMAIL" | "AGENT_NOTICE";
  severity: "MEDIUM" | "HIGH" | "CRITICAL";
  severityScore: number;
  liability: number;
  agentScore?: number;
  description: string;
  targetSector?: string;
};

const INDUSTRY_TEMPLATES: Record<
  string,
  Record<KimbotAttackType, { titles: string[]; descriptions: string[]; baseLiabilityRange: [number, number] }>
> = {
  Healthcare: {
    Ransomware: {
      titles: ["Ransomware: EHR encryption detected", "LockBit variant on patient DB", "Ransom note on PACS"],
      descriptions: [
        "KIMBOT: Simulated encryption activity on healthcare records.",
        "KIMBOT: Simulated ransom note delivery to admin workstations.",
      ],
      baseLiabilityRange: [3, 8],
    },
    "Data Leak": {
      titles: ["PHI exfiltration attempt", "Bulk patient data egress", "Unusual PHI access pattern"],
      descriptions: [
        "KIMBOT: Simulated PHI exfiltration to external IP.",
        "KIMBOT: Simulated bulk export of patient records.",
      ],
      baseLiabilityRange: [4, 9],
    },
    "API Breach": {
      titles: ["FHIR API abuse", "Health API credential stuffing", "HL7 interface anomaly"],
      descriptions: [
        "KIMBOT: Simulated unauthorized FHIR API access.",
        "KIMBOT: Simulated credential stuffing on health API.",
      ],
      baseLiabilityRange: [2, 7],
    },
  },
  Finance: {
    Ransomware: {
      titles: ["Ransomware: Core banking system", "Ransom note on SWIFT gateway", "Encryption on trade ledger"],
      descriptions: [
        "KIMBOT: Simulated ransomware on finance core.",
        "KIMBOT: Simulated encryption on payment systems.",
      ],
      baseLiabilityRange: [8, 18],
    },
    "Data Leak": {
      titles: ["Unusual SWIFT activity", "Bulk PII exfiltration", "Card data egress detected"],
      descriptions: [
        "KIMBOT: Simulated unusual SWIFT message volume and destinations.",
        "KIMBOT: Simulated cardholder data exfiltration.",
      ],
      baseLiabilityRange: [6, 14],
    },
    "API Breach": {
      titles: ["Open Banking API abuse", "Payment API credential compromise", "Core API anomaly"],
      descriptions: [
        "KIMBOT: Simulated Open Banking API abuse.",
        "KIMBOT: Simulated payment API credential compromise.",
      ],
      baseLiabilityRange: [5, 12],
    },
  },
  Energy: {
    Ransomware: {
      titles: ["Ransomware: SCADA/ICS", "OT network encryption", "Ransom note on HMI"],
      descriptions: [
        "KIMBOT: Simulated ransomware on SCADA segment.",
        "KIMBOT: Simulated encryption on ICS assets.",
      ],
      baseLiabilityRange: [6, 16],
    },
    "Data Leak": {
      titles: ["Grid topology data egress", "Asset list exfiltration", "Unusual OT data egress"],
      descriptions: [
        "KIMBOT: Simulated grid topology data exfiltration.",
        "KIMBOT: Simulated critical asset list egress.",
      ],
      baseLiabilityRange: [4, 11],
    },
    "API Breach": {
      titles: ["DER/API abuse", "Grid API credential stuffing", "SCADA API anomaly"],
      descriptions: [
        "KIMBOT: Simulated DER API abuse.",
        "KIMBOT: Simulated grid API credential stuffing.",
      ],
      baseLiabilityRange: [3, 10],
    },
  },
  Technology: {
    Ransomware: {
      titles: ["Ransomware: SaaS backend", "Encryption on code repo", "Ransom note on CI/CD"],
      descriptions: [
        "KIMBOT: Simulated ransomware on technology stack.",
        "KIMBOT: Simulated encryption on development assets.",
      ],
      baseLiabilityRange: [4, 10],
    },
    "Data Leak": {
      titles: ["IP exfiltration attempt", "Source code egress", "Customer data bulk export"],
      descriptions: [
        "KIMBOT: Simulated IP exfiltration.",
        "KIMBOT: Simulated source code egress.",
      ],
      baseLiabilityRange: [5, 12],
    },
    "API Breach": {
      titles: ["Public API abuse", "Internal API credential leak", "API rate-limit bypass"],
      descriptions: [
        "KIMBOT: Simulated public API abuse.",
        "KIMBOT: Simulated internal API credential leak.",
      ],
      baseLiabilityRange: [3, 9],
    },
  },
  Defense: {
    Ransomware: {
      titles: ["Ransomware: Classified segment", "Encryption on defense network", "Ransom note on C2"],
      descriptions: [
        "KIMBOT: Simulated ransomware on defense segment.",
        "KIMBOT: Simulated encryption on C2 assets.",
      ],
      baseLiabilityRange: [10, 22],
    },
    "Data Leak": {
      titles: ["Classified data egress", "Unusual comms exfiltration", "Sensitive asset list egress"],
      descriptions: [
        "KIMBOT: Simulated classified data egress.",
        "KIMBOT: Simulated sensitive asset list exfiltration.",
      ],
      baseLiabilityRange: [8, 18],
    },
    "API Breach": {
      titles: ["Defense API abuse", "Tactical API credential compromise", "Command API anomaly"],
      descriptions: [
        "KIMBOT: Simulated defense API abuse.",
        "KIMBOT: Simulated tactical API credential compromise.",
      ],
      baseLiabilityRange: [6, 14],
    },
  },
};

const DEFAULT_TEMPLATE = INDUSTRY_TEMPLATES.Healthcare;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** ~15% chance to force Critical >$10M to test GRC gates and 15-min notification */
const CRITICAL_TEST_PROBABILITY = 0.15;

/**
 * Generate one KIMBOT signal. Uses selectedIndustry for templates; intensity (1-10) scales severity.
 * Liability is always $5M–$25M (strict BIGINT cents) to enable GRC Gate testing.
 */
export function generateKimbotSignal(
  selectedIndustry: string,
  attackType: KimbotAttackType,
  intensity: number
): KimbotRawSignal {
  const industryKey = selectedIndustry in INDUSTRY_TEMPLATES ? selectedIndustry : "Healthcare";
  const template = INDUSTRY_TEMPLATES[industryKey] ?? DEFAULT_TEMPLATE;
  const attack = template[attackType];

  const forceCritical = Math.random() < CRITICAL_TEST_PROBABILITY;
  // Strict BIGINT cents: $5.0M to $25.0M (500_000_000 to 2_500_000_000 cents)
  const riskCents =
    BigInt(Math.floor(Math.random() * 20_000_000) + 5_000_000) * 100n;
  const liabilityMillions = Number(riskCents) / 100_000_000;

  const severityScore = forceCritical
    ? 85 + Math.floor(Math.random() * 15)
    : Math.min(99, 40 + intensity * 5 + Math.floor(Math.random() * 20));

  let severity: "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM";
  if (severityScore >= 80 || liabilityMillions > 10) severity = "CRITICAL";
  else if (severityScore >= 50) severity = "HIGH";

  const title = pick(attack.titles);
  const description = pick(attack.descriptions);

  const id = `kimbot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  return {
    id,
    title: `[KIMBOT] ${title}`,
    source: "AGENT_NOTICE",
    severity,
    severityScore,
    liability: Math.round(liabilityMillions * 10) / 10,
    agentScore: severityScore,
    description,
    targetSector: industryKey,
  };
}

/**
 * Interval delay in ms based on intensity (1-10). Higher intensity = more frequent injections.
 * 1 => ~60s, 10 => ~6s.
 */
export function kimbotIntervalMs(intensity: number): number {
  const clamped = Math.max(1, Math.min(10, intensity));
  return 70_000 - clamped * 6_000;
}
