import {
  THREAT_MAP,
  mapUiIndustryToThreatEnum,
  type IndustryThreatEnumKey,
} from "@/lib/simulation/threatLibrary";

/** Presentation-tier mastery target — matches sector threat library bucket size (typically 3). */
export function analystMaturationDenominatorForIndustry(industryLabel: string): number {
  const key = mapUiIndustryToThreatEnum(industryLabel) as IndustryThreatEnumKey;
  const library = THREAT_MAP[key];
  return library?.length ?? 3;
}

export function maturationStorageKey(tenantUuid: string): string {
  return `ironframe-analyst-maturation:${tenantUuid.trim()}`;
}

export function maturationDeepDiveEventId(libraryThreatId: string): string {
  return `deep-dive:${libraryThreatId.trim()}`;
}

export function maturationThreatResolvedEventId(threatId: string): string {
  return `resolve:${threatId.trim()}`;
}

export function maturationHitlReviewEventId(approvalId: string): string {
  return `hitl:${approvalId.trim()}`;
}

export function loadMaturationEventsFromStorage(tenantUuid: string | null): string[] {
  if (typeof window === "undefined" || !tenantUuid?.trim()) return [];
  try {
    const raw = window.localStorage.getItem(maturationStorageKey(tenantUuid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  } catch {
    return [];
  }
}

export function persistMaturationEventsToStorage(tenantUuid: string, eventIds: string[]): void {
  if (typeof window === "undefined" || !tenantUuid.trim()) return;
  try {
    window.localStorage.setItem(maturationStorageKey(tenantUuid.trim()), JSON.stringify(eventIds));
  } catch {
    /* quota / private mode */
  }
}

export function computeMaturationProgress(
  eventIds: readonly string[],
  industryLabel: string,
): { mastered: number; total: number; percent: number; isCertified: boolean } {
  const total = analystMaturationDenominatorForIndustry(industryLabel);
  const mastered = Math.min(total, eventIds.length);
  const percent = total <= 0 ? 0 : Math.round((mastered / total) * 100);
  return {
    mastered,
    total,
    percent,
    isCertified: total > 0 && mastered >= total,
  };
}
