/** Work-note row shown on Active Risks cards (DB notes + optional pipeline triage mirror). */
export type ThreatWorkNoteDisplay = {
  timestamp: string;
  text: string;
  user: string;
  /** Read-only mirror of pipeline acknowledge justification (RiskEvent / shadow lane). */
  pipelineTriage?: boolean;
};

type ThreatGrcSource = {
  id?: string;
  justification?: string;
  ingestionDetails?: string | null;
  workNotes?: { text: string; timestamp?: string; user?: string }[];
  createdAt?: string | null;
};

/** Pipeline triage justification: `ingestionDetails.grcJustification`, else newest work note. */
export function readPipelineGrcJustificationFromThreat(threat: ThreatGrcSource): string {
  const raw = threat.ingestionDetails;
  if (typeof raw === "string" && raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        const g = (parsed as Record<string, unknown>).grcJustification;
        if (typeof g === "string" && g.trim().length > 0) {
          return g.trim();
        }
      }
    } catch {
      /* not JSON */
    }
  }
  const wn = threat.workNotes;
  if (Array.isArray(wn) && wn.length > 0) {
    const t0 = wn[0]?.text;
    if (typeof t0 === "string" && t0.trim().length > 0) {
      return t0.trim();
    }
  }
  return (threat.justification ?? "").trim();
}

function mapDbWorkNotes(
  notes: { text: string; timestamp?: string; user?: string }[],
): ThreatWorkNoteDisplay[] {
  return notes.map((n) => ({
    timestamp: n.timestamp ?? new Date(0).toISOString(),
    text: n.text,
    user: n.user ?? "Operator",
  }));
}

/**
 * Merge persisted + client work notes with a read-only pipeline triage line when
 * acknowledge justification lives on `ingestionDetails` but no `WorkNote` row exists
 * (shadow / RiskEvent lane, including control-stress cards).
 */
export function mergeWorkNotesWithPipelineTriage(
  threat: ThreatGrcSource,
  localNotes: ThreatWorkNoteDisplay[],
): ThreatWorkNoteDisplay[] {
  const fromDb = mapDbWorkNotes(threat.workNotes ?? []);
  const combined = [...fromDb, ...localNotes];

  const grcText = readPipelineGrcJustificationFromThreat(threat);
  if (!grcText) return combined;

  const alreadyMirrored = combined.some((n) => n.text.trim() === grcText);
  if (alreadyMirrored) return combined;

  const triageNote: ThreatWorkNoteDisplay = {
    timestamp: threat.createdAt?.trim() || new Date().toISOString(),
    text: grcText,
    user: "Pipeline triage",
    pipelineTriage: true,
  };

  return [triageNote, ...combined];
}
