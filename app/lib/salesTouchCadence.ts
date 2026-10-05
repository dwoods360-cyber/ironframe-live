/**
 * Pure touch-number rules for Path B outreach cadence.
 *
 * Why this exists: `Cadence: TOUCHN` lives on the *pending* draft, but the
 * DISPATCH route rebuilds the summary when a draft goes on the wire, so
 * dispatched rows written before 2026-08-27 carry no cadence tag. Any
 * "has this buyer already had Touch 2?" check written against the tag returns
 * a false negative and lets a prep run stack another email onto a contact who
 * has already had two.
 *
 * Source of truth is the *count of DISPATCHED sales rows* for a contact. The
 * tag is a human-readable label, repaired on dispatch and by
 * `scripts/dev/backfill-sales-cadence-tags.mjs`; it is never the arbiter.
 *
 * Server-side Prisma readers live in `app/lib/server/salesTouchHistoryCore.ts`.
 */

export type SalesTouchNumber = "TOUCH1" | "TOUCH2" | "TOUCH3" | "TOUCH4";

/** Cadence tags model four touches. Touch 4 is the final close. Later sends clamp to TOUCH4. */
export const MAX_TRACKED_TOUCH_ORDINAL = 4;

/** Minimum spacing between two sends to the same buyer. */
export const MIN_DAYS_BETWEEN_TOUCHES = 7;

const MS_PER_DAY = 86_400_000;

export type TouchSpacingGate =
  | { ok: true; daysSinceLastSend: number | null }
  | { ok: false; daysSinceLastSend: number; earliestNextSendAt: Date };

/**
 * A buyer gets at most one email a week. Without this, two drafts approved in
 * the same sitting both pass their own gates and land a day apart.
 * A contact with no prior send is always clear.
 */
export function gateTouchSpacing(input: {
  lastSentAt: Date | null | undefined;
  now?: Date;
}): TouchSpacingGate {
  if (!input.lastSentAt) return { ok: true, daysSinceLastSend: null };

  const now = input.now ?? new Date();
  const elapsed = now.getTime() - input.lastSentAt.getTime();
  const daysSinceLastSend = Math.floor(elapsed / MS_PER_DAY);
  if (daysSinceLastSend >= MIN_DAYS_BETWEEN_TOUCHES) {
    return { ok: true, daysSinceLastSend };
  }
  return {
    ok: false,
    daysSinceLastSend,
    earliestNextSendAt: new Date(
      input.lastSentAt.getTime() + MIN_DAYS_BETWEEN_TOUCHES * MS_PER_DAY,
    ),
  };
}

export const TRACE_MATRIX_MARKER = "--- Trace Matrix ---";

export function touchStageFromOrdinal(ordinal: number): SalesTouchNumber {
  const clamped = Math.min(Math.max(Math.trunc(ordinal), 1), MAX_TRACKED_TOUCH_ORDINAL);
  return `TOUCH${clamped}` as SalesTouchNumber;
}

/** Ordinal the next send occupies given how many already went out. */
export function nextTouchOrdinalFromPriorSends(priorSendCount: number): number {
  return Math.max(0, Math.trunc(priorSendCount)) + 1;
}

/** Read an explicit cadence tag when present. Label only — never authoritative. */
export function parseCadenceTouch(summary: string | null | undefined): SalesTouchNumber | null {
  const match = String(summary ?? "").match(/Cadence:\s*(TOUCH[1-4])\b/i);
  if (!match?.[1]) return null;
  return match[1].toUpperCase() as SalesTouchNumber;
}

export function buildCadenceTraceLine(touch: SalesTouchNumber): string {
  return `Cadence: ${touch}`;
}

/**
 * Stamp the cadence line into a dispatched summary's Trace Matrix.
 * Idempotent: a summary that already carries a cadence tag is returned as-is.
 */
export function withCadenceTraceLine(summary: string, touch: SalesTouchNumber): string {
  if (parseCadenceTouch(summary)) return summary;
  const line = buildCadenceTraceLine(touch);
  const idx = summary.indexOf(TRACE_MATRIX_MARKER);
  if (idx === -1) return `${summary}\n${line}`;

  const cut = idx + TRACE_MATRIX_MARKER.length;
  const head = summary.slice(0, cut);
  const tail = summary.slice(cut);
  const lines = tail.split("\n");
  // lines[0] is the remainder of the marker line (usually empty); keep the
  // Channel/To trace line directly under the marker, then the cadence line.
  const insertAt = lines.length > 1 ? 2 : 1;
  lines.splice(insertAt, 0, line);
  return head + lines.join("\n");
}
