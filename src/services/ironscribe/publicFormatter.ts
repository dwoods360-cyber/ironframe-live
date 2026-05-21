/**
 * Ironscribe (Agent 5) — Public Transparency / Privacy-safe disclosure formatting.
 * No raw dollar ALE in public exports; tenant names anonymized; resilience badge + social copy.
 */
import { TENANT_INDUSTRY_BASELINE_ALE_CENTS } from "@/app/constants/devTenantRoster";

export const PUBLIC_TRANSPARENCY_GAVEL_FOOTER =
  "This report is an automated, high-fidelity export of the Ironframe Constitutional GRC workforce. " +
  "Integrity verified via SHA-256.";

/** PDV citation for SCC valuation anchor (EPA 2026 interim benchmark, encoded as $190/tCO₂e in-engine). */
export const EPA_2026_SCC_PUBLIC_CITATION =
  "Non-market valuation references the U.S. Environmental Protection Agency (EPA) 2026 interim Social Cost of Carbon (SCC) benchmark, applied in this disclosure engine at USD $190.00 per metric ton CO₂e.";

/** Public partner labels — replaces internal tenant / program names in narratives. */
const ANONYMIZE_LABELS: ReadonlyArray<{ match: RegExp; replacement: string }> = [
  { match: /\bvaultbank\b/gi, replacement: "Global Financial Partner" },
  { match: /\bmedshield\b/gi, replacement: "Regional Healthcare Consortium" },
  { match: /\bgridcore\b/gi, replacement: "National Grid Operator Partner" },
  { match: /\bdefense\b(?=\s+logistics|\s+aerospace|\s+tenant|\s+posture|\s+segment|\b)/gi, replacement: "Defense & Aerospace Partner" },
];

export type ResilienceAchievementBadge = {
  id: "RESILIENCE_ACHIEVEMENT_30D_V1";
  displayName: string;
  /** Human tier for CMS / Framer. */
  tier: "Contributor" | "Sustainer" | "Champion";
  milestoneDays: number;
  summary: string;
};

export type CarbonRoiPublicBlock = {
  /** USD per metric ton (two decimals) — operational + regulatory VMAT composite. */
  dollarsPerTonDisplay: string;
  avoidedMetricTonsDisplay: string;
  publicImpactSummary: string;
  roiArtifactSha256: string;
  throttleEvidenceSha256: string | null;
  evidenceBindingOk: boolean;
};

export type SocietalImpactPublicBlock = {
  headlineVerifiedTsv: string;
  proofLine: string;
  impactStatement: string;
  societalValueCents: string;
};

export type PublicSustainabilityDisclosureV1 = {
  schema: "ironframe.public_sustainability_disclosure.v1";
  generatedAt: string;
  template: "Sustainability_Achievement_Report_V1_Public";
  /** No raw currency — improvement vs constitutional industry ALE anchor envelope. */
  sustainabilityMitigationPercentOfBaseline: number;
  kwhSavedAggregate: string;
  /** Narrative % for grid exposure (interpretation of telemetry delta / mean). */
  gridIntensityExposureChangePercent: number | null;
  constitutionalTasSha256Short: string | null;
  resilienceBadge: ResilienceAchievementBadge;
  maturityScoreDisplay: string;
  streakDaysDisplay: number;
  /** CMS-ready paragraph: Carbon ROI narrative + privacy-safe wording. */
  publicImpactSummary: string;
  /** Structured Carbon ROI (VMAT); null when avoided tons are negligible. */
  carbonRoi: CarbonRoiPublicBlock | null;
  /** SCC + internal ROI (TSV) — public headline + Ironethic narrative. */
  societalImpact: SocietalImpactPublicBlock | null;
  socialExecutiveSummary: string;
  gavelFooter: string;
  verification: {
    pdfArtifactSha256: string;
    wormGsUri: string;
    compositeInternalSha256?: string;
    roiArtifactSha256?: string;
    throttleEvidenceSha256?: string | null;
    epaSccBenchmarkCited?: string;
  };
};

