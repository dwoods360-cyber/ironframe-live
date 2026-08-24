/**
 * Human voice lock for Sales EMAIL/SMS correspondence.
 *
 * board-writer owns docs-plane prose only (not cold send). Sales drafts still
 * borrow its plain-English bar: short spoken sentences, problem-first, no
 * stacked catalog language. Peer register: docs/sales/founder-elevator-pitch-casual-audio-script.md
 */

export type HumanVoiceIssue = {
  code:
    | "WORD_STUMBLE"
    | "RUN_ON_ECONOMICS"
    | "CATALOG_DENSITY"
    | "SYNTHETIC_CTA"
    | "MISSING_PEER_CTA";
  message: string;
};

const CATALOG_MARKERS = [
  /co-builder seat structured around/i,
  /actively build around your team's specific multi-tenant workflow/i,
  /asymmetric upside/i,
  /enterprise pricing to establish/i,
  /strictly peer-to-peer technical diligence protocol/i,
];

/** Adjacent word-family stumble (e.g. stacks … stack). */
export function hasAdjacentWordStumble(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ");
  // same stem appearing twice within ~12 words
  return /\b(stack)(?:s|ed|ing)?\b(?:\W+\w+){0,8}\W+\b\1\b/i.test(normalized);
}

/** Economics paragraph crammed into one clause with price + window + criteria + GA. */
export function hasRunOnEconomics(text: string): boolean {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const hasPilot = /\$4,?999/.test(line);
    const hasGa = /\$35,?000|~\$35k/i.test(line);
    const hasWindow = /90[-\s]?day/i.test(line);
    const hasCriteria = /2[–-]3|two or three/i.test(line);
    if (hasPilot && hasGa && hasWindow && hasCriteria && line.length > 140) {
      return true;
    }
  }
  return false;
}

export function lintSalesHumanVoice(body: string): {
  ok: boolean;
  issues: HumanVoiceIssue[];
} {
  const issues: HumanVoiceIssue[] = [];
  const text = String(body ?? "");

  if (hasAdjacentWordStumble(text)) {
    issues.push({
      code: "WORD_STUMBLE",
      message: "Avoid adjacent word-family stumbles (e.g. stacks … stack).",
    });
  }
  if (hasRunOnEconomics(text)) {
    issues.push({
      code: "RUN_ON_ECONOMICS",
      message:
        "Split economics: pilot price/window/criteria in one short line; GA anchor in another — not one spec-sheet sentence.",
    });
  }
  for (const re of CATALOG_MARKERS) {
    if (re.test(text)) {
      issues.push({
        code: "CATALOG_DENSITY",
        message: `Catalog/spec phrasing detected (${re.source}) — rewrite in spoken founder voice.`,
      });
      break;
    }
  }
  if (/Worth a 10[–-]15 min workflow review this week\?/i.test(text) === false) {
    // soft check — either form of CTA is fine
  }
  if (
    !/10[–-]15\s*min(ute)?\s+workflow review/i.test(text) &&
    !/workflow review/i.test(text)
  ) {
    issues.push({
      code: "MISSING_PEER_CTA",
      message: "Include a spoken 10–15 minute workflow-review ask.",
    });
  }
  if (/Request Demo|book a demo|schedule a demo/i.test(text)) {
    issues.push({
      code: "SYNTHETIC_CTA",
      message: "Demo CTAs are banned — use peer workflow review.",
    });
  }

  return { ok: issues.length === 0, issues };
}

/** Operator-facing reminder for Approvals / Cursor drafting. */
export const SALES_HUMAN_VOICE_LOCK = [
  "Write like a founder emailing a peer — short sentences you could say aloud.",
  "One idea per sentence. Split price, window, criteria, and GA across lines when needed.",
  "Prefer plain words over catalog phrases (co-builder seat structured around…).",
  "No adjacent word stumbles (stacks/stack, evidence/evidence packing).",
  "board-writer clarity bar applies; board-writer does not author cold EMAIL — Sales HITL owns the send.",
].join(" ");
