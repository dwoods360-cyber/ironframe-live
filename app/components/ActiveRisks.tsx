import prisma from "@/lib/prisma";
import ActiveRisksClient from './ActiveRisksClient';

// Baseline seed titles to exclude (full purge / waiting-state flow)
const EXCLUDED_BASELINE_RISK_TITLES = new Set([
  'Schneider Electric SCADA Vulnerability',
  'Azure Health API Exposure',
  'Palo Alto Firewall Misconfiguration',
]);

export default async function ActiveRisks() {
  // 1. Fetch live Zero-Debt Data directly from the Core Vault.
  // Select only columns that exist (omit isSimulation so UI renders if column is missing).
  const [risks, threatEvents] = await Promise.all([
    prisma.activeRisk.findMany({
      select: {
        id: true,
        company_id: true,
        title: true,
        status: true,
        score_cents: true,
        source: true,
        company: { select: { name: true, sector: true } },
      },
      orderBy: {
        score_cents: 'desc',
      },
    }),
    prisma.threatEvent.findMany({
      select: { id: true, title: true, sourceAgent: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  // Exclude baseline purge titles so they never appear in ACTIVE RISKS
  const filteredRisks = risks.filter((r) => !EXCLUDED_BASELINE_RISK_TITLES.has(r.title));

  const normalize = (value: string) => value.trim().toLowerCase();
  const threatByCompositeKey = new Map<string, string>();
  for (const t of threatEvents) {
    const key = `${normalize(t.title)}::${normalize(t.sourceAgent)}`;
    if (!threatByCompositeKey.has(key)) {
      threatByCompositeKey.set(key, t.id);
    }
  }
  const threatByTitle = new Map<string, string>();
  for (const t of threatEvents) {
    const key = normalize(t.title);
    if (!threatByTitle.has(key)) {
      threatByTitle.set(key, t.id);
    }
  }

  // Serialize for client (BigInt -> string, etc.); default isSimulation to false when column not selected
  const serialized = filteredRisks.map((risk) => ({
    id: risk.id.toString(),
    title: risk.title,
    source: risk.source,
    threatId:
      threatByCompositeKey.get(`${normalize(risk.title)}::${normalize(risk.source)}`) ??
      threatByTitle.get(normalize(risk.title)) ??
      null,
    score_cents: Number(risk.score_cents),
    company: { name: risk.company.name, sector: risk.company.sector },
    isSimulation: false,
  }));

  return <ActiveRisksClient risks={serialized} />;
}
