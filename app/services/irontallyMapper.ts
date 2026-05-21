import type { IrontallyFrameworkId } from "@/app/config/irontallyFrameworkControls";
import { GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS } from "@/app/utils/financialRisk";

/** Peer average maturity for ~$1.6B governed financial entities (Irontally market benchmark). */
export const IRONTALLY_INDUSTRY_AVG_MATURITY_1_6B = 6.4;

/** Minimum Ironframe score treated as SOC 2 Type II “compliant” floor. */
export const IRONTALLY_REGULATORY_FLOOR_MATURITY = 5;

export type NistCsfTier = 1 | 2 | 3 | 4;

export type NistCsfMapping = {
  tier: NistCsfTier;
  label: string;
  description: string;
  scoreMin: number;
  scoreMax: number;
};

export type Iso27001Mapping = {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  description: string;
  scoreMin: number;
  scoreMax: number;
};

export type Soc2Type2Mapping = {
  status: "NON_COMPLIANT" | "COMPLIANT" | "HIGH_INTEGRITY_VERIFIED";
  label: string;
  description: string;
  scoreMin: number;
  scoreMax: number;
};

export type IrontallyFrameworkRow = {
  frameworkId: IrontallyFrameworkId;
  frameworkName: string;
  postureLabel: string;
  postureDetail: string;
  certified: boolean;
  tierOrLevel: string;
};

export type IrontallyMarketComparison = {
  currentScore: number;
  industryAverage: number;
  industryLabel: string;
  regulatoryFloor: number;
  resilienceSurplus: number;
  resilienceSurplusDisplay: string;
  vsIndustryDelta: number;
  chartSeries: Array<{ name: string; score: number; fill: string }>;
};

export type IrontallyFrameworkSnapshot = {
  maturityScore: number;
  asOf: string;
  nist: NistCsfMapping;
  iso: Iso27001Mapping;
  soc2: Soc2Type2Mapping;
  frameworks: IrontallyFrameworkRow[];
  market: IrontallyMarketComparison;
  readinessStatement: string;
  nistTierExceedancePercent: number;
};

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 1;
  return Math.min(10, Math.max(1, score));
}

export function mapMaturityToNistCsfTier(score: number): NistCsfMapping {
  const s = clampScore(score);
  if (s <= 3) {
    return {
      tier: 1,
      label: "Tier 1 — Partial",
      description: "Ad hoc, reactive practices; limited awareness of cybersecurity risk.",
      scoreMin: 1,
      scoreMax: 3,
    };
  }
  if (s <= 5) {
    return {
      tier: 2,
      label: "Tier 2 — Risk Informed",
      description: "Risk management practices approved by management but not organization-wide.",
      scoreMin: 4,
      scoreMax: 5,
    };
  }
  if (s <= 8) {
    return {
      tier: 3,
      label: "Tier 3 — Repeatable",
      description: "Organization-wide policies; regularly updated from risk assessments.",
      scoreMin: 6,
      scoreMax: 8,
    };
  }
  return {
    tier: 4,
    label: "Tier 4 — Adaptive",
    description: "Continuous improvement; lessons learned drive proactive adaptation.",
    scoreMin: 9,
    scoreMax: 10,
  };
}

export function mapMaturityToIso27001Level(score: number): Iso27001Mapping {
  const s = clampScore(score);
  if (s <= 2) {
    return {
      level: 1,
      label: "Level 1 — Initial",
      description: "Unpredictable, ad hoc ISMS processes.",
      scoreMin: 1,
      scoreMax: 2,
    };
  }
  if (s <= 4) {
    return {
      level: 2,
      label: "Level 2 — Managed",
      description: "Reactive controls; basic documentation emerging.",
      scoreMin: 3,
      scoreMax: 4,
    };
  }
  if (s <= 6) {
    return {
      level: 3,
      label: "Level 3 — Defined",
      description: "Documented processes integrated into operations.",
      scoreMin: 5,
      scoreMax: 6,
    };
  }
  if (s <= 8) {
    return {
      level: 4,
      label: "Level 4 — Quantitatively Managed",
      description: "Measured, controlled, and continuously improved ISMS.",
      scoreMin: 7,
      scoreMax: 8,
    };
  }
  return {
    level: 5,
    label: "Level 5 — Optimized",
    description: "Focus on continuous improvement and innovation.",
    scoreMin: 9,
    scoreMax: 10,
  };
}

export function mapMaturityToSoc2Type2(score: number): Soc2Type2Mapping {
  const s = clampScore(score);
  if (s < 5) {
    return {
      status: "NON_COMPLIANT",
      label: "Non-Compliant",
      description: "Trust criteria gaps; Type II attestation not supportable at current maturity.",
      scoreMin: 1,
      scoreMax: 4.99,
    };
  }
  if (s <= 8) {
    return {
      status: "COMPLIANT",
      label: "Compliant",
      description: "Meets baseline Type II operating effectiveness for monitored controls.",
      scoreMin: 5,
      scoreMax: 8,
    };
  }
  return {
    status: "HIGH_INTEGRITY_VERIFIED",
    label: "High-Integrity Verified",
    description: "Elevated attestation band with constitutional chaos evidence and forensic surplus.",
    scoreMin: 9,
    scoreMax: 10,
  };
}

