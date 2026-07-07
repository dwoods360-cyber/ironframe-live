/**
 * Ring-2 / PARTNER_REFERRAL pilot gate evaluation (webpack- and script-safe).
 * Canonical thresholds for Gate B proxy-quality and operational mode resolution.
 */

export const GRC_FIRST_ACTION_TYPES = [
  "VENDOR_ASSESSMENT",
  "CONTROL_MAPPING",
  "QUESTIONNAIRE",
  "REMEDIATION",
  "OTHER",
] as const;

export type GrcFirstActionType = (typeof GRC_FIRST_ACTION_TYPES)[number];

export type PilotOperationalMode = "SORT_ONLY" | "OPERATIONAL_SCALE";

export const PILOT_QUALITY_GATES = {
  minQualificationRatePct: 30,
  minEvidenceCompletenessPct: 60,
  minFirstActionRateOfQualifiedPct: 40,
  maxMedianFirstActionBusinessHours: 40,
  consecutiveWeeksRequired: 2,
  minPartnerLeadsForConfirmedGate: 10,
} as const;

export type QualificationLevel = "NONE" | "PROXY" | "CONFIRMED";

export type GateBWeekMetrics = {
  weekKey: string;
  ingested: number;
  qualifiedProxy: number;
  qualifiedConfirmed: number;
  evidenceSum: number;
  firstActionCount: number;
  firstActionBusinessHours: number[];
};

export type GateBWeekEvaluation = {
  weekKey: string;
  metrics: GateBWeekMetrics;
  qualificationRatePct: number;
  evidenceAvgPct: number;
  firstActionRateOfQualifiedPct: number;
  medianFirstActionBusinessHours: number | null;
  pass: boolean;
  failures: string[];
};

export function isGrcFirstActionType(value: string): value is GrcFirstActionType {
  return (GRC_FIRST_ACTION_TYPES as readonly string[]).includes(value);
}

export function isGrcAuditableFirstAction(type: GrcFirstActionType | null | undefined): boolean {
  return Boolean(type && type !== "OTHER");
}

export function inferFirstActionType(
  summary: string,
  explicit?: string | null,
): GrcFirstActionType {
  if (explicit && isGrcFirstActionType(explicit)) return explicit;
  const text = summary.toLowerCase();
  if (/vendor\s*risk|vendor\s*assessment|third[- ]party/.test(text)) return "VENDOR_ASSESSMENT";
  if (/control\s*map|policy\s*map|mapping\s*control/.test(text)) return "CONTROL_MAPPING";
  if (/questionnaire|vendor\s*questionnaire|security\s*assessment/.test(text)) return "QUESTIONNAIRE";
  if (/remediation|work\s*order|corrective\s*action/.test(text)) return "REMEDIATION";
  return "OTHER";
}

export function countEvidenceFieldSlots(input: {
  industrySector?: string | null;
  adjacentSector?: string | null;
  detectedTrigger?: string | null;
  triggers?: string[];
  painMarkers?: Record<string, boolean | undefined>;
  methodology?: Record<string, boolean | undefined>;
}): number {
  let count = 0;
  const segmentTagged =
    (input.industrySector && input.industrySector !== "UNCLASSIFIED") || input.adjacentSector;
  if (segmentTagged) count += 1;
  if (input.detectedTrigger?.trim() || (input.triggers?.length ?? 0) > 0) count += 1;
  if (input.painMarkers && Object.values(input.painMarkers).some(Boolean)) count += 1;
  if (input.methodology && Object.values(input.methodology).some(Boolean)) count += 1;
  return count;
}

export function evidenceCompletenessPctFromSlots(filledSlots: number, hasWorkArtifact: boolean): number {
  const base = Math.min(80, filledSlots * 20);
  return Math.min(100, base + (hasWorkArtifact ? 20 : 0));
}

export function isIcpQualifiedProxy(priorityScore: number): boolean {
  return priorityScore >= 40;
}

export function isIcpQualifiedConfirmed(input: {
  priorityScore: number;
  evidenceFieldSlots: number;
  icpConfirmed?: boolean;
}): boolean {
  if (!isIcpQualifiedProxy(input.priorityScore)) return false;
  if (input.icpConfirmed === true) return true;
  return input.evidenceFieldSlots >= 3;
}