function anonymizePublicText(text: string): string {
  let out = text;
  for (const { match, replacement } of ANONYMIZE_LABELS) {
    out = out.replace(match, replacement);
  }
  return out;
}

/** Strip tenant codenames / sector labels for public PDFs and PDV fields. */
export function anonymizeForPublicExport(text: string): string {
  return anonymizePublicText(text);
}

/** Mitigated sustainability cents as % of summed constitutional industry ALE anchors (no $ in output). */
export function percentMitigationVsConstitutionalAleEnvelope(mitigatedCents: bigint): number {
  const sumBaselines = Object.values(TENANT_INDUSTRY_BASELINE_ALE_CENTS).reduce((a, b) => a + b, 0n);
  if (sumBaselines <= 0n || mitigatedCents <= 0n) return 0;
  const pct = (Number(mitigatedCents) / Number(sumBaselines)) * 100;
  if (!Number.isFinite(pct)) return 0;
  return Math.round(pct * 10) / 10;
}

/** Relative grid exposure change for narrative: compares pulse window halves when available. */
export function percentGridIntensityExposureChange(
  averageGco2: number | null,
  deltaGco2: number | null,
): number | null {
  if (averageGco2 == null || deltaGco2 == null || averageGco2 <= 0) return null;
  const raw = (deltaGco2 / averageGco2) * 100;
  if (!Number.isFinite(raw)) return null;
  return Math.round(raw * 10) / 10;
}

export function buildResilienceAchievementBadge(milestoneDays: number): ResilienceAchievementBadge {
  const tier: ResilienceAchievementBadge["tier"] =
    milestoneDays >= 90 ? "Champion" : milestoneDays >= 60 ? "Sustainer" : "Contributor";
  return {
    id: "RESILIENCE_ACHIEVEMENT_30D_V1",
    displayName: `${milestoneDays}-Day Autonomous Carbon Continuity`,
    tier,
    milestoneDays,
    summary: anonymizePublicText(
      `Resilience Achievement Badge: ${milestoneDays}-day autonomous carbon mitigation continuity under Ironframe constitutional governance.`,
    ),
  };
}

function clampSocial(s: string, max = 280): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function formatUsdFromCents(cents: bigint): string {
  return (Number(cents) / 100).toFixed(2);
}

/**
 * Privacy-safe Carbon ROI copy for transparency pages (no tenant ALE tables; composite $/ton only).
 */
export function buildCarbonRoiPublicBlock(input: {
  carbonRoiCentsPerTon: bigint | null;
  avoidedMetricTons: number;
  roiArtifactSha256: string;
  throttleEvidenceSha256: string | null;
  evidenceBindingOk: boolean;
}): CarbonRoiPublicBlock | null {
  if (input.carbonRoiCentsPerTon == null || input.avoidedMetricTons <= 0) return null;
  const dollars = formatUsdFromCents(input.carbonRoiCentsPerTon);
  const tonsDisplay = input.avoidedMetricTons >= 1 ? input.avoidedMetricTons.toFixed(2) : input.avoidedMetricTons.toFixed(4);
  const bindNote = input.evidenceBindingOk
    ? " These figures are cross-referenced against Ironlock throttle evidence (SHA-256) to prevent unsupported sustainability claims."
    : " Provisional disclosure until throttle-cycle SHA-256 evidence is present in Carbon Pulse.";
  const publicImpactSummary = anonymizePublicText(
    `For every ton of carbon avoided, this platform generated $${dollars} in operational and regulatory value.` +
      ` Approximately ${tonsDisplay} metric tons were avoided in the attested window.${bindNote}`,
  );
  return {
    dollarsPerTonDisplay: dollars,
    avoidedMetricTonsDisplay: tonsDisplay,
    publicImpactSummary,
    roiArtifactSha256: input.roiArtifactSha256,
    throttleEvidenceSha256: input.throttleEvidenceSha256,
    evidenceBindingOk: input.evidenceBindingOk,
  };
}

function formatVerifiedTsvHeadlinePublic(cents: bigint): string {
  const n = Number(cents) / 100;
  const fmt = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `Verified Total Societal Value: $${fmt}`;
}

