import { FORENSIC_ATTESTATION_MIN } from "@/app/utils/forensicAttestation";
import { reachesForensicNeutralizeQualityBar } from "@/app/utils/grcLexicon";

export type JustificationInvalidReason =
  | "repetition"
  | "low_entropy"
  | "low_diversity"
  | "bypass_pattern";

export type JustificationValidationResult = {
  ok: true;
} | { ok: false; reason: JustificationInvalidReason };

/** Same character more than 5 times in a row → invalid (6+ identical). */
const REPETITION_REGEX = /(.)\1{5,}/;

/** Substrings often used to pad attestation fields (case-insensitive). */
const BYPASS_SUBSTRINGS = [
  "asdfghjkl",
  "qwertyuiop",
  "qwerty",
  "zxcvbnm",
  "1234567890",
  "123456789",
  "9876543210",
  "abcdefghij",
  "abcdefghijklmnopqrstuvwxyz",
  "lorem ipsum",
] as const;

/** Keyboard / counting walks repeated as bulk filler. */
const BYPASS_REGEX = [
  /(?:0123456789){3,}/,
  /(?:1234567890){3,}/,
  /(?:9876543210){3,}/,
  /(?:asdfghjkl){2,}/i,
  /(?:qwertyuiop){2,}/i,
  /(?:qazwsxedc){2,}/i,
] as const;

/** Minimum Shannon entropy (bits) for attestations at or above the forensic minimum length. */
const MIN_ENTROPY_BITS = 2.35;

/** Minimum ratio |unique chars| / length for long strings (blocks "abcabc…"). */
const MIN_UNIQUE_RATIO = 0.14;

function shannonEntropyBits(text: string): number {
  const n = text.length;
  if (n === 0) return 0;
  const counts = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const ch = text[i]!;
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  let h = 0;
  for (const c of counts.values()) {
    const p = c / n;
    h -= p * Math.log2(p);
  }
  return h;
}

/**
 * Forensic justification content policy: blocks repetitive, low-entropy, and known bypass padding.
 * For strings shorter than {@link FORENSIC_ATTESTATION_MIN}, returns `{ ok: true }` (combine with length gate).
 */
export function validateForensicJustification(
  text: string | null | undefined,
  minChars: number = FORENSIC_ATTESTATION_MIN,
): JustificationValidationResult {
  const raw = (text ?? "").trim();
  if (raw.length < minChars) {
    return { ok: true };
  }

  if (REPETITION_REGEX.test(raw)) {
    return { ok: false, reason: "repetition" };
  }

  const lower = raw.toLowerCase();
  for (const s of BYPASS_SUBSTRINGS) {
    if (lower.includes(s)) {
      return { ok: false, reason: "bypass_pattern" };
    }
  }
  for (const rx of BYPASS_REGEX) {
    if (rx.test(raw)) {
      return { ok: false, reason: "bypass_pattern" };
    }
  }

  const unique = new Set(raw.split("")).size;
  const ratio = unique / raw.length;
  const entropy = shannonEntropyBits(raw);

  if (ratio < MIN_UNIQUE_RATIO) {
    return { ok: false, reason: "low_diversity" };
  }

  if (entropy < MIN_ENTROPY_BITS) {
    return { ok: false, reason: "low_entropy" };
  }

  return { ok: true };
}

/** Bulk neutralize: each draft must meet length and nonsense policy. */
export function allThreatDraftsPassJustificationQuality(
  threatIds: string[],
  draftsByThreatId: Record<string, string | undefined>,
): boolean {
  return threatIds.every((id) => {
    const d = (draftsByThreatId[id] ?? "").trim();
    if (d.length < FORENSIC_ATTESTATION_MIN) return false;
    if (!validateForensicJustification(d).ok) return false;
    return reachesForensicNeutralizeQualityBar(d);
  });
}
