import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { ThreatState, type Prisma } from "@prisma/client";
import { z } from "zod";
import { SovereignGraphState } from "./state";
import prisma from "../../../lib/prisma";
import { SIMULATION_SIGNATURES } from "@/app/config/constants";
import { IronGate } from "../agents/irongate-sanitizer";

type SovereignState = typeof SovereignGraphState.State;
type UnifiedRiskStateItem = SovereignState["unified_risks"][number];

const WORKFORCE_AGENTS = [
  "IRONCORE",
  "IRONWAVE",
  "IRONTRUST",
  "IRONSIGHT",
  "IRONSCRIBE",
  "IRONLOCK",
  "IRONCAST",
  "IRONINTEL",
  "IRONLOGIC",
  "IRONMAP",
  "IRONTECH",
  "IRONGUARD",
  "IRONWATCH",
  "IRONGATE",
  "IRONQUERY",
  "IRONSCOUT",
  "IRONBLOOM",
  "IRONETHIC",
  "IRONTALLY",
] as const;

const ROUTABLE_AGENTS = ["THREAT_LIFECYCLE", "IRONBLOOM", "IRONTRUST", "IRONQUERY", "IRONLOCK", "END"] as const;
type RoutableAgent = (typeof ROUTABLE_AGENTS)[number];

const classificationSchema = z.object({
  nextAgent: z.enum(ROUTABLE_AGENTS),
  rationale: z.string().min(1),
});

function flattenRawInput(rawInput: unknown): string {
  if (typeof rawInput === "string") return rawInput;
  if (!rawInput || typeof rawInput !== "object") return "";

  const values: string[] = [];
  const stack: unknown[] = [rawInput];
  const seen = new WeakSet<object>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (current == null) continue;

    if (typeof current === "string" || typeof current === "number" || typeof current === "boolean") {
      values.push(String(current));
      continue;
    }

    if (typeof current === "object") {
      const obj = current as Record<string, unknown>;
      if (seen.has(obj)) continue;
      seen.add(obj);
      for (const [key, value] of Object.entries(obj)) {
        values.push(key);
        stack.push(value);
      }
    }
  }

  return values.join(" ");
}

const PII_VALUE_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}\b/,
  /\b\d{3}-\d{2}-\d{4}\b/,
];
const PII_KEY_HINTS = ["email", "phone", "ssn", "dob", "token", "password", "secret"];

function redactPotentialPii(value: string): string {
  let redacted = value;
  for (const pattern of PII_VALUE_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED]");
  }
  return redacted;
}

function sanitizeForGraphState(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") return redactPotentialPii(value);
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((entry) => sanitizeForGraphState(entry));
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const loweredKey = key.toLowerCase();
    if (PII_KEY_HINTS.some((hint) => loweredKey.includes(hint))) {
      out[key] = "[REDACTED]";
      continue;
    }
    out[key] = sanitizeForGraphState(nested);
  }
  return out;
}