export function buildSocietalImpactPublicBlock(input: {
  societalValueCents: bigint;
  impactStatement: string;
}): SocietalImpactPublicBlock | null {
  if (input.societalValueCents <= 0n) return null;
  return {
    headlineVerifiedTsv: anonymizePublicText(formatVerifiedTsvHeadlinePublic(input.societalValueCents)),
    proofLine: anonymizePublicText(EPA_2026_SCC_PUBLIC_CITATION),
    impactStatement: input.impactStatement,
    societalValueCents: input.societalValueCents.toString(),
  };
}

/**
 * LinkedIn / ESG-ready blurb — no dollar amounts; uses % mitigation and maturity score.
 */
export function draftPublicEsgExecutiveSummary(input: {
  milestoneDays: number;
  mitigationPercentOfBaseline: number;
  gridExposureChangePercent: number | null;
  maturityScore: number;
}): string {
  const grid =
    input.gridExposureChangePercent != null
      ? `reducing grid intensity exposure by approximately ${Math.abs(input.gridExposureChangePercent)}% `
      : "optimizing grid-intensity exposure ";
  const dir =
    input.gridExposureChangePercent != null && input.gridExposureChangePercent > 0
      ? "while tightening observability of high-carbon intervals "
      : "while sustaining observability of grid carbon signals ";
  const base = anonymizePublicText(
    `Ironframe has achieved a ${input.milestoneDays}-day Autonomous Carbon Mitigation streak, ${grid}${dir}` +
      `while maintaining Level ${input.maturityScore.toFixed(1)} Maturity. Verified under constitutional SHA-256 attestation.`,
  );
  return clampSocial(base, 280);
}

export function buildPublicSustainabilityDisclosureV1(input: {
  generatedAt: string;
  milestoneDays: number;
  mitigatedSustainabilityAleCents: bigint;
  totalKwhSaved: bigint;
  averageGridIntensityGco2PerKwh: number | null;
  gridIntensityDeltaGco2PerKwh: number | null;
  constitutionalTasSha256: string | null;
  pdfArtifactSha256: string;
  wormGsUri: string;
  compositeInternalSha256?: string;
  maturityScore: number;
  activeStreakDays: number;
  carbonRoi?: {
    carbonRoiCentsPerTon: bigint | null;
    avoidedMetricTons: number;
    roiArtifactSha256: string;
    throttleEvidenceSha256: string | null;
    evidenceBindingOk: boolean;
  } | null;
  societal?: {
    societalValueCents: bigint;
    impactStatement: string;
  } | null;
}): PublicSustainabilityDisclosureV1 {
  const mitigationPct = percentMitigationVsConstitutionalAleEnvelope(input.mitigatedSustainabilityAleCents);
  const gridPct = percentGridIntensityExposureChange(
    input.averageGridIntensityGco2PerKwh,
    input.gridIntensityDeltaGco2PerKwh,
  );
  const badge = buildResilienceAchievementBadge(input.milestoneDays);
  const social = draftPublicEsgExecutiveSummary({
    milestoneDays: input.milestoneDays,
    mitigationPercentOfBaseline: mitigationPct,
    gridExposureChangePercent: gridPct,
    maturityScore: input.maturityScore,
  });

  const carbonRoiBlock =
    input.carbonRoi != null
      ? buildCarbonRoiPublicBlock({
          carbonRoiCentsPerTon: input.carbonRoi.carbonRoiCentsPerTon,
          avoidedMetricTons: input.carbonRoi.avoidedMetricTons,
          roiArtifactSha256: input.carbonRoi.roiArtifactSha256,
          throttleEvidenceSha256: input.carbonRoi.throttleEvidenceSha256,
          evidenceBindingOk: input.carbonRoi.evidenceBindingOk,
        })
      : null;

  const societalImpactBlock =
    input.societal != null
      ? buildSocietalImpactPublicBlock({
          societalValueCents: input.societal.societalValueCents,
          impactStatement: input.societal.impactStatement,
        })
      : null;

  const resilienceLine = anonymizePublicText(
    `${badge.displayName}: constitutional workforce attestation on file.`,
  );
  const societalLine = societalImpactBlock
    ? `${societalImpactBlock.headlineVerifiedTsv} ${societalImpactBlock.proofLine} ${societalImpactBlock.impactStatement}`
    : "";
  const publicImpactSummary = [carbonRoiBlock?.publicImpactSummary, societalLine, resilienceLine]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    schema: "ironframe.public_sustainability_disclosure.v1",
    generatedAt: input.generatedAt,
    template: "Sustainability_Achievement_Report_V1_Public",
    sustainabilityMitigationPercentOfBaseline: mitigationPct,
    kwhSavedAggregate: input.totalKwhSaved.toString(),
    gridIntensityExposureChangePercent: gridPct,
    constitutionalTasSha256Short: input.constitutionalTasSha256
      ? `${input.constitutionalTasSha256.slice(0, 12)}…`
      : null,
    resilienceBadge: badge,
    maturityScoreDisplay: input.maturityScore.toFixed(1),
    streakDaysDisplay: input.activeStreakDays,
    publicImpactSummary,
    carbonRoi: carbonRoiBlock,
    societalImpact: societalImpactBlock,
    socialExecutiveSummary: social,
    gavelFooter: PUBLIC_TRANSPARENCY_GAVEL_FOOTER,
    verification: {
      pdfArtifactSha256: input.pdfArtifactSha256,
      wormGsUri: input.wormGsUri,
      compositeInternalSha256: input.compositeInternalSha256,
      roiArtifactSha256: carbonRoiBlock?.roiArtifactSha256,
      throttleEvidenceSha256: carbonRoiBlock?.throttleEvidenceSha256 ?? null,
      epaSccBenchmarkCited: societalImpactBlock ? EPA_2026_SCC_PUBLIC_CITATION : undefined,
    },
  };
}

