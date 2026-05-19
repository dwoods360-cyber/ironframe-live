/**
 * GRC forensic lexicon: weak-language guardrails + attestation scoring (TAS-aligned).
 * Clerk / drafting assistant: use authoritative lexicon only; avoid subjective weak terms.
 */

/** Subjective / hedging terms — forbidden for neutralize attestation (case-insensitive). */
export const GRC_LEXICON_WEAK_FORBIDDEN = [
  "think",
  "maybe",
  "possibly",
  "guessing",
  "guess",
  "seemed",
  "hope",
  "should be",
  "should",
  "try",
  "fixed?",
  "fixed",
] as const;

/**
 * Weak token → high-integrity alternatives (vocabulary expansion / clerk guidance).
 * think/guess, maybe/possibly, fixed, seemed/should (+ hope/try hedges).
 */
export const GRC_LEXICON_WEAK_TO_AUTHORITATIVE_ALTERNATIVES: Readonly<
  Record<string, readonly string[]>
> = {
  think: ["verified", "confirmed", "authenticated"],
  guess: ["verified", "confirmed", "authenticated"],
  guessing: ["verified", "confirmed", "authenticated"],
  maybe: ["validated", "ascertained", "re-baselined"],
  possibly: ["validated", "ascertained", "re-baselined"],
  fixed: ["remediated", "hardened", "rectified"],
  "fixed?": ["remediated", "hardened", "rectified"],
  seemed: ["is documented to", "conforms to", "aligns with"],
  should: ["is documented to", "conforms to", "aligns with"],
  "should be": ["is documented to", "conforms to", "aligns with"],
  hope: ["verified", "confirmed", "validated"],
  try: ["verified", "confirmed", "remediated"],
};

/** Required authoritative posture for high-integrity attestations. */
export const GRC_LEXICON_AUTHORITATIVE = [
  "verified",
  "confirmed",
  "attested",
  "remediated",
  "re-baselined",
  "rebaselined",
  "isolated",
  "authenticated",
  "validated",
  "ascertained",
  "rectified",
  "hardened",
  "documented",
  "conforms",
  "aligns",
] as const;

/** TAS.md-aligned keywords (+10 once if any match). */
export const GRC_LEXICON_TAS_KEYWORDS = [
  "isolation",
  "isolated",
  "baseline",
  "irongate",
  "ironlock",
  "langgraph",
  "tenant",
  "rls",
  "bigint",
  "ale",
  "dmz",
  "integrity",
  "deterministic",
  "zero-trust",
  "zerotrust",
  "quarantine",
  "forensic",
  "constitutional",
] as const;

/** Neutralize gate: strictly greater than 40. */
export const FORENSIC_VERIFIED_MIN_SCORE_EXCLUSIVE = 40;

/** "Gold" tier for CONSTITUTIONAL INTEGRITY badge. */
export const FORENSIC_GOLD_MIN_SCORE = 55;

const WEAK_REGEX = new RegExp(
  [
    "\\bshould be\\b",
    "\\bshould\\b",
    "\\bthink\\b",
    "\\bguess\\b",
    "\\bguessing\\b",
    "\\bmaybe\\b",
    "\\bpossibly\\b",
    "\\bseemed\\b",
    "\\bhope\\b",
    "\\btry\\b",
    "\\bfixed\\?\\b",
    "\\bfixed\\b",
  ].join("|"),
  "gi",
);