function getString(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSimulation(source: string, title: string): boolean {
  const s = source.toLowerCase();
  const t = title.toLowerCase();
  return SIMULATION_SIGNATURES.some((sig) => s.includes(sig) || t.includes(sig));
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function deriveUnifiedId(candidate: Record<string, unknown>): string {
  const explicit =
    getString(candidate.id) ??
    getString(candidate.threatId) ??
    getString(candidate.riskId) ??
    getString(candidate.threat_id);
  if (explicit) return explicit;
  const correlationId = getString(candidate.correlationId) ?? getString(candidate.correlation_id);
  if (correlationId) return `corr:${correlationId}`;
  const source = getString(candidate.source) ?? getString(candidate.sourceAgent) ?? "unknown";
  const title = getString(candidate.title) ?? "untitled";
  return `synthetic:${slug(source)}:${slug(title)}`;
}

function normalizeThreatCandidates(rawInput: unknown): UnifiedRiskStateItem[] {
  if (!rawInput || typeof rawInput !== "object") return [];
  const payload = rawInput as Record<string, unknown>;
  const fromArray = Array.isArray(payload.threats)
    ? payload.threats
    : Array.isArray(payload.risks)
      ? payload.risks
      : [];
  const candidates = fromArray.length > 0 ? fromArray : [payload];
  return candidates
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((candidate) => {
      const source = getString(candidate.source) ?? getString(candidate.sourceAgent) ?? "SYSTEM";
      const title = getString(candidate.title) ?? "Untitled risk signal";
      const status = getString(candidate.status) ?? String(ThreatState.PIPELINE);
      const correlationId = getString(candidate.correlationId) ?? getString(candidate.correlation_id);
      const financialRisk =
        getString(candidate.financialRisk_cents) ??
        getString(candidate.financial_risk_cents) ??
        (typeof candidate.financialRisk_cents === "number"
          ? String(candidate.financialRisk_cents)
          : null);
      return {
        id: deriveUnifiedId(candidate),
        correlationId,
        title,
        source,
        status,
        isSimulation: normalizeSimulation(source, title),
        financialRisk_cents: financialRisk,
        metadata: (sanitizeForGraphState(candidate.metadata ?? null) as Record<string, unknown> | null) ?? null,
        updatedAt: new Date().toISOString(),
      };
    });
}

function mergeUnifiedRisks(
  existing: UnifiedRiskStateItem[],
  incoming: UnifiedRiskStateItem[],
): UnifiedRiskStateItem[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  const byCorrelation = new Map(
    existing.filter((item) => item.correlationId).map((item) => [item.correlationId as string, item.id]),
  );
  for (const item of incoming) {
    const correlatedId = item.correlationId ? byCorrelation.get(item.correlationId) : undefined;
    const targetId = correlatedId ?? item.id;
    const prior = byId.get(targetId);
    const merged: UnifiedRiskStateItem = {
      ...(prior ?? item),
      ...item,
      id: targetId,
      metadata: {
        ...((prior?.metadata ?? {}) as Record<string, unknown>),
        ...((item.metadata ?? {}) as Record<string, unknown>),
      },
      updatedAt: new Date().toISOString(),
    };
    byId.set(targetId, merged);
    if (item.correlationId) byCorrelation.set(item.correlationId, targetId);
  }
  return Array.from(byId.values());
}

function parseLifecycleAction(rawInput: unknown): "CLAIM" | "RESOLVE" | "DE_ACKNOWLEDGE" | "VOID" | null {
  if (!rawInput || typeof rawInput !== "object") return null;
  const raw = rawInput as Record<string, unknown>;
  const action = getString(raw.action) ?? getString(raw.actionType) ?? getString(raw.lifecycleAction);
  if (!action) return null;
  const normalized = action.toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized === "CLAIM" || normalized === "ACKNOWLEDGE") return "CLAIM";
  if (normalized === "RESOLVE" || normalized === "CONFIRM") return "RESOLVE";
  if (normalized === "DE_ACKNOWLEDGE" || normalized === "DEACKNOWLEDGE" || normalized === "DE_ACK") {
    return "DE_ACKNOWLEDGE";
  }
  if (normalized === "VOID") return "VOID";
  return null;
}

function detectSimulationPath(rawInput: unknown, unified: UnifiedRiskStateItem[]): boolean {
  if (unified.some((item) => item.isSimulation)) return true;
  const flattened = flattenRawInput(rawInput).toLowerCase();
  return SIMULATION_SIGNATURES.some((sig) => flattened.includes(sig));
}

async function log_production(args: {
  action: string;
  operatorId: string;
  threatId?: string | null;
  justification?: string | null;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: args.action,
      operatorId: args.operatorId,
      threatId: args.threatId ?? null,
      justification:
        typeof args.justification === "string"
          ? String(sanitizeForGraphState(args.justification))
          : null,
      isSimulation: false,
    },
  });
}