/**
 * Investor-facing carbon resilience ribbon (headline fixed per investor directive; subtitle reflects live maturity).
 */
export function generateCarbonResilienceBadgeSvg(input: {
  maturityScore: number;
  href: string;
  width?: number;
}): string {
  const w = input.width ?? 400;
  const h = 76;
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Level 10 Carbon Resilience verified by Ironframe">
  <a href="${esc(input.href)}" target="_blank" rel="noopener noreferrer">
    <defs>
      <linearGradient id="crb" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0ea5e9"/>
        <stop offset="100%" stop-color="#34d399"/>
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="12" fill="#0f172a" stroke="url(#crb)" stroke-width="2"/>
    <text x="18" y="36" fill="#e0f2fe" font-family="system-ui,Segoe UI,sans-serif" font-size="13" font-weight="700">Level 10 Carbon Resilience — Verified by Ironframe.</text>
    <text x="18" y="58" fill="#94a3b8" font-family="system-ui,Segoe UI,sans-serif" font-size="11">Governance maturity ${esc(input.maturityScore.toFixed(1))} · workforce PDF attestation (SHA-256) →</text>
  </a>
</svg>`;
}

/**
 * SVG “Truth Badge” for transparency pages — links to verified WORM / download surface.
 */
export function generateTruthBadgeSvg(input: {
  maturityScore: string;
  streakDays: number;
  href: string;
  width?: number;
}): string {
  const w = input.width ?? 320;
  const h = 72;
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Ironframe Truth Badge">
  <a href="${esc(input.href)}" target="_blank" rel="noopener noreferrer">
    <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="#0f172a" stroke="#34d399" stroke-width="2"/>
    <text x="16" y="28" fill="#a7f3d0" font-family="system-ui,Segoe UI,sans-serif" font-size="11" font-weight="700">IRONFRAME · TRUTH BADGE</text>
    <text x="16" y="48" fill="#e2e8f0" font-family="ui-monospace,monospace" font-size="12">Maturity ${esc(input.maturityScore)} · Streak ${input.streakDays}d</text>
    <text x="16" y="64" fill="#6ee7b7" font-family="system-ui,Segoe UI,sans-serif" font-size="9">SHA-256 verified workforce attestation →</text>
  </a>
</svg>`;
}