const AUTHORITATIVE_REGEX = new RegExp(
  `\\b(?:${GRC_LEXICON_AUTHORITATIVE.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "gi",
);

const TAS_KEYWORD_REGEX = new RegExp(
  `\\b(?:${GRC_LEXICON_TAS_KEYWORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "gi",
);

/** Dollar / agent / crypto-style technical anchors (+20 once). */
const TECHNICAL_SIGNAL_REGEX =
  /\$[\d,]+(?:\.\d+)?\s*[MmBbKk]|Agent\s*(?:14|6)\b|\bA14\b|\bA6\b|SHA-?256|\bUUID\b|\d{1,3}(?:\.\d+)?\s*(?:million|M)\b/i;

export type WeakLexiconMatch = {
  start: number;
  end: number;
  text: string;
  alternatives: readonly string[];
};

/** Normalize matched surface form → lookup key in {@link GRC_LEXICON_WEAK_TO_AUTHORITATIVE_ALTERNATIVES}. */
export function alternativesForWeakLexeme(matchedText: string): readonly string[] {
  const raw = matchedText.trim();
  const lower = raw.toLowerCase();
  const direct = GRC_LEXICON_WEAK_TO_AUTHORITATIVE_ALTERNATIVES[lower];
  if (direct) return direct;
  if (lower === "thinking") return GRC_LEXICON_WEAK_TO_AUTHORITATIVE_ALTERNATIVES.think;
  return ["verified", "confirmed", "validated"];
}

export function countWeakLexiconOccurrences(text: string | null | undefined): number {
  return findWeakLexiconMatches(text ?? "").length;
}

/** Tone lock: more than two weak spans — hard subjective-language risk. */
export function exceedsWeakLexiconToneLock(text: string | null | undefined): boolean {
  return countWeakLexiconOccurrences(text) > 2;
}

export function hasWeakLexiconViolation(text: string | null | undefined): boolean {
  const raw = (text ?? "").trim();
  if (!raw) return false;
  WEAK_REGEX.lastIndex = 0;
  return WEAK_REGEX.test(raw);
}

/** Non-overlapping weak-token spans for UI highlighting. */
export function findWeakLexiconMatches(text: string): WeakLexiconMatch[] {
  const raw = text;
  const ranges: WeakLexiconMatch[] = [];
  WEAK_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = WEAK_REGEX.exec(raw)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    const text = m[0];
    ranges.push({ start, end, text, alternatives: alternativesForWeakLexeme(text) });
    if (m.index === WEAK_REGEX.lastIndex) WEAK_REGEX.lastIndex++;
  }
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: WeakLexiconMatch[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (!last || r.start >= last.end) merged.push({ ...r });
    else last.end = Math.max(last.end, r.end);
  }
  return merged;
}

export type LexiconHighlightSegment = {
  key: string;
  text: string;
  isWeak: boolean;
  start?: number;
  end?: number;
  alternatives?: readonly string[];
};

/** Split text into segments for audit-red weak underlines + vocabulary expansion UI. */
export function buildLexiconLintSegments(text: string): LexiconHighlightSegment[] {
  const matches = findWeakLexiconMatches(text);
  if (matches.length === 0) return [{ key: "0", text, isWeak: false }];
  const out: LexiconHighlightSegment[] = [];
  let cursor = 0;
  let i = 0;
  for (const w of matches) {
    if (w.start > cursor) {
      out.push({ key: `n-${i++}`, text: text.slice(cursor, w.start), isWeak: false });
    }
    out.push({
      key: `w-${i++}`,
      text: text.slice(w.start, w.end),
      isWeak: true,
      start: w.start,
      end: w.end,
      alternatives: w.alternatives,
    });
    cursor = w.end;
  }
  if (cursor < text.length) {
    out.push({ key: `n-${i++}`, text: text.slice(cursor), isWeak: false });
  }
  return out;
}

/**
 * Replace a character span in the combined attestation (machine + "\n\n" + human) and split back
 * into machine / human fields for controlled updates.
 */
export function replaceSpanInCombinedAttestation(
  machineCore: string | null,
  humanExtension: string,
  start: number,
  end: number,
  replacement: string,
): { machineCore: string | null; humanExtension: string } {
  const M = machineCore?.trim() ?? "";
  const H = humanExtension;
  const combined = M ? `${M}\n\n${H}` : H;
  const next =
    start < 0 || end > combined.length || start > end
      ? combined
      : combined.slice(0, start) + replacement + combined.slice(end);
  if (!M) return { machineCore: null, humanExtension: next };
  const prefix = `${M}\n\n`;
  if (next.startsWith(prefix)) {
    return { machineCore: M, humanExtension: next.slice(prefix.length) };
  }
  const dbl = next.indexOf("\n\n");
  if (dbl !== -1) {
    return { machineCore: next.slice(0, dbl).trim(), humanExtension: next.slice(dbl + 2) };
  }
  return { machineCore: null, humanExtension: next };
}

export type ForensicScoreBreakdown = {
  tasKeyword: number;
  authoritative: number;
  weakPenalty: number;
  technical: number;
};

export type ForensicScoreResult = {
  total: number;
  breakdown: ForensicScoreBreakdown;
  /** Display band for meter + audit. */
  gradeBand: "Provisional" | "Verified" | "Gold";
  meetsVerifiedThreshold: boolean;
  isGold: boolean;
};

function countRegexMatchesCapped(text: string, re: RegExp, max: number): number {
  re.lastIndex = 0;
  let n = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null && n < max) {
    n++;
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return n;
}

/**
 * Real-time forensic grade: TAS keyword +10 (once), authoritative +10 per hit (max 3 hits = +30),
 * weak −20 per distinct matched phrase, technical anchor +20 (once).
 */
export function computeForensicAttestationScore(text: string | null | undefined): ForensicScoreResult {
  const raw = (text ?? "").trim();
  const weakMatches = findWeakLexiconMatches(raw);
  const weakDistinct = new Set(weakMatches.map((x) => x.text.toLowerCase())).size;
  const weakPenalty = weakDistinct * -20;

  let tasKeyword = 0;
  TAS_KEYWORD_REGEX.lastIndex = 0;
  if (TAS_KEYWORD_REGEX.test(raw)) tasKeyword = 10;

  const authHits = countRegexMatchesCapped(raw, AUTHORITATIVE_REGEX, 3);
  const authoritative = authHits * 10;

  let technical = 0;
  if (TECHNICAL_SIGNAL_REGEX.test(raw)) technical = 20;

  const total = Math.max(0, tasKeyword + authoritative + weakPenalty + technical);
  const meetsVerifiedThreshold = total > FORENSIC_VERIFIED_MIN_SCORE_EXCLUSIVE && weakMatches.length === 0;
  const isGold = meetsVerifiedThreshold && total >= FORENSIC_GOLD_MIN_SCORE;

  let gradeBand: ForensicScoreResult["gradeBand"] = "Provisional";
  if (weakMatches.length > 0 || total <= FORENSIC_VERIFIED_MIN_SCORE_EXCLUSIVE) {
    gradeBand = "Provisional";
  } else if (total >= FORENSIC_GOLD_MIN_SCORE) {
    gradeBand = "Gold";
  } else {
    gradeBand = "Verified";
  }

  return {
    total,
    breakdown: { tasKeyword, authoritative, weakPenalty, technical },
    gradeBand,
    meetsVerifiedThreshold,
    isGold,
  };
}

/** Append forensic score metadata for Audit Intelligence `metadata_tag` pipelines. */
export function appendForensicScoreToMetadataTag(
  baseTag: string | null | undefined,
  justificationPlain: string,
): string {
  const s = computeForensicAttestationScore(justificationPlain);
  const frag = `forensicScore=${s.total}|forensicGrade=${s.gradeBand}`;
  const base = (baseTag ?? "").trim();
  return base ? `${base}|${frag}` : frag;
}

/** Bulk / card gate: length caller-checked; nonsense + lexicon + forensic score. */
export function reachesForensicNeutralizeQualityBar(text: string | null | undefined): boolean {
  const t = (text ?? "").trim();
  if (t.length === 0) return false;
  if (hasWeakLexiconViolation(t)) return false;
  if (exceedsWeakLexiconToneLock(t)) return false;
  return computeForensicAttestationScore(t).meetsVerifiedThreshold;
}
