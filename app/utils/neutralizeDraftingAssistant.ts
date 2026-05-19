import { DEV_TENANT_CONTROL_CHIPS } from "@/app/constants/devTenantRoster";
import { getAuditLogs } from "@/app/utils/auditLogger";

/** Primary TAS constitutional directives (canonical pull — mirrors `docs/TAS.md` intent). */
export const TAS_CONSTITUTIONAL_DIRECTIVES = [
  "Tenant isolation as a fundamental structural limit.",
  "Continuous Integrity Audit and deterministic scoring.",
  "Zero-trust ingestion via Irongate (Agent 14).",
  "Ironlock (Agent 6) quarantine authority.",
] as const;

/** Prepended to persisted neutralize justification + Audit Intelligence rows (Task 5). */
export const USER_00_CONSTITUTIONAL_ATTESTATION_PREFIX = "[USER_00 CONSTITUTIONAL ATTESTATION]: ";

/** User must replace / extend — never auto-submit as final attestation. */
export const PERSONAL_OBSERVATION_PLACEHOLDER = "[User to complete...]";

export type ConstitutionalAleHint = { tenantTitle: string; aleDisplay: string };

/** Map UI tenant / industry / target text to a frozen TAS §4 chip (no invented dollars). */
export function pickConstitutionalAleFromTenantContext(options: {
  selectedTenantName?: string | null;
  industry?: string | null;
  target?: string | null;
}): ConstitutionalAleHint | null {
  const hay = `${options.selectedTenantName ?? ""} ${options.industry ?? ""} ${options.target ?? ""}`.toLowerCase();
  for (const chip of DEV_TENANT_CONTROL_CHIPS) {
    if (hay.includes(chip.key) || hay.includes(chip.title.toLowerCase())) {
      return { tenantTitle: chip.title, aleDisplay: chip.aleDisplay };
    }
  }
  return null;
}

/** Latest Audit Intelligence lines tied to this threat id (client ledger). */
export function gatherAuditHowSnippetsForThreat(threatId: string, max = 3): string[] {
  const tid = threatId.trim().toLowerCase();
  if (!tid) return [];
  const logs = getAuditLogs();
  const matches = logs.filter((e) => {
    const desc = (e.description ?? "").toLowerCase();
    const tag = (e.metadata_tag ?? "").toLowerCase();
    return tag.includes(tid) || desc.includes(tid);
  });
  return matches.slice(0, max).map((e) => {
    const raw = (e.description ?? "").trim().replace(/\s+/g, " ");
    return raw.length > 220 ? `${raw.slice(0, 217)}…` : raw;
  });
}

/** Pull a concise "How" line from chaos shadow log / terminal hints when present. */
export function extractIrontechHowFromIngestion(ingestionDetailsRaw: string | null | undefined): string | null {
  const raw = (ingestionDetailsRaw ?? "").trim();
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as {
      chaosShadowAuditLog?: Array<{ line?: string }>;
      lastTerminalLine?: string;
    };
    const log = j.chaosShadowAuditLog;
    if (Array.isArray(log) && log.length > 0) {
      for (let i = log.length - 1; i >= 0; i--) {
        const entry = log[i];
        const line = typeof entry?.line === "string" ? entry.line.trim() : "";
        if (line) return line.length > 200 ? `${line.slice(0, 197)}…` : line;
      }
    }
    if (typeof j.lastTerminalLine === "string" && j.lastTerminalLine.trim()) {
      const t = j.lastTerminalLine.trim();
      return t.length > 200 ? `${t.slice(0, 197)}…` : t;
    }
  } catch {
    if (/irontech|self-?heal|chaosshadowauditlog/i.test(raw)) {
      return "Structured Irontech / ingestion telemetry is present on this row (see Intelligence braid).";
    }
  }
  return null;
}

/** First substantive line from TAS excerpt for citation (no full doc in UI). */
export function tasHeadlineFromExcerpt(excerpt: string): string {
  const lines = excerpt
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const hit = lines.find((l) => /LOGGING|CONSTITUTION|forensic|Audit Intelligence/i.test(l));
  return (hit ?? lines[0] ?? "TAS constitutional logging and forensic model").slice(0, 160);
}

export type MachineAttestationDraft = {
  /** Machine starter (no placeholder). */
  machineCore: string;
};

