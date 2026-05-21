/**
 * Constitutional directive dictionary — TAS.md + 19-agent workforce keywords.
 * Used for hover citations (Audit Intelligence, work notes, victory lap).
 */

export type ConstitutionalDirectiveDef = {
  /** Stable id for metadata (`tasCites=…`) and chips */
  id: string;
  /** Short label for badges / victory lap */
  label: string;
  /** One-sentence TAS-aligned summary */
  summary: string;
  /** `docs/TAS.md` fragment id (e.g. agent-14) — see `/constitution/tas` */
  anchorId: string;
  /** 1-based line in `docs/TAS.md` for `vscode://file/…:line` deep links */
  tasLine: number;
};

export const CONSTITUTIONAL_DIRECTIVE_BY_ID: Readonly<Record<string, ConstitutionalDirectiveDef>> = {
  ironcore: {
    id: "ironcore",
    label: "Ironcore",
    summary:
      "Orchestrator and routing — the central nervous system directing traffic to specialized agents under LangGraph discipline.",
    anchorId: "agent-1",
    tasLine: 40,
  },
  ironwave: {
    id: "ironwave",
    label: "Ironwave",
    summary:
      "Live telemetry monitoring that ingests and standardizes real-time system health and performance metrics for the fleet.",
    anchorId: "agent-2",
    tasLine: 41,
  },
  irontrust: {
    id: "irontrust",
    label: "Irontrust",
    summary:
      "Scoring engine executing constitutionally frozen ALE mathematics; changing this math requires full test and snapshot parity.",
    anchorId: "agent-3",
    tasLine: 42,
  },
  irontech: {
    id: "irontech",
    label: "Irontech",
    summary:
      "Self-healing and checkpoint engine; responsible for Last Known Good restoration from persistent LangGraph state and workforce parity.",
    anchorId: "agent-4",
    tasLine: 50,
  },
  ironscribe: {
    id: "ironscribe",
    label: "Ironscribe",
    summary:
      "Deep-doc worker for document parsing, OCR, and unstructured data extraction feeding governed pipelines.",
    anchorId: "agent-5",
    tasLine: 44,
  },
  ironlock: {
    id: "ironlock",
    label: "Ironlock",
    summary:
      "Priority interrupt and quarantine authority; mandated to halt pipelines, freeze execution, and trigger lockdown on critical anomalies.",
    anchorId: "agent-6",
    tasLine: 45,
  },
  ironcast: {
    id: "ironcast",
    label: "Ironcast",
    summary:
      "Switchboard and notification layer managing outbound alerts, webhooks, and human-in-the-loop escalation routing.",
    anchorId: "agent-7",
    tasLine: 46,
  },
  ironsight: {
    id: "ironsight",
    label: "Ironsight",
    summary:
      "Tactical sentinel — high-fidelity active risk scanner for immediate threat-vector identification on the wire.",
    anchorId: "agent-8",
    tasLine: 43,
  },
  ironlogic: {
    id: "ironlogic",
    label: "Ironlogic",
    summary:
      "Neural policy learner that analyzes historical decisions to propose internal policy optimizations without bypassing human gates.",
    anchorId: "agent-9",
    tasLine: 48,
  },
  ironmap: {
    id: "ironmap",
    label: "Ironmap",
    summary:
      "Supply-chain graphing for 3rd/4th-party vendor hierarchies and cascading exposure across the extended enterprise.",
    anchorId: "agent-10",
    tasLine: 49,
  },
  ironintel: {
    id: "ironintel",
    label: "Ironintel",
    summary:
      "OSINT and policy monitor that scrapes and synthesizes external threat intelligence and regulatory updates for GRC posture.",
    anchorId: "agent-11",
    tasLine: 47,
  },
  ironguard: {
    id: "ironguard",
    label: "Ironguard",
    summary:
      "The warden for appsec, token rotation, and context validation — ensuring API secrets never leak to clients or logs.",
    anchorId: "agent-12",
    tasLine: 51,
  },
  ironwatch: {
    id: "ironwatch",
    label: "Ironwatch",
    summary:
      "Anomaly hunter for internal user behavior analytics (UBA) and directive-violation monitoring across sessions.",
    anchorId: "agent-13",
    tasLine: 52,
  },
  irongate: {
    id: "irongate",
    label: "Irongate",
    summary:
      "The mandatory DMZ sanitization layer; no external ingestion may bypass Agent 14’s strictly stamped tenant validation and schema gate.",
    anchorId: "agent-14",
    tasLine: 53,
  },
  ironquery: {
    id: "ironquery",
    label: "Ironquery",
    summary:
      "Interactive analyst and copilot — conversational RAG and on-demand reporting for operator-grade explanations.",
    anchorId: "agent-15",
    tasLine: 54,
  },
  ironscout: {
    id: "ironscout",
    label: "Ironscout",
    summary:
      "Ad-hoc ephemeral tracker (TTL-bounded) that self-terminates after completing scoped reconnaissance without persistence bleed.",
    anchorId: "agent-16",
    tasLine: 55,
  },
  ironbloom: {
    id: "ironbloom",
    label: "Ironbloom",
    summary:
      "Production CSRD sustainability ledger — physical units (kWh, L, km, CO₂e) only; monetary-only carbon proxies are constitutionally rejected.",
    anchorId: "ironbloom-production",
    tasLine: 56,
  },
  ironethic: {
    id: "ironethic",
    label: "Ironethic",
    summary:
      "Social and DEI monitor under a strict No-PII lock — all inputs must be aggregated and salted before storage or LangGraph state.",
    anchorId: "tas-ironethic-pii",
    tasLine: 138,
  },
  irontally: {
    id: "irontally",
    label: "Irontally",
    summary:
      "Disclosure and framework mapper cross-walking operational data against CSRD, GRI, and ISSB reporting expectations.",
    anchorId: "agent-19",
    tasLine: 58,
  },
  kimbot: {
    id: "kimbot",
    label: "Kimbot",
    summary:
      "Red-team / simulation sustainability and threat injector — distinct from production Ironbloom; exercises physical-unit gates under drill policy.",
    anchorId: "tas-sustainability-kimbot",
    tasLine: 79,
  },
  langgraph: {
    id: "langgraph",
    label: "LangGraph",
    summary:
      "Persistent LangGraph state memory with tenant-bound thread IDs and checkpoints — cross-tenant memory bleed is a forbidden action.",
    anchorId: "tas-langgraph-checkpoints",
    tasLine: 39,
  },
  rls: {
    id: "rls",
    label: "RLS",
    summary:
      "Supabase Row Level Security mandate — every tenant-scoped table must enforce a validated tenant context before reads or writes.",
    anchorId: "tas-rls-isolation",
    tasLine: 108,
  },
  bigint_ledger: {
    id: "bigint_ledger",
    label: "BIGINT ledger",
    summary:
      "The BIGINT financial lock — USD ALE and fiscal fields are integer cents only; floats are forbidden for ledger and Irontrust scoring inputs.",
    anchorId: "tas-bigint-lock",
    tasLine: 65,
  },
  ale_baseline_cents: {
    id: "ale_baseline_cents",
    label: "ale_baseline_cents",
    summary:
      "Schema-level BIGINT cents column for ALE baselines — floats and Decimal types are forbidden for governed financial fields.",
    anchorId: "tas-ale-baseline-cents",
    tasLine: 67,
  },
  dmz: {
    id: "dmz",
    label: "DMZ",
    summary:
      "Level-2 DMZ air-gap — all external payloads must enter through Irongate sanitization before the internal message bus or database.",
    anchorId: "tas-dmz-air-gap",
    tasLine: 60,
  },
  lkg: {
    id: "lkg",
    label: "LKG",
    summary:
      "Last Known Good restoration path owned by Irontech — workers restart from the last verified LangGraph checkpoint, not guessed state.",
    anchorId: "tas-lkg",
    tasLine: 50,
  },
  ale: {
    id: "ale",
    label: "ALE",
    summary:
      "Annualized Loss Expectancy under Irontrust — tied to constitutionally frozen industry baselines and BIGINT cents storage.",
    anchorId: "tas-ale-baselines",
    tasLine: 70,
  },
};

