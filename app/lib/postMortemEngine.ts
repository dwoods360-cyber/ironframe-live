/**
 * Post-mortem analysis over Prisma `AuditLog` + `BotAuditLog` for the active tenant window.
 * Extracts `attack_vector` from JSON justifications and bot metadata when present.
 */

import prisma from "@/lib/prisma";

export type PostMortemTopThreat = {
  threatId: string;
  title: string;
  eventCount: number;
};

export type PostMortemTopVector = {
  vector: string;
  count: number;
};

export type PostMortemAgentMvp = {
  label: string;
  resolveCount: number;
};

export type PostMortemSummary = {
  tenantUuid: string;
  lookbackHours: number;
  windowStartIso: string;
  windowEndIso: string;
  auditRowSampled: number;
  topAttackVectors: PostMortemTopVector[];
  topThreats: PostMortemTopThreat[];
  agentMvp: PostMortemAgentMvp | null;
  dominantVector: string | null;
};

/** Heuristic labels when explicit JSON fields are absent (description / justification scan). */
const VECTOR_KEYWORDS: readonly { needle: string; label: string }[] = [
  { needle: "lateral", label: "Lateral Movement" },
  { needle: "privilege", label: "Privilege Escalation" },
  { needle: "phish", label: "Phishing" },
  { needle: "credential stuff", label: "Credential Stuffing" },
  { needle: "ransom", label: "Ransomware" },
  { needle: "supply chain", label: "Supply-Chain Compromise" },
  { needle: "insider", label: "Insider Threat" },
  { needle: "ddos", label: "Denial of Service" },
  { needle: "exfil", label: "Data Exfiltration" },
];

function extractAttackVectorsFromText(raw: string | null | undefined): string[] {
  const s = (raw ?? "").trim();
  if (!s) return [];
  const lower = s.toLowerCase();
  const found = new Set<string>();

  try {
    const j = JSON.parse(s) as Record<string, unknown>;
    const av =
      j.attack_vector ??
      j.attackVector ??
      (typeof j.metadata === "object" && j.metadata && !Array.isArray(j.metadata)
        ? (j.metadata as Record<string, unknown>).attack_vector ??
          (j.metadata as Record<string, unknown>).attackVector
        : undefined);
    if (typeof av === "string" && av.trim()) found.add(av.trim());

    const nested = j.bot_metadata ?? j.botMetadata;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const nm = (nested as Record<string, unknown>).attack_vector;
      if (typeof nm === "string" && nm.trim()) found.add(nm.trim());
    }
  } catch {
    /* not JSON — fall through to keyword scan */
  }

  for (const { needle, label } of VECTOR_KEYWORDS) {
    if (lower.includes(needle)) found.add(label);
  }

  return [...found];
}

function tallyMap(map: Map<string, number>, key: string, delta = 1): void {
  const k = key.trim();
  if (!k) return;
  map.set(k, (map.get(k) ?? 0) + delta);
}

/**
 * Server-only: session-scoped post-mortem over audit rows for `tenantUuid`.
 * @param lookbackHours — sliding window ending now (default 24).
 */
export async function getPostMortemSummary(
  tenantUuid: string,
  lookbackHours = 24,
): Promise<PostMortemSummary> {
  const end = new Date();
  const start = new Date(end.getTime() - lookbackHours * 60 * 60 * 1000);

  const companies = await prisma.company.findMany({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });
  const companyIds = companies.map((c) => c.id);

  const [auditRows, botRows, threatTitles] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        tenantId: tenantUuid,
        createdAt: { gte: start, lte: end },
        OR: [
          { isSimulation: true },
          { operatorId: { contains: "BOT", mode: "insensitive" } },
          { action: { contains: "THREAT", mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        action: true,
        threatId: true,
        justification: true,
        operatorId: true,
        createdAt: true,
      },
      take: 400,
      orderBy: { createdAt: "desc" },
    }),
    prisma.botAuditLog.findMany({
      where: { tenantId: tenantUuid, createdAt: { gte: start, lte: end } },
      select: { metadata: true },
      take: 200,
      orderBy: { createdAt: "desc" },
    }),
    companyIds.length === 0
      ? Promise.resolve([] as { id: string; title: string }[])
      : prisma.threatEvent.findMany({
          where: {
            tenantCompanyId: { in: companyIds },
            updatedAt: { gte: start },
          },
          select: { id: true, title: true },
          take: 300,
        }),
  ]);

  const vectorTally = new Map<string, number>();
  const threatTally = new Map<string, number>();
  const resolverTally = new Map<string, number>();

  for (const row of auditRows) {
    for (const v of extractAttackVectorsFromText(row.justification)) {
      tallyMap(vectorTally, v);
    }
    if (row.threatId?.trim()) {
      tallyMap(threatTally, row.threatId.trim());
    }
    if ((row.action ?? "").toUpperCase() === "THREAT_RESOLVED") {
      const op = (row.operatorId ?? "").trim();
      if (op) {
        tallyMap(resolverTally, op, 1);
      } else {
        try {
          const j = JSON.parse(row.justification ?? "{}") as { actor?: string };
          if (typeof j.actor === "string" && j.actor.trim()) {
            tallyMap(resolverTally, j.actor.trim(), 1);
          }
        } catch {
          /* ignore */
        }
      }
    }
  }

  for (const b of botRows) {
    const meta = b.metadata;
    if (meta && typeof meta === "object" && !Array.isArray(meta)) {
      const m = meta as Record<string, unknown>;
      const av = m.attack_vector ?? m.attackVector;
      if (typeof av === "string" && av.trim()) tallyMap(vectorTally, av.trim());
    }
  }

  const titleById = new Map(threatTitles.map((t) => [t.id, t.title ?? "—"]));

  const topThreats: PostMortemTopThreat[] = [...threatTally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([threatId, eventCount]) => ({
      threatId,
      title: titleById.get(threatId) ?? threatId.slice(0, 8) + "…",
      eventCount,
    }));

  const topAttackVectors: PostMortemTopVector[] = [...vectorTally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([vector, count]) => ({ vector, count }));

  let agentMvp: PostMortemAgentMvp | null = null;
  for (const [label, resolveCount] of resolverTally.entries()) {
    if (!agentMvp || resolveCount > agentMvp.resolveCount) {
      agentMvp = { label, resolveCount };
    }
  }

  const dominantVector = topAttackVectors[0]?.vector ?? null;

  return {
    tenantUuid,
    lookbackHours,
    windowStartIso: start.toISOString(),
    windowEndIso: end.toISOString(),
    auditRowSampled: auditRows.length,
    topAttackVectors,
    topThreats,
    agentMvp,
    dominantVector,
  };
}
