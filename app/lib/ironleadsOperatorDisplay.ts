/**
 * Human-readable formatting for Ironleads SUSPECT report operator surfaces.
 * Keep free of server-only so the report page (RSC) can import it.
 */

const TRIGGER_LABELS: Record<string, string> = {
  REG_FINE: "Regulatory fine / enforcement pressure",
  NEW_CISO: "New or highlighted CISO / security leadership",
  BOARD_MANDATE_DOLLAR_RISK: "Board mandate for dollar-denominated cyber risk",
  COMPLIANCE_JOB_POST: "Compliance / GRC hiring signal",
  AUDIT_FINDING: "Public audit finding",
  BREACH_DISCLOSURE: "Breach / incident disclosure",
  M_AND_A: "Merger or acquisition activity",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function cleanLine(line: string): string {
  return line
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatTriggerToken(token: string): string {
  const key = token.trim().toUpperCase();
  return TRIGGER_LABELS[key] ?? token.replace(/_/g, " ").toLowerCase();
}

function formatTriggerList(raw: string): string {
  return raw
    .split(/[,|]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map(formatTriggerToken)
    .join("; ");
}

function formatScore(value: unknown): string | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return `${Math.round(value * 100)}%`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " UTC";
}

function formatDealNoteLine(line: string): string {
  const text = cleanLine(line);
  if (!text) return "";

  if (/ironleads ingress/i.test(text) && /trigger=/i.test(text)) {
    const triggerMatch = text.match(/trigger=([^|]+?)(?:\s*\||$)/i);
    const scoreMatch = text.match(/priorScore=(\d+)/i);
    const triggers = formatTriggerList(triggerMatch?.[1] ?? "");
    const prior = scoreMatch?.[1] ? ` Prior priority score was ${scoreMatch[1]}.` : "";
    const deduped = /\(deduped\)/i.test(text)
      ? "Matched an existing SUSPECT (deduped) and refreshed it."
      : "Created as a new SUSPECT from harvest.";
    return `${deduped} Timeliness hooks: ${triggers || "none listed"}.${prior}`;
  }

  if (/buying-committee research/i.test(text)) {
    const whenMatch = text.match(
      /buying-committee research\s+(\d{4}-\d{2}-\d{2}T[0-9:.Z+-]+)/i,
    );
    const membersMatch = text.match(/members=([^;]+)/i);
    const pagesMatch = text.match(/pages=(\d+)/i);
    const when = whenMatch?.[1] ? formatWhen(whenMatch[1]) : "an earlier run";
    const members = (membersMatch?.[1] ?? "")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean)
      .join(", ");
    const pages = pagesMatch?.[1] ?? "0";
    return `Buying-committee research on ${when}: found roles ${members || "none"}; fetched ${pages} public page(s).`;
  }

  const hold = text.match(
    /^\[([^\]]+)\]\s*Operator moved SUSPECT → HOLD archive\s*\(([^)]+)\):\s*(.*)$/i,
  );
  if (hold) {
    return `Moved to HOLD archive on ${formatWhen(hold[1] ?? "")} (${(hold[2] ?? "hold").replace(/_/g, " ")}): ${hold[3] ?? ""}`.trim();
  }

  const restore = text.match(
    /^\[([^\]]+)\]\s*Operator restored SUSPECT from HOLD archive\.?(.*)$/i,
  );
  if (restore) {
    const extra = (restore[2] ?? "").trim();
    return `Restored from HOLD archive on ${formatWhen(restore[1] ?? "")}${extra ? `. ${extra}` : "."}`;
  }

  const promote = text.match(
    /^\[([^\]]+)\]\s*Operator promoted SUSPECT → PROSPECT from intake report\.?(.*)$/i,
  );
  if (promote) {
    const extra = (promote[2] ?? "").trim();
    return `Promoted to PROSPECT on ${formatWhen(promote[1] ?? "")}${extra ? `. ${extra}` : "."}`;
  }

  const enrich = text.match(/^\[([^\]]+)\]\s*Operator enrichment:\s*(.*)$/i);
  if (enrich) {
    return `Operator note (${formatWhen(enrich[1] ?? "")}): ${enrich[2] ?? ""}`.trim();
  }

  return text;
}

/** Turn raw deal.notes lines into operator-facing bullets. */
export function formatIronleadsDealNotes(notes: string | null | undefined): string[] {
  const raw = (notes ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!raw) return [];

  return raw
    .split(/\n+/)
    .map(formatDealNoteLine)
    .filter(Boolean);
}

export type QualificationSignalsDisplay = {
  summary: string;
  rows: Array<{ label: string; value: string }>;
};

/** Turn qualificationSignals JSON into plain-language rows. */
export function formatQualificationSignalsDisplay(
  signals: unknown,
): QualificationSignalsDisplay | null {
  const raw = asRecord(signals);
  if (!raw) return null;

  const triggersRaw = Array.isArray(raw.triggers)
    ? raw.triggers.map((t) => String(t))
    : typeof raw.detectedTrigger === "string"
      ? String(raw.detectedTrigger)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

  const painMarkers = asRecord(raw.painMarkers) ?? {};
  const painBits: string[] = [];
  if (painMarkers.fragmentedGrc === true) {
    painBits.push("fragmented GRC / evidence reuse pain assumed");
  }
  for (const [key, value] of Object.entries(painMarkers)) {
    if (key === "fragmentedGrc") continue;
    if (value === true) painBits.push(key.replace(/([A-Z])/g, " $1").toLowerCase());
  }

  const rows: Array<{ label: string; value: string }> = [];

  if (triggersRaw.length > 0) {
    rows.push({
      label: "Timeliness hooks",
      value: triggersRaw.map(formatTriggerToken).join("; "),
    });
  }

  const triggerScore = formatScore(raw.triggerScore);
  if (triggerScore) {
    rows.push({
      label: "Trigger strength",
      value: `${triggerScore} (how strongly public text matched the hooks above)`,
    });
  }

  const beachheadScore = formatScore(raw.beachheadScore);
  if (beachheadScore) {
    rows.push({
      label: "Beachhead / market fit",
      value: `${beachheadScore} (sector alignment for design-partner ICP)`,
    });
  }

  const painScore = formatScore(raw.painScore);
  if (painScore) {
    rows.push({
      label: "Pain signal weight",
      value: painBits.length ? `${painScore} — ${painBits.join("; ")}` : painScore,
    });
  }

  const methodologyScore = formatScore(raw.methodologyScore);
  if (methodologyScore) {
    rows.push({
      label: "Methodology signal",
      value: methodologyScore,
    });
  }

  const priorityWeight = formatScore(raw.priorityWeight);
  if (priorityWeight) {
    rows.push({
      label: "Combined priority weight",
      value: `${priorityWeight} (drives queue ranking with the contact priority score)`,
    });
  }

  if (typeof raw.computedAt === "string" && raw.computedAt.trim()) {
    rows.push({
      label: "Scored at",
      value: formatWhen(raw.computedAt),
    });
  }

  if (rows.length === 0) return null;

  const summary =
    triggersRaw.length > 0
      ? `Harvest scored this account on: ${triggersRaw.map(formatTriggerToken).join("; ")}.`
      : "Harvest stored a qualification score for this account.";

  return { summary, rows };
}
