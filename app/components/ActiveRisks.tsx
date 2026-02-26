import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function ActiveRisks() {
  // 1. Fetch live Zero-Debt Data directly from the Core Vault
  const risks = await prisma.activeRisk.findMany({
    include: {
      company: true, // Pull in the Tier 1 Client Organization data
    },
    orderBy: {
      score_cents: 'desc', // Sort by highest fidelity threat first
    }
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-200">Active Threats & Risks</h2>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
          {risks.length} Live Findings
        </span>
      </div>

      <div className="space-y-3">
        {risks.map((risk) => (
          <div 
            key={risk.id.toString()} // Convert BigInt to string for React
            className="group flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-blue-500/50"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-200">{risk.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Target: <span className="text-slate-400">{risk.company.name}</span> ({risk.company.sector})
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-xs font-bold ${Number(risk.score_cents) > 80 ? 'text-red-400' : 'text-amber-400'}`}>
                  Score: {Number(risk.score_cents)}
                </span>
                <span className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
                  SRC: {risk.source}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {risks.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
            No active risks detected in the Core Vault.
          </div>
        )}
      </div>
    </div>
  );
}