/** Deterministic index into {@link TAS_CONSTITUTIONAL_DIRECTIVES} from telemetry + audit hints. */
export function pickConstitutionalDirectiveIndex(input: {
  threatId: string;
  auditHowSnippets: string[];
  irontechHow?: string | null;
  threatName?: string | null;
  target?: string | null;
}): number {
  const hay = [
    input.irontechHow ?? "",
    ...input.auditHowSnippets,
    input.threatName ?? "",
    input.target ?? "",
  ]
    .join(" ")
    .toLowerCase();
  if (/irongate|ingest|sanit|dmz|perimeter|payload/.test(hay)) return 2;
  if (/ironlock|quarantine|halt|lockdown|override/.test(hay)) return 3;
  if (/audit|integrity|deterministic|score|forensic/.test(hay)) return 1;
  if (/tenant|isolate|rls|cross-tenant|bleed/.test(hay)) return 0;
  let h = 0;
  const id = input.threatId.trim();
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) >>> 0;
  return h % TAS_CONSTITUTIONAL_DIRECTIVES.length;
}

/**
 * Constitutional clerk: deterministic starter using TAS.md directive language + authoritative lexicon only
 * (verified, validated, attested, …). No subjective or weak hedging — operator completes the human line.
 */
export function composeConstitutionalStarter60to80(input: {
  threatId: string;
  auditHowSnippets: string[];
  irontechHow?: string | null;
  threatName?: string | null;
  target?: string | null;
}): MachineAttestationDraft {
  const tid = (input.threatId.trim().replace(/-/g, "").slice(0, 8) || "riskrow").slice(0, 8);
  const idx = pickConstitutionalDirectiveIndex({
    threatId: input.threatId,
    auditHowSnippets: input.auditHowSnippets,
    irontechHow: input.irontechHow,
    threatName: input.threatName,
    target: input.target,
  });
  const templates: [string, string, string, string] = [
    `Irongate (Agent 14) perimeter validated; isolation verified for telemetry ${tid}.`,
    `TAS constitutional baseline confirmed; Irongate (Agent 14) authenticated for ${tid}.`,
    `Tenant integrity attested; Agent 14 Irongate boundary remediated for ${tid}.`,
    `Zero-trust Irongate verified; deterministic isolation validated on ${tid}.`,
  ];
  let core = templates[idx % 4].replace(/\s+/g, " ").trim();
  const directive = TAS_CONSTITUTIONAL_DIRECTIVES[idx % 4];
  if (core.length < 60) {
    const tail = ` (${directive})`.replace(/\s+/g, " ").trim();
    core = (core + tail).replace(/\s+/g, " ").trim();
  }
  if (core.length > 80) core = `${core.slice(0, 77)}…`;
  if (core.length < 60) core = `${`${core} ${directive}`.replace(/\s+/g, " ").trim().slice(0, 80)}`;
  return { machineCore: core };
}

/**
 * @deprecated Prefer {@link composeConstitutionalStarter60to80} for the attestation gate UI.
 * Long-form two-sentence starter (Audit Intelligence + TAS excerpt).
 */
export function composeMachineAttestationDraft(input: {
  threatId: string;
  threatName?: string | null;
  target?: string | null;
  auditHowSnippets: string[];
  tasExcerpt: string;
  constitutional?: ConstitutionalAleHint | null;
  irontechHow?: string | null;
}): MachineAttestationDraft {
  const tid = input.threatId.trim();
  const name = (input.threatName ?? "this active risk").trim();
  const target = (input.target ?? "declared target").trim();
  const how =
    (input.irontechHow && input.irontechHow.trim()) ||
    (input.auditHowSnippets[0] && input.auditHowSnippets[0].trim()) ||
    "the latest client-side Audit Intelligence entries and ingestion markers for this threat id.";
  const howShort = how.replace(/\s+/g, " ").slice(0, 175);
  const tasLine = tasHeadlineFromExcerpt(input.tasExcerpt);
  const constitutional =
    input.constitutional != null
      ? `I verify governance alignment with ${input.constitutional.tenantTitle}'s constitutional ALE anchor of ${input.constitutional.aleDisplay} per TAS §4 (frozen baseline).`
      : "I verify governance alignment with the TAS §4 BIGINT financial lock and baseline discipline for this tenant scope.";

  const s1 = `I have reviewed the Irontech self-healing and Audit Intelligence trail for threat ${tid} (${name}; target ${target}) and confirm the recorded "How" evidence includes: ${howShort}.`;
  const s2 = `${constitutional} Constitutional hook from TAS: ${tasLine}.`;

  return { machineCore: `${s1} ${s2}`.replace(/\s+/g, " ").trim() };
}

export function buildFullNeutralizeJustification(machineCore: string | null, humanExtension: string): string {
  const h = humanExtension.trim();
  if (!machineCore?.trim()) return h;
  return `${machineCore.trim()}\n\n${h}`.trim();
}