export function isoWeekKey(date: Date | string): string {
  const d = new Date(date);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Business hours between two instants (Mon–Fri 09:00–17:00 UTC). */
export function businessHoursBetween(start: Date | string, end: Date | string): number {
  const from = new Date(start);
  const to = new Date(end);
  if (to <= from) return 0;

  let hours = 0;
  const cursor = new Date(from);
  while (cursor < to) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      const dayStart = new Date(cursor);
      dayStart.setUTCHours(9, 0, 0, 0);
      const dayEnd = new Date(cursor);
      dayEnd.setUTCHours(17, 0, 0, 0);
      const sliceStart = cursor > dayStart ? cursor : dayStart;
      const sliceEnd = to < dayEnd ? to : dayEnd;
      if (sliceEnd > sliceStart) {
        hours += (sliceEnd.getTime() - sliceStart.getTime()) / 3600000;
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    cursor.setUTCHours(0, 0, 0, 0);
  }
  return hours;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function evaluateGateBWeek(metrics: GateBWeekMetrics): GateBWeekEvaluation {
  const qualificationRatePct = metrics.ingested
    ? Math.round((metrics.qualifiedConfirmed / metrics.ingested) * 100)
    : 0;
  const evidenceAvgPct = metrics.ingested ? Math.round(metrics.evidenceSum / metrics.ingested) : 0;
  const firstActionRateOfQualifiedPct = metrics.qualifiedConfirmed
    ? Math.round((metrics.firstActionCount / metrics.qualifiedConfirmed) * 100)
    : 0;
  const medianFirstActionBusinessHours = median(metrics.firstActionBusinessHours);

  const failures: string[] = [];
  if (metrics.ingested === 0) failures.push("no PARTNER_REFERRAL leads ingested");
  if (qualificationRatePct < PILOT_QUALITY_GATES.minQualificationRatePct) {
    failures.push(
      `Q-confirmed rate ${qualificationRatePct}% < ${PILOT_QUALITY_GATES.minQualificationRatePct}%`,
    );
  }
  if (evidenceAvgPct < PILOT_QUALITY_GATES.minEvidenceCompletenessPct) {
    failures.push(
      `evidence ${evidenceAvgPct}% < ${PILOT_QUALITY_GATES.minEvidenceCompletenessPct}%`,
    );
  }
  if (firstActionRateOfQualifiedPct < PILOT_QUALITY_GATES.minFirstActionRateOfQualifiedPct) {
    failures.push(
      `FA-rate ${firstActionRateOfQualifiedPct}% < ${PILOT_QUALITY_GATES.minFirstActionRateOfQualifiedPct}%`,
    );
  }
  if (
    medianFirstActionBusinessHours == null ||
    medianFirstActionBusinessHours > PILOT_QUALITY_GATES.maxMedianFirstActionBusinessHours
  ) {
    failures.push(
      `median TTFA ${medianFirstActionBusinessHours ?? "n/a"}h > ${PILOT_QUALITY_GATES.maxMedianFirstActionBusinessHours} business hours`,
    );
  }

  return {
    weekKey: metrics.weekKey,
    metrics,
    qualificationRatePct,
    evidenceAvgPct,
    firstActionRateOfQualifiedPct,
    medianFirstActionBusinessHours,
    pass: failures.length === 0 && metrics.ingested > 0,
    failures,
  };
}

export function evaluateConsecutiveGateBPass(
  weeklyEvaluations: GateBWeekEvaluation[],
): { pass: boolean; consecutiveWeeks: number; evaluations: GateBWeekEvaluation[] } {
  const sorted = [...weeklyEvaluations].sort((a, b) => a.weekKey.localeCompare(b.weekKey));
  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (!sorted[i]!.pass) break;
    streak += 1;
  }
  const required = PILOT_QUALITY_GATES.consecutiveWeeksRequired;
  return {
    pass: streak >= required,
    consecutiveWeeks: streak,
    evaluations: sorted,
  };
}

export function resolvePilotOperationalMode(input: {
  gateAReady: boolean;
  consecutiveGateBPass: boolean;
  totalPartnerLeads: number;
}): PilotOperationalMode {
  if (!input.gateAReady) return "SORT_ONLY";
  if (input.totalPartnerLeads < PILOT_QUALITY_GATES.minPartnerLeadsForConfirmedGate) {
    return "SORT_ONLY";
  }
  return input.consecutiveGateBPass ? "OPERATIONAL_SCALE" : "SORT_ONLY";
}
