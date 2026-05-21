import "server-only";

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

import {
  buildIrontallyFrameworkSnapshot,
  isIsoCertified,
  isNistTier4OrBetter,
  isSoc2Certified,
  mapMaturityToIso27001Level,
  mapMaturityToNistCsfTier,
  mapMaturityToSoc2Type2,
} from "@/app/services/irontallyMapper";

export type CertificationBand = {
  framework: "NIST CSF 2.0" | "ISO 27001:2022" | "SOC 2 Type II";
  certified: boolean;
  label: string;
};

export type IrontallyShadowResult = {
  checkedAt: string;
  scoreBefore: number | null;
  scoreAfter: number;
  scenario: string;
  certificationBefore: CertificationBand[];
  certificationAfter: CertificationBand[];
  certificationLost: CertificationBand[];
  wouldLoseCertification: boolean;
  shadowVerdict: "STABLE" | "CERTIFICATION_AT_RISK" | "CERTIFICATION_LOST";
  narrative: string;
};

const SHADOW_DIR = join(process.cwd(), "storage", "constitutional", "irontally-shadow");

function bandsForScore(score: number): CertificationBand[] {
  const nist = mapMaturityToNistCsfTier(score);
  const iso = mapMaturityToIso27001Level(score);
  const soc2 = mapMaturityToSoc2Type2(score);
  return [
    {
      framework: "NIST CSF 2.0",
      certified: nist.tier >= 3,
      label: nist.label,
    },
    {
      framework: "ISO 27001:2022",
      certified: isIsoCertified(score),
      label: iso.label,
    },
    {
      framework: "SOC 2 Type II",
      certified: isSoc2Certified(score),
      label: soc2.label,
    },
  ];
}

function certificationLost(
  before: CertificationBand[],
  after: CertificationBand[],
): CertificationBand[] {
  return before.filter((b, i) => b.certified && !after[i]?.certified);
}

/**
 * Irontally shadow mode — silent post-mortem check: would a maturity drop revoke ISO or SOC2 status?
 */
export function runIrontallyShadowCertificationCheck(params: {
  scoreAfter: number;
  scoreBefore?: number | null;
  scenario?: string;
  tenantId?: string;
}): IrontallyShadowResult {
  const scoreAfter = params.scoreAfter;
  const scoreBefore = params.scoreBefore ?? null;
  const scenario = params.scenario ?? "CONSTITUTIONAL_COLLAPSE_POST_MORTEM";

  const certificationAfter = bandsForScore(scoreAfter);
  const certificationBefore =
    scoreBefore != null ? bandsForScore(scoreBefore) : certificationAfter.map((b) => ({ ...b, certified: true }));

  const lost = certificationLost(certificationBefore, certificationAfter);
  const wouldLose = lost.length > 0;

  let shadowVerdict: IrontallyShadowResult["shadowVerdict"] = "STABLE";
  if (wouldLose) shadowVerdict = "CERTIFICATION_LOST";
  else if (
    scoreBefore != null &&
    (isSoc2Certified(scoreBefore) !== isSoc2Certified(scoreAfter) ||
      isIsoCertified(scoreBefore) !== isIsoCertified(scoreAfter) ||
      isNistTier4OrBetter(scoreBefore) !== isNistTier4OrBetter(scoreAfter))
  ) {
    shadowVerdict = "CERTIFICATION_AT_RISK";
  }

  const afterSnap = buildIrontallyFrameworkSnapshot(scoreAfter);
  const narrative = wouldLose
    ? `Irontally shadow: maturity drop (${scoreBefore?.toFixed(1) ?? "—"} → ${scoreAfter.toFixed(1)}) would revoke: ${lost.map((l) => l.framework).join(", ")}.`
    : shadowVerdict === "CERTIFICATION_AT_RISK"
      ? `Irontally shadow: post-chaos maturity ${scoreAfter.toFixed(1)} narrows headroom — ${afterSnap.soc2.label}, ${afterSnap.iso.label}.`
      : `Irontally shadow: certification bands stable at maturity ${scoreAfter.toFixed(1)} (${afterSnap.nist.label}).`;

  return {
    checkedAt: new Date().toISOString(),
    scoreBefore,
    scoreAfter,
    scenario,
    certificationBefore,
    certificationAfter,
    certificationLost: lost,
    wouldLoseCertification: wouldLose,
    shadowVerdict,
    narrative,
  };
}

export async function persistAndAuditIrontallyShadow(
  result: IrontallyShadowResult,
  tenantId: string,
): Promise<void> {
  try {
    if (!existsSync(SHADOW_DIR)) mkdirSync(SHADOW_DIR, { recursive: true });
    const file = join(
      SHADOW_DIR,
      `${tenantId.trim().toLowerCase()}-${Date.now()}.json`,
    );
    writeFileSync(file, JSON.stringify(result, null, 2), "utf8");
  } catch {
    /* best-effort file */
  }

  try {
    const { auditLogCreateLoose } = await import("@/lib/auditLogLoose");
    await auditLogCreateLoose({
      data: {
        action: "IRONTALLY_SHADOW_MODE",
        justification: JSON.stringify({
          shadowVerdict: result.shadowVerdict,
          wouldLoseCertification: result.wouldLoseCertification,
          scoreBefore: result.scoreBefore,
          scoreAfter: result.scoreAfter,
          certificationLost: result.certificationLost.map((c) => c.framework),
          narrative: result.narrative,
        }),
        operatorId: "IRONTALLY_AGENT_19",
        threatId: null,
        isSimulation: true,
        governance_tenant_uuid: tenantId,
      },
    });
  } catch {
    /* best-effort audit */
  }
}
