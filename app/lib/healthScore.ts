export type HealthScoreInput = {
  vulnerableAssets: number;
  criticalThreats: number;
  policyAttestationPercent: number;
};

export type HealthScoreResult = {
  score: number;
  grade: string;
  vulnerablePenalty: number;
  criticalThreatPenalty: number;
  attestationBoost: number;
};

const BASELINE_SCORE = 55;
const ATTESTATION_WEIGHT = 0.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function scoreToGrade(score: number): string {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 85) return "B+";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function calculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  const vulnerablePenalty = input.vulnerableAssets * 10;
  const criticalThreatPenalty = input.criticalThreats * 20;
  const attestationBoost = Number((input.policyAttestationPercent * ATTESTATION_WEIGHT).toFixed(1));

  const rawScore = BASELINE_SCORE + attestationBoost - vulnerablePenalty - criticalThreatPenalty;
  const score = Math.round(clamp(rawScore, 0, 100));

  return {
    score,
    grade: scoreToGrade(score),
    vulnerablePenalty,
    criticalThreatPenalty,
    attestationBoost,
  };
}