async function log_simulation(args: {
  tenantId: string;
  botType: string;
  disposition: string;
  threatId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.botAuditLog.create({
    data: {
      tenantId: args.tenantId,
      operator: "SYSTEM_IRONSCRIBE_SIMULATION",
      botType: args.botType,
      disposition: args.disposition,
      threatId: args.threatId ?? null,
      metadata: ((sanitizeForGraphState(args.metadata ?? {}) as Prisma.InputJsonValue) ??
        {}) as Prisma.InputJsonValue,
    },
  });
}

function computeRemainingNeeds(rawInput: unknown, processedAgents: string[]): RoutableAgent[] {
  const normalized = flattenRawInput(rawInput).toLowerCase();
  const lifecycleAction = parseLifecycleAction(rawInput);
  const hasPhysicalUnits =
    /\b(kwh|kilowatt[-\s]?hour|liters?|litres?|km|kilometers?)\b/.test(normalized);
  const hasMonetarySignals =
    /\b(ale|annualized loss expectancy|usd|\$|liability|financialrisk|financial risk|risk_cents|mitigatedvaluecents|mitigated value cents)\b/.test(
      normalized,
    );
  const hasAnalystQuery =
    /\b(query|ask|why|what|how|explain|investigate|show|lookup|search|analyst)\b/.test(normalized);
  const processed = new Set(processedAgents.map((a) => a.toUpperCase()));
  const remaining: RoutableAgent[] = [];
  if (lifecycleAction && !processed.has("THREAT_LIFECYCLE")) remaining.push("THREAT_LIFECYCLE");
  if (hasMonetarySignals && !processed.has("IRONTRUST")) remaining.push("IRONTRUST");
  if (hasPhysicalUnits && !processed.has("IRONBLOOM")) remaining.push("IRONBLOOM");
  if (hasAnalystQuery && !processed.has("IRONQUERY")) remaining.push("IRONQUERY");
  return remaining;
}

function deterministicFallback(rawInput: unknown, processedAgents: string[]): RoutableAgent {
  const remaining = computeRemainingNeeds(rawInput, processedAgents);
  if (remaining.length > 0) return remaining[0];
  return "END";
}

function appendProcessed(processedAgents: string[], agent: string): string[] {
  const merged = new Set<string>([...processedAgents, agent.toUpperCase()]);
  return Array.from(merged);
}

export async function irongateIngestion(state: SovereignState): Promise<Partial<SovereignState>> {
  const tenantId =
    typeof state.tenant_id === "string" && state.tenant_id.trim().length > 0
      ? state.tenant_id.trim()
      : "00000000-0000-0000-0000-000000000000";
  const rawInput =
    state.raw_payload && typeof state.raw_payload === "object"
      ? (state.raw_payload as Record<string, unknown>)
      : {};
  try {
    const ingress = await IronGate.ingest({
      tenant_id: tenantId,
      source_type: "API",
      raw_data: rawInput,
    });
    const sanitizedRawPayload = sanitizeForGraphState(ingress.data) as Record<string, unknown>;
    const incoming = normalizeThreatCandidates(sanitizedRawPayload);
    const unified = mergeUnifiedRisks(state.unified_risks ?? [], incoming);
    const isSimulationPath = detectSimulationPath(sanitizedRawPayload, unified);
    const mergedMetadata = sanitizeForGraphState(
      (sanitizedRawPayload.metadata as Record<string, unknown> | undefined) ?? {},
    ) as Record<string, unknown>;
    return {
      tenant_id: tenantId,
      raw_payload: sanitizedRawPayload,
      sanitized_metadata: mergedMetadata,
      data_path: isSimulationPath ? "SIMULATION" : "PRODUCTION",
      ledger_blocked: isSimulationPath,
      unified_risks: unified,
      current_agent: "IRONCORE",
      status: unified.length > 0 ? "PROCESSING" : "PENDING",
      agent_logs: [
        `[IRONGATE] Ingestion sanitized and unified. merged_count=${incoming.length} total_unified=${unified.length} path=${isSimulationPath ? "SIMULATION" : "PRODUCTION"} ledger_blocked=${isSimulationPath}`,
      ],
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "ingestion rejected";
    return {
      current_agent: "IRONLOCK",
      status: "QUARANTINED",
      agent_logs: [`[IRONGATE] Ingestion quarantine enforced: ${reason}`],
    };
  }
}

function parseUsdCentsFromText(rawInput: unknown): bigint | null {
  const text = flattenRawInput(rawInput);
  const match = text.match(/\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(usd|dollars?)?/i);
  if (!match?.[1]) return null;
  const normalized = match[1].replace(/,/g, "");
  const [wholePart, fracPart = ""] = normalized.split(".");
  if (!/^\d+$/.test(wholePart) || !/^\d{0,2}$/.test(fracPart)) return null;
  const cents = BigInt(wholePart) * 100n + BigInt((fracPart + "00").slice(0, 2));
  return cents;
}

function parseLitersFromText(rawInput: unknown): bigint | null {
  const text = flattenRawInput(rawInput);
  const match = text.match(/([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)\s*(liters?|litres?|l)\b/i);
  if (!match?.[1]) return null;
  const normalized = match[1].replace(/,/g, "");
  if (!/^\d+$/.test(normalized)) return null;
  return BigInt(normalized);
}

export async function ironcore(state: SovereignState): Promise<Partial<SovereignState>> {
  const rawInput = state.raw_payload ?? {};
  const processedAgents = Array.isArray(state.processed_agents) ? state.processed_agents : [];
  const remainingNeeds = computeRemainingNeeds(rawInput, processedAgents);
  if (remainingNeeds.length === 0) {
    return {
      current_agent: "END",
      status: "COMPLETED",
      agent_logs: ["[IRONCORE_ROUTE] No unprocessed routing work remains. Returning END."],
    };
  }
  const fallback = deterministicFallback(rawInput, processedAgents);

  try {
    const prompt = [
      "You are Ironcore, the primary router for Ironframe's 19-agent workforce.",
      `Workforce: ${WORKFORCE_AGENTS.join(", ")}.`,
      "Classify the payload and return ONLY the next active agent.",
      `Already processed agents (ignore these): ${processedAgents.join(", ") || "none"}.`,
      `Remaining unprocessed requirements (priority order): ${remainingNeeds.join(", ")}.`,
      "If no unprocessed work remains, return END.",
      "Routing policy:",
      "- Physical units (L, liters, kWh, kilometers, CO2e) -> IRONBLOOM",
      "- Monetary/ALE/risk-cents indicators -> IRONTRUST",
      "- Analyst query / investigative question -> IRONQUERY",
      "- Ambiguous, malformed, or unsafe -> IRONLOCK",
      `Fallback path is always ${fallback}.`,
      "Raw input:",
      JSON.stringify(rawInput),
    ].join("\n");

    const { object } = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: classificationSchema,
      prompt,
      temperature: 0,
    });

    const nextAgent = remainingNeeds.length > 0 ? remainingNeeds[0] : fallback;

    return {
      current_agent: nextAgent,
      status: nextAgent === "IRONLOCK" ? "QUARANTINED" : nextAgent === "END" ? "COMPLETED" : "PROCESSING",
      agent_logs: [
        `[IRONCORE_ROUTE] routed to ${nextAgent}. rationale: ${object.rationale}`,
      ],
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "classification failure";
    const safeRoute = fallback === "END" ? "IRONLOCK" : fallback;
    return {
      current_agent: safeRoute,
      status: safeRoute === "IRONLOCK" ? "QUARANTINED" : "PROCESSING",
      agent_logs: [
        `[IRONCORE_ROUTE] routed to ${safeRoute}. rationale: AI classification failed (${reason}); deterministic safe fallback.`,
      ],
    };
  }
}

export async function ironbloom(state: SovereignState): Promise<Partial<SovereignState>> {
  const tenantId =
    typeof state.tenant_id === "string" && state.tenant_id.trim().length > 0
      ? state.tenant_id.trim()
      : "00000000-0000-0000-0000-000000000000";
  const liters = parseLitersFromText(state.raw_payload);
  if (state.ledger_blocked) {
    await log_simulation({
      tenantId,
      botType: "IRONBLOOM",
      disposition: "SIMULATION_PASS",
      metadata: {
        source: "EPIC10_LIVE_FIRE",
        unit: "LITERS",
        quantity: liters?.toString() ?? null,
      },
    });
  } else {
    await log_production({
      action: "IRONBLOOM_INGESTION_ACCEPTED",
      operatorId: "SYSTEM_IRONBLOOM_AUTO",
      justification: `[LITERS] quantity=${liters?.toString() ?? "unknown"}`,
    });
  }

  const nextProcessed = appendProcessed(state.processed_agents ?? [], "IRONBLOOM");
  return {
    current_agent: "IRONCORE",
    status: "PROCESSING",
    processed_agents: nextProcessed,
    agent_logs: ["[IRONBLOOM] Physical telemetry classification accepted."],
  };
}

export async function irontrust(state: SovereignState): Promise<Partial<SovereignState>> {
  const tenantId =
    typeof state.tenant_id === "string" && state.tenant_id.trim().length > 0
      ? state.tenant_id.trim()
      : "00000000-0000-0000-0000-000000000000";
  const parsedCents = parseUsdCentsFromText(state.raw_payload);
  const mitigatedValue = (state.raw_payload as Record<string, unknown> | undefined)?.mitigatedValueCents;
  const mitigatedCents =
    typeof mitigatedValue === "string" && mitigatedValue.trim().length > 0
      ? BigInt(mitigatedValue)
      : parsedCents;

  if (state.ledger_blocked) {
    await log_simulation({
      tenantId,
      botType: "IRONTRUST",
      disposition: "SIMULATION_PASS",
      metadata: {
        source: "EPIC10_LIVE_FIRE",
        financialRisk_cents: parsedCents?.toString() ?? null,
        mitigatedValueCents: mitigatedCents?.toString() ?? null,
      },
    });
  } else {
    await log_production({
      action: "IRONTRUST_FINANCIAL_SCORING",
      operatorId: "SYSTEM_IRONTRUST_AUTO",
      justification: `financialRisk_cents=${parsedCents?.toString() ?? "unknown"} mitigatedValueCents=${mitigatedCents?.toString() ?? "unknown"}`,
    });
  }

  const nextProcessed = appendProcessed(state.processed_agents ?? [], "IRONTRUST");
  return {
    current_agent: "IRONCORE",
    status: "PROCESSING",
    processed_agents: nextProcessed,
    agent_logs: [
      `[IRONTRUST] Financial risk classification accepted${mitigatedValue ? ` (mitigatedValueCents=${String(mitigatedValue)})` : ""}.`,
    ],
  };
}

export async function ironquery(): Promise<Partial<SovereignState>> {
  return {
    current_agent: "END",
    status: "COMPLETED",
    agent_logs: ["[IRONQUERY] Analyst query intake accepted."],
  };
}

export async function ironlock(): Promise<Partial<SovereignState>> {
  return {
    current_agent: "END",
    status: "QUARANTINED",
    agent_logs: ["[IRONLOCK] Ambiguous or unsafe payload quarantined."],
  };
}

export async function threatLifecycle(state: SovereignState): Promise<Partial<SovereignState>> {
  const action = parseLifecycleAction(state.raw_payload);
  const raw = (state.raw_payload ?? {}) as Record<string, unknown>;
  const threatId =
    getString(raw.threatId) ?? getString(raw.threat_id) ?? getString(raw.id) ?? getString(raw.riskId);
  const correlationId = getString(raw.correlationId) ?? getString(raw.correlation_id);
  const nextUnified = [...(state.unified_risks ?? [])];
  const target = nextUnified.find(
    (item) => (threatId && item.id === threatId) || (correlationId && item.correlationId === correlationId),
  );
  const isSimulationPath = (target?.isSimulation ?? false) || state.data_path === "SIMULATION";
  const ledgerBlocked = Boolean(state.ledger_blocked || isSimulationPath);
  const operatorId = getString(raw.operatorId) ?? "SYSTEM_THREAT_LIFECYCLE";
  if (!action) {
    return {
      current_agent: "END",
      status: "COMPLETED",
      agent_logs: ["[THREAT_LIFECYCLE] No lifecycle action provided; no-op."],
    };
  }

  if (action === "DE_ACKNOWLEDGE") {
    for (let i = 0; i < nextUnified.length; i += 1) {
      const item = nextUnified[i];
      if ((threatId && item.id === threatId) || (correlationId && item.correlationId === correlationId)) {
        nextUnified[i] = {
          ...item,
          status: String(ThreatState.DE_ACKNOWLEDGED),
          updatedAt: new Date().toISOString(),
        };
      }
    }
    if (threatId) {
      await prisma.threatEvent.updateMany({
        where: { id: threatId },
        data: { status: ThreatState.DE_ACKNOWLEDGED },
      });
    }
    if (ledgerBlocked) {
      await log_simulation({
        tenantId: state.tenant_id,
        botType: "IRONSCRIBE",
        disposition: "SIMULATION_LOCAL_REVERT",
        threatId: threatId ?? null,
        metadata: { action: "DE_ACKNOWLEDGE", policy: "local-only" },
      });
    } else {
      await log_production({
        action: "SECURITY_EVENT_RE_CLASSIFICATION",
        operatorId,
        threatId: threatId ?? null,
        justification: "De-acknowledge applied as production security event re-classification.",
      });
    }
    return {
      current_agent: "END",
      status: "COMPLETED",
      unified_risks: nextUnified,
      processed_agents: appendProcessed(state.processed_agents ?? [], "THREAT_LIFECYCLE"),
      agent_logs: [
        `[THREAT_LIFECYCLE] DE_ACKNOWLEDGE applied${threatId ? ` for id=${threatId}` : ""}. path=${ledgerBlocked ? "SIMULATION(local)" : "PRODUCTION(ledger)"}`,
      ],
    };
  }

  if (action === "CLAIM") {
    for (let i = 0; i < nextUnified.length; i += 1) {
      const item = nextUnified[i];
      if ((threatId && item.id === threatId) || (correlationId && item.correlationId === correlationId)) {
        nextUnified[i] = { ...item, status: String(ThreatState.ACTIVE), updatedAt: new Date().toISOString() };
      }
    }
    if (!ledgerBlocked) {
      await log_production({
        action: "THREAT_CLAIMED",
        operatorId,
        threatId: threatId ?? null,
        justification: "Lifecycle claim executed.",
      });
    } else {
      await log_simulation({
        tenantId: state.tenant_id,
        botType: "IRONSCRIBE",
        disposition: "SIMULATION_CLAIM",
        threatId: threatId ?? null,
        metadata: { action: "CLAIM", policy: "ledger-blocked" },
      });
    }
    return {
      current_agent: "END",
      status: "COMPLETED",
      unified_risks: nextUnified,
      processed_agents: appendProcessed(state.processed_agents ?? [], "THREAT_LIFECYCLE"),
      agent_logs: [`[THREAT_LIFECYCLE] CLAIM applied${threatId ? ` for id=${threatId}` : ""}. ledger_blocked=${ledgerBlocked}`],
    };
  }

  if (action === "RESOLVE") {
    for (let i = 0; i < nextUnified.length; i += 1) {
      const item = nextUnified[i];
      if ((threatId && item.id === threatId) || (correlationId && item.correlationId === correlationId)) {
        nextUnified[i] = { ...item, status: String(ThreatState.RESOLVED), updatedAt: new Date().toISOString() };
      }
    }
    if (threatId) {
      await prisma.threatEvent.updateMany({
        where: { id: threatId },
        data: { status: ThreatState.RESOLVED },
      });
    }
    if (!ledgerBlocked) {
      await log_production({
        action: "THREAT_RESOLVED",
        operatorId,
        threatId: threatId ?? null,
        justification: "Lifecycle resolve executed.",
      });
    } else {
      await log_simulation({
        tenantId: state.tenant_id,
        botType: "IRONSCRIBE",
        disposition: "SIMULATION_RESOLVE",
        threatId: threatId ?? null,
        metadata: { action: "RESOLVE", policy: "ledger-blocked" },
      });
    }
    return {
      current_agent: "END",
      status: "COMPLETED",
      unified_risks: nextUnified,
      processed_agents: appendProcessed(state.processed_agents ?? [], "THREAT_LIFECYCLE"),
      agent_logs: [`[THREAT_LIFECYCLE] RESOLVE applied${threatId ? ` for id=${threatId}` : ""}. ledger_blocked=${ledgerBlocked}`],
    };
  }

  const retained = nextUnified.filter(
    (item) => !((threatId && item.id === threatId) || (correlationId && item.correlationId === correlationId)),
  );
  if (!ledgerBlocked) {
    await log_production({
      action: "THREAT_VOIDED",
      operatorId,
      threatId: threatId ?? null,
      justification: "Lifecycle void executed.",
    });
  } else {
    await log_simulation({
      tenantId: state.tenant_id,
      botType: "IRONSCRIBE",
      disposition: "SIMULATION_VOID",
      threatId: threatId ?? null,
      metadata: { action: "VOID", policy: "ledger-blocked" },
    });
  }
  return {
    current_agent: "END",
    status: "COMPLETED",
    unified_risks: retained,
    processed_agents: appendProcessed(state.processed_agents ?? [], "THREAT_LIFECYCLE"),
    agent_logs: [
      `[THREAT_LIFECYCLE] VOID applied${threatId ? ` for id=${threatId}` : ""}. path=${ledgerBlocked ? "SIMULATION(local)" : "PRODUCTION(ledger)"}`,
    ],
  };
}