export function getDirectiveTasRef(directiveId: string): { anchorId: string; tasLine: number } | null {
  const d = CONSTITUTIONAL_DIRECTIVE_BY_ID[directiveId];
  if (!d) return null;
  return { anchorId: d.anchorId, tasLine: d.tasLine };
}

/** Match surface → canonical directive id (longest match wins via sort order). */
export type ConstitutionalScanEntry = { keyword: string; id: string };

const RAW_KEYWORD_ROWS: readonly ConstitutionalScanEntry[] = [
  { keyword: "ale_baseline_cents", id: "ale_baseline_cents" },
  { keyword: "aleBaselineCents", id: "ale_baseline_cents" },
  { keyword: "Row Level Security", id: "rls" },
  { keyword: "LangGraph.js", id: "langgraph" },
  { keyword: "Last Known Good", id: "lkg" },
  { keyword: "LangGraph", id: "langgraph" },
  { keyword: "Ironcore", id: "ironcore" },
  { keyword: "IRONCORE", id: "ironcore" },
  { keyword: "Ironwave", id: "ironwave" },
  { keyword: "IRONWAVE", id: "ironwave" },
  { keyword: "Irontrust", id: "irontrust" },
  { keyword: "IRONTRUST", id: "irontrust" },
  { keyword: "Irontech", id: "irontech" },
  { keyword: "IRONTECH", id: "irontech" },
  { keyword: "Ironscribe", id: "ironscribe" },
  { keyword: "Ironlock", id: "ironlock" },
  { keyword: "IRONLOCK", id: "ironlock" },
  { keyword: "Ironcast", id: "ironcast" },
  { keyword: "Ironsight", id: "ironsight" },
  { keyword: "Ironlogic", id: "ironlogic" },
  { keyword: "Ironmap", id: "ironmap" },
  { keyword: "Ironintel", id: "ironintel" },
  { keyword: "Ironguard", id: "ironguard" },
  { keyword: "IRONGUARD", id: "ironguard" },
  { keyword: "Ironwatch", id: "ironwatch" },
  { keyword: "Irongate", id: "irongate" },
  { keyword: "IRONGATE", id: "irongate" },
  { keyword: "Ironquery", id: "ironquery" },
  { keyword: "Ironscout", id: "ironscout" },
  { keyword: "Ironbloom", id: "ironbloom" },
  { keyword: "IRONBLOOM", id: "ironbloom" },
  { keyword: "Ironethic", id: "ironethic" },
  { keyword: "Irontally", id: "irontally" },
  { keyword: "Kimbot", id: "kimbot" },
  { keyword: "Agent 19", id: "irontally" },
  { keyword: "Agent 18", id: "ironethic" },
  { keyword: "Agent 17", id: "ironbloom" },
  { keyword: "Agent 16", id: "ironscout" },
  { keyword: "Agent 15", id: "ironquery" },
  { keyword: "Agent 14", id: "irongate" },
  { keyword: "Agent 13", id: "ironwatch" },
  { keyword: "Agent 12", id: "ironguard" },
  { keyword: "Agent 11", id: "ironintel" },
  { keyword: "Agent 10", id: "ironmap" },
  { keyword: "Agent 09", id: "ironlogic" },
  { keyword: "Agent 9", id: "ironlogic" },
  { keyword: "Agent 08", id: "ironsight" },
  { keyword: "Agent 8", id: "ironsight" },
  { keyword: "Agent 07", id: "ironcast" },
  { keyword: "Agent 7", id: "ironcast" },
  { keyword: "Agent 06", id: "ironlock" },
  { keyword: "Agent 6", id: "ironlock" },
  { keyword: "Agent 05", id: "ironscribe" },
  { keyword: "Agent 5", id: "ironscribe" },
  { keyword: "Agent 04", id: "irontech" },
  { keyword: "Agent 4", id: "irontech" },
  { keyword: "Agent 03", id: "irontrust" },
  { keyword: "Agent 3", id: "irontrust" },
  { keyword: "Agent 02", id: "ironwave" },
  { keyword: "Agent 2", id: "ironwave" },
  { keyword: "Agent 01", id: "ironcore" },
  { keyword: "Agent 1", id: "ironcore" },
  { keyword: "BIGINT", id: "bigint_ledger" },
  { keyword: "DMZ", id: "dmz" },
  { keyword: "LKG", id: "lkg" },
  { keyword: "RLS", id: "rls" },
  { keyword: "ALE", id: "ale" },
];

