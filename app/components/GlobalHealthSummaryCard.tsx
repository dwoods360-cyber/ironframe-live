import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface GlobalHealthSummaryCardProps {
  activeViolations: number;
  potentialRevenueImpact: number;
  coreintelTrendActive: boolean;
}

export default async function GlobalHealthSummaryCard({
  activeViolations,
  potentialRevenueImpact,
  coreintelTrendActive,
}: GlobalHealthSummaryCardProps) {
  const companies = await prisma.company.findMany({
    include: { risks: true, policies: true }
  });

  return (
    <div className="border-b border-slate-800 bg-slate-900/30 p-6">
      <div className="grid grid-cols-3 gap-6">
        
        {/* Metric 1: Protected Organizations */}
        <div className="flex flex-col">
          <span className="text-xs tracking-wider text-slate-500 uppercase">Protected Tenants</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-light text-slate-200">{companies.length}</span>
            <span className="text-xs text-emerald-400">100% ONLINE</span>
          </div>
        </div>

        {/* Metric 2: Active Violations */}
        <div className="flex flex-col border-l border-slate-800 pl-6">
          <span className="text-xs tracking-wider text-slate-500 uppercase">Active Violations</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-light text-slate-200">{activeViolations}</span>
            <span className="text-xs text-amber-400">REQUIRES TRIAGE</span>
          </div>
        </div>

        {/* Metric 3: Financial Exposure */}
        <div className="flex flex-col border-l border-slate-800 pl-6">
          <span className="text-xs tracking-wider text-slate-500 uppercase">Liability Exposure (USD)</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-light text-red-400">
              ${(potentialRevenueImpact / 1000000).toFixed(1)}M
            </span>
            <span className="text-xs text-slate-500">{coreintelTrendActive ? 'COREINTEL TRENDING' : 'ALE AT RISK'}</span>
          </div>
        </div>

      </div>
    </div>
  );
}