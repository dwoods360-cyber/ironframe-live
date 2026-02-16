export type VendorLetterGrade = "A" | "B" | "C" | "D" | "F";

export type VendorHealthInput = {
  daysUntilSoc2Expiration: number;
  evidenceLockerDocs: string[];
  hasActiveIndustryAlert: boolean;
  hasActiveBreachAlert: boolean;
  hasPendingVersioning: boolean;
  hasStakeholderEscalation: boolean;
  requiresManualReview: boolean;
};

export type VendorHealthScore = {
  score: number;
  grade: VendorLetterGrade;
  breakdown: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toGrade(score: number): VendorLetterGrade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function normalizeDocs(docs: string[]) {
  return new Set(docs.map((doc) => doc.trim().toUpperCase()));
}

export function calculateVendorGrade(input: VendorHealthInput): VendorHealthScore {
  const breakdown: string[] = [];
  const normalizedDocs = normalizeDocs(input.evidenceLockerDocs);

  let docsScore = 50;
  let industryScore = 30;
  let internalScore = 20;

  const hasSoc2 = normalizedDocs.has("SOC2");
  const hasIso = normalizedDocs.has("ISO") || normalizedDocs.has("ISO 27001");
  const hasInsurance = normalizedDocs.has("INSURANCE");
  const isSoc2Expired = input.daysUntilSoc2Expiration <= 0;

  if (!hasSoc2) {
    docsScore -= 25;
    breakdown.push("SOC2 missing: -25 (Docs)");
  }

  if (isSoc2Expired) {
    docsScore -= 30;
    breakdown.push("SOC2 expired: -30 (Docs)");
  }

  if (!hasIso) {
    docsScore -= 12;
    breakdown.push("ISO missing: -12 (Docs)");
  }

  if (!hasInsurance) {
    docsScore -= 13;
    breakdown.push("Insurance missing: -13 (Docs)");
  }

  if (input.hasActiveBreachAlert) {
    industryScore -= 30;
    breakdown.push("Active industry breach alert: -30 (Industry)");
  } else if (input.hasActiveIndustryAlert) {
    industryScore -= 15;
    breakdown.push("Recent harvester alert(s): -15 (Industry)");
  }

  if (input.requiresManualReview) {
    internalScore -= 10;
    breakdown.push("Manual review required: -10 (Internal)");
  }

  if (input.hasPendingVersioning) {
    internalScore -= 6;
    breakdown.push("Pending version/signature: -6 (Internal)");
  }

  if (input.hasStakeholderEscalation) {
    internalScore -= 4;
    breakdown.push("Stakeholder escalation open: -4 (Internal)");
  }

  docsScore = clamp(docsScore, 0, 50);
  industryScore = clamp(industryScore, 0, 30);
  internalScore = clamp(internalScore, 0, 20);

  let totalScore = docsScore + industryScore + internalScore;

  if (isSoc2Expired) {
    totalScore = Math.min(totalScore, 65);
  }

  if (input.hasActiveBreachAlert) {
    totalScore = Math.min(totalScore, 55);
  }

  const finalScore = clamp(totalScore, 0, 100);
  const grade = toGrade(finalScore);

  return {
    score: finalScore,
    grade,
    breakdown:
      breakdown.length > 0
        ? breakdown
        : ["SOC2/ISO/Insurance current, no industry alerts, and no internal review penalties"],
  };
}