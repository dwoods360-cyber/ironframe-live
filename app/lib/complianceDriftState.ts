import "server-only";

import { createHash } from "crypto";
import prisma from "@/lib/prisma";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import type {
  ComplianceDriftState,
  RegulatoryDriftAlert,
  RegulatoryHorizonItem,
} from "@/app/types/complianceDrift";

const DRIFT_STATE_AGENT = "ironsight-regulatory-poll-state";

const DEFAULT_HORIZONS: RegulatoryHorizonItem[] = [
  {
    id: "sec-reg-sp-2026",
    label: "SEC Reg S-P amendments (breach notification)",
    deadline: "2026-06-01T00:00:00.000Z",
    authority: "SEC",
    frameworkRef: "Reg S-P / Incident Response",
    daysRemaining: 0,
  },
  {
    id: "co-sb24-205",
    label: "Colorado SB24-205 (AI governance)",
    deadline: "2026-02-01T00:00:00.000Z",
    authority: "Colorado",
    frameworkRef: "SB24-205",
    daysRemaining: 0,
  },
  {
    id: "nist-csf-2",
    label: "NIST CSF 2.0 organizational profile refresh",
    deadline: "2026-09-30T00:00:00.000Z",
    authority: "NIST",
    frameworkRef: "CSF 2.0",
    daysRemaining: 0,
  },
];

function refreshHorizonDays(horizons: RegulatoryHorizonItem[]): RegulatoryHorizonItem[] {
  const now = Date.now();
  return horizons.map((h) => {
    const ms = Date.parse(h.deadline) - now;
    const daysRemaining = Math.ceil(ms / (24 * 60 * 60 * 1000));
    return { ...h, daysRemaining };
  });
}

const DEFAULT_STATE: ComplianceDriftState = {
  lastPollAt: null,
  horizons: refreshHorizonDays(DEFAULT_HORIZONS),
  alerts: [],
  pollStats: { sourcesPolled: 0, itemsScanned: 0, keywordsMatched: 0, newAlerts: 0 },
};

function parseState(raw: unknown): ComplianceDriftState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as ComplianceDriftState;
  if (!Array.isArray(o.alerts) || !Array.isArray(o.horizons)) return null;
  return {
    ...DEFAULT_STATE,
    ...o,
    horizons: refreshHorizonDays(o.horizons.length ? o.horizons : DEFAULT_HORIZONS),
    alerts: o.alerts,
  };
}

export function readComplianceDriftStateSync(): ComplianceDriftState {
  return DEFAULT_STATE;
}

export async function readComplianceDriftState(): Promise<ComplianceDriftState> {
  try {
    const prismaAny = prisma as any;
    const row = await prismaAny.cronJobArtifact.findFirst({
      where: {
        tenantId: TENANT_UUIDS.medshield,
        agentName: DRIFT_STATE_AGENT,
      },
      orderBy: {
        runTimestamp: "desc",
      },
      select: {
        payloadJson: true,
      },
    });
    const payload = row?.payloadJson;
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const state = (payload as { state?: unknown }).state;
      const parsed = parseState(state);
      if (parsed) return parsed;
    }
  } catch {
    // Fail-open to default state.
  }
  return DEFAULT_STATE;
}

export async function writeComplianceDriftState(state: ComplianceDriftState): Promise<void> {
  const next: ComplianceDriftState = {
    ...state,
    horizons: refreshHorizonDays(state.horizons.length ? state.horizons : DEFAULT_HORIZONS),
  };
  const prismaAny = prisma as any;
  await prismaAny.cronJobArtifact.create({
    data: {
      tenantId: TENANT_UUIDS.medshield,
      agentName: DRIFT_STATE_AGENT,
      payloadJson: {
        state: next,
      },
    },
  });
}

export function stableRegulatoryItemId(source: string, title: string, link: string): string {
  return createHash("sha256").update(`${source}|${title}|${link}`, "utf8").digest("hex").slice(0, 16);
}

export function mergeDriftAlerts(
  existing: RegulatoryDriftAlert[],
  incoming: RegulatoryDriftAlert[],
): RegulatoryDriftAlert[] {
  const byId = new Map(existing.map((a) => [a.id, a]));
  for (const alert of incoming) {
    const prev = byId.get(alert.id);
    if (prev && prev.status !== "ACTIVE") {
      byId.set(alert.id, { ...alert, status: prev.status, amendmentDraftId: prev.amendmentDraftId });
    } else {
      byId.set(alert.id, alert);
    }
  }
  return [...byId.values()].sort(
    (a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt),
  );
}

export function activeDriftAlerts(state: ComplianceDriftState): RegulatoryDriftAlert[] {
  return state.alerts.filter((a) => a.status === "ACTIVE" && a.isDriftDetected);
}