export function isSoc2Certified(score: number): boolean {
  return clampScore(score) >= 5;
}

export function isIsoCertified(score: number): boolean {
  return mapMaturityToIso27001Level(score).level >= 3;
}

export function isNistTier4OrBetter(score: number): boolean {
  return mapMaturityToNistCsfTier(score).tier >= 4;
}

export function computeNistTierExceedancePercent(score: number): number {
  const s = clampScore(score);
  const nist = mapMaturityToNistCsfTier(s);
  if (nist.tier < 4) return 0;
  const tierFloor = nist.scoreMin;
  return Math.round(((s - tierFloor) / tierFloor) * 1000) / 10;
}

export function computeIndustryExceedancePercent(score: number): number {
  const s = clampScore(score);
  const avg = IRONTALLY_INDUSTRY_AVG_MATURITY_1_6B;
  return Math.round(((s - avg) / avg) * 1000) / 10;
}

export function buildIrontallyMarketComparison(score: number): IrontallyMarketComparison {
  const currentScore = clampScore(score);
  const industryAverage = IRONTALLY_INDUSTRY_AVG_MATURITY_1_6B;
  const regulatoryFloor = IRONTALLY_REGULATORY_FLOOR_MATURITY;
  const resilienceSurplus = Math.max(0, currentScore - regulatoryFloor);
  const vsIndustryDelta = currentScore - industryAverage;

  return {
    currentScore,
    industryAverage,
    industryLabel: `$${GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS}B financial entity peer average`,
    regulatoryFloor,
    resilienceSurplus,
    resilienceSurplusDisplay: `+${resilienceSurplus.toFixed(1)} pts above regulatory floor`,
    vsIndustryDelta,
    chartSeries: [
      { name: "Regulatory floor", score: regulatoryFloor, fill: "#f43f5e" },
      { name: "Industry avg", score: industryAverage, fill: "#64748b" },
      { name: "Ironframe", score: currentScore, fill: "#22d3ee" },
    ],
  };
}

export function buildComplianceReadinessStatement(
  score: number,
  asOf: string = new Date().toISOString(),
): string {
  const s = clampScore(score);
  const nist = mapMaturityToNistCsfTier(s);
  const iso = mapMaturityToIso27001Level(s);
  const soc2 = mapMaturityToSoc2Type2(s);
  const industryPct = computeIndustryExceedancePercent(s);
  const dateLabel = asOf.slice(0, 10);

  const nistClause =
    nist.tier >= 4
      ? `exceeding NIST CSF 2.0 ${nist.label} peer benchmarks by ${industryPct}%`
      : `aligned to NIST CSF 2.0 ${nist.label}`;

  return (
    `As of ${dateLabel}, the system operates at Level ${s.toFixed(1)} Maturity on the Ironframe ` +
    `1–10 scale, ${nistClause}, with ISO 27001:2022 posture at ${iso.label} and SOC 2 Type II ` +
    `status ${soc2.label}. Irontally (Agent 19) attests constitutional controls in TAS.md satisfy ` +
    `mapped global controls for audit-ready disclosure.`
  );
}

export function buildIrontallyFrameworkSnapshot(
  score: number,
  asOf?: string,
): IrontallyFrameworkSnapshot {
  const maturityScore = clampScore(score);
  const timestamp = asOf ?? new Date().toISOString();
  const nist = mapMaturityToNistCsfTier(maturityScore);
  const iso = mapMaturityToIso27001Level(maturityScore);
  const soc2 = mapMaturityToSoc2Type2(maturityScore);
  const market = buildIrontallyMarketComparison(maturityScore);
  const nistTierExceedancePercent = computeNistTierExceedancePercent(maturityScore);

  const frameworks: IrontallyFrameworkRow[] = [
    {
      frameworkId: "nist_csf",
      frameworkName: "NIST CSF 2.0",
      postureLabel: nist.label,
      postureDetail: nist.description,
      certified: nist.tier >= 3,
      tierOrLevel: `Tier ${nist.tier}`,
    },
    {
      frameworkId: "iso_27001",
      frameworkName: "ISO 27001:2022",
      postureLabel: iso.label,
      postureDetail: iso.description,
      certified: isIsoCertified(maturityScore),
      tierOrLevel: `Level ${iso.level}`,
    },
    {
      frameworkId: "soc2_type2",
      frameworkName: "SOC 2 Type II",
      postureLabel: soc2.label,
      postureDetail: soc2.description,
      certified: isSoc2Certified(maturityScore),
      tierOrLevel: soc2.status,
    },
  ];

  return {
    maturityScore,
    asOf: timestamp,
    nist,
    iso,
    soc2,
    frameworks,
    market,
    readinessStatement: buildComplianceReadinessStatement(maturityScore, timestamp),
    nistTierExceedancePercent,
  };
}