function dedupeScanEntries(rows: readonly ConstitutionalScanEntry[]): ConstitutionalScanEntry[] {
  const seen = new Set<string>();
  const out: ConstitutionalScanEntry[] = [];
  for (const r of rows) {
    const k = `${r.keyword}\0${r.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

/** Longest keyword first for greedy scan. */
export const CONSTITUTIONAL_SCAN_ENTRIES_SORTED: readonly ConstitutionalScanEntry[] = Object.freeze(
  dedupeScanEntries([...RAW_KEYWORD_ROWS]).sort((a, b) => b.keyword.length - a.keyword.length),
);

const WORD_CHAR = /[A-Za-z0-9_]/;

function isWordBoundaryLeft(text: string, start: number): boolean {
  if (start <= 0) return true;
  return !WORD_CHAR.test(text[start - 1]!);
}

function isWordBoundaryRight(text: string, end: number): boolean {
  if (end >= text.length) return true;
  return !WORD_CHAR.test(text[end]!);
}

function matchConstitutionalKeywordAtLower(
  text: string,
  lowerFull: string,
  i: number,
): { end: number; id: string; keyword: string } | null {
  for (const ent of CONSTITUTIONAL_SCAN_ENTRIES_SORTED) {
    const kw = ent.keyword;
    const klen = kw.length;
    if (i + klen > text.length) continue;
    if (lowerFull.slice(i, i + klen) !== kw.toLowerCase()) continue;
    if (!isWordBoundaryLeft(text, i) || !isWordBoundaryRight(text, i + klen)) continue;
    return { end: i + klen, id: ent.id, keyword: text.slice(i, i + klen) };
  }
  return null;
}

export type ConstitutionalTextSegment =
  | { kind: "text"; text: string }
  | { kind: "directive"; text: string; id: string; summary: string; anchorId: string; tasLine: number };

export function segmentConstitutionalText(text: string): ConstitutionalTextSegment[] {
  if (!text) return [];
  const lowerFull = text.toLowerCase();
  const out: ConstitutionalTextSegment[] = [];
  let i = 0;
  while (i < text.length) {
    const hit = matchConstitutionalKeywordAtLower(text, lowerFull, i);
    if (hit) {
      const def = CONSTITUTIONAL_DIRECTIVE_BY_ID[hit.id];
      const summary = def?.summary ?? "";
      const anchorId = def?.anchorId ?? "tas-nineteen-agent-roster";
      const tasLine = def?.tasLine ?? 38;
      out.push({ kind: "directive", text: hit.keyword, id: hit.id, summary, anchorId, tasLine });
      i = hit.end;
    } else {
      const start = i;
      i++;
      while (i < text.length && !matchConstitutionalKeywordAtLower(text, lowerFull, i)) {
        i++;
      }
      out.push({ kind: "text", text: text.slice(start, i) });
    }
  }
  return out;
}

/** Ordered unique directive ids first seen in `text` (for chips / metadata). */
export function extractConstitutionalCitationIds(text: string | null | undefined): string[] {
  const t = (text ?? "").trim();
  if (!t) return [];
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const seg of segmentConstitutionalText(t)) {
    if (seg.kind !== "directive") continue;
    if (seen.has(seg.id)) continue;
    seen.add(seg.id);
    ordered.push(seg.id);
  }
  return ordered;
}

/** Append `tasCites=id1,id2` to audit `metadata_tag` for downstream auditors. */
export function appendTasCitesToMetadataTag(baseTag: string | null | undefined, justificationPlain: string): string {
  const cites = extractConstitutionalCitationIds(justificationPlain);
  if (cites.length === 0) return (baseTag ?? "").trim();
  const frag = `tasCites=${cites.join(",")}`;
  const base = (baseTag ?? "").trim();
  return base ? `${base}|${frag}` : frag;
}

export function directiveLabelForId(id: string): string {
  return CONSTITUTIONAL_DIRECTIVE_BY_ID[id]?.label ?? id;
}
