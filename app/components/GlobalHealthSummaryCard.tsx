import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function GlobalHealthSummaryCard() {
  const companies = await prisma.company.findMany({
    include: { risks: true, policies: true }
  });

  // 1. Calculate Real Violations
  const activeViolations = companies.reduce((sum, company) => 
    sum + company.risks.filter(r => r.status === 'ACTIVE').length + 
          company.policies.filter(p => p.status === 'GAP DETECTED').length
  , 0);

  // 2. Calculate Real Revenue Impact from cents (convert to USD for display)
  const potentialRevenueImpactUsd = companies.reduce((sum, company) => {
    const hasActiveThreat = company.risks.some(r => r.status === 'ACTIVE') || company.policies.some(p => p.status === 'GAP DETECTED');
    if (hasActiveThreat && company.industry_avg_loss_cents != null) {
      return sum + Number(company.industry_avg_loss_cents) / 100; // Cents → USD
    }
    return sum;
  }, 0);

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
              ${(potentialRevenueImpactUsd / 1000000).toFixed(1)}M
            </span>
            <span className="text-xs text-slate-500">ALE AT RISK</span>
          </div>
        </div>

      </div>
    </div>
  );
}