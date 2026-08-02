/**
 * Rank SUSPECTs for operator review: named buyer + fuller dossier first.
 */

import {
  resolveSuspectBuyingCommittee,
  resolveSuspectCandidateEmails,
  resolveSuspectExecutiveSponsor,
  resolveSuspectLocationFields,
  resolveSuspectNamedBuyer,
} from "@/app/lib/server/ironleadsSuspectLocation";

export type SuspectReadinessBreakdown = {
  score: number;
  hasNamedBuyer: boolean;
  namedBuyerMembers: number;
  candidateEmails: number;
  hasWebsite: boolean;
  hasPhone: boolean;
  hasExecutiveSponsor: boolean;
  hasResearchBrief: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Higher = more ready for HITL Promote / review. */
export function scoreSuspectReadiness(input: {
  metadata: unknown;
  accountDomain?: string | null;
  priorityScore?: number | null;
}): SuspectReadinessBreakdown {
  const namedBuyer = resolveSuspectNamedBuyer(input.metadata);
  const committee = resolveSuspectBuyingCommittee(input.metadata);
  const candidates = resolveSuspectCandidateEmails(input.metadata);
  const sponsor = resolveSuspectExecutiveSponsor(input.metadata);
  const location = resolveSuspectLocationFields({
    metadata: input.metadata,
    accountDomain: input.accountDomain ?? null,
  });
  const meta = asRecord(input.metadata);
  const brief = asRecord(meta?.accountResearchBrief);

  const namedMembers =
    committee?.members.filter((m) => Boolean(m.fullName?.trim())).length ?? 0;
  const memberEmails =
    committee?.members.reduce((n, m) => n + (m.emails?.length ?? 0), 0) ?? 0;
  const committeeRaw = asRecord(asRecord(input.metadata)?.buyingCommittee);
  const switchboardCount = Array.isArray(committeeRaw?.switchboardPhones)
    ? committeeRaw.switchboardPhones.length
    : 0;
  const hasPhone = Boolean(location.websiteContact?.phone?.trim() || switchboardCount > 0);
  const hasWebsite = Boolean(location.websiteUrl);
  const hasResearchBrief = Boolean(brief && Object.keys(brief).length > 0);

  let score = 0;
  if (namedBuyer) score += 100;
  score += Math.min(namedMembers, 6) * 18;
  score += Math.min(candidates.length + memberEmails, 8) * 12;
  if (hasWebsite) score += 25;
  if (hasPhone) score += 20;
  if (sponsor) score += 15;
  if (hasResearchBrief) score += 10;
  // Light priority tie-break (0–100 → 0–10)
  score += Math.min(Math.max(input.priorityScore ?? 0, 0), 100) / 10;

  return {
    score,
    hasNamedBuyer: Boolean(namedBuyer),
    namedBuyerMembers: namedMembers + (namedBuyer ? 1 : 0),
    candidateEmails: candidates.length + memberEmails,
    hasWebsite,
    hasPhone,
    hasExecutiveSponsor: Boolean(sponsor),
    hasResearchBrief,
  };
}

export function compareSuspectReadiness(
  a: { metadata: unknown; accountDomain?: string | null; priorityScore?: number | null; createdAt?: Date | string },
  b: { metadata: unknown; accountDomain?: string | null; priorityScore?: number | null; createdAt?: Date | string },
): number {
  const sa = scoreSuspectReadiness(a);
  const sb = scoreSuspectReadiness(b);
  if (sb.score !== sa.score) return sb.score - sa.score;
  const at = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt ?? 0).getTime();
  const bt = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt ?? 0).getTime();
  return bt - at;
}
