import React from 'react';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

interface RiskCardProps {
  label: string;
  amountCents: bigint | number;
  baselineCents: bigint | number;
  type: 'MEDSHIELD' | 'VAULTBANK' | 'GRIDCORE';
  assignee?: string | null;
  section?: string;
  status?: string;
  risk?: {
    assigneeId?: string | null;
    status?: string;
  };
}

export default function RiskCard({
  label,
  amountCents,
  baselineCents,
  type,
  assignee,
  section,
  status,
  risk,
}: RiskCardProps) {
  const amount = Number(amountCents) / 100;
  const baseline = Number(baselineCents) / 100;
  const variance = amount - baseline;
  const isCritical = variance > 0;
  const assigneeId = risk?.assigneeId ?? assignee;
  const statusValue = risk?.status ?? status ?? section;
  const isUnassigned = !assigneeId || String(assigneeId).trim() === '';
  const isActiveRisk = statusValue === 'ACTIVE_RISKS';

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <div
      className={cn(
        'p-6 rounded-xl border transition-all duration-300',
        isCritical ? 'bg-red-950/20 border-red-900/50' : 'bg-emerald-950/20 border-emerald-900/50',
        isActiveRisk &&
          isUnassigned &&
          'animate-pulse border-2 border-red-600 bg-red-500/20 shadow-[0_0_15px_rgba(220,38,38,0.6)]',
      )}
      data-testid="risk-card"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">{type} Protocol</p>
          <h3 className="text-lg font-bold text-slate-100">{label}</h3>
        </div>
        <div className={`px-2 py-1 rounded text-[10px] font-bold ${
          isCritical ? 'bg-red-500 text-red-950' : 'bg-emerald-500 text-emerald-950'
        }`}>
          {isCritical ? 'CRITICAL' : 'SECURE'}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Current ALE:</span>
          <span className="font-mono text-slate-100">{formatter.format(amount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Baseline:</span>
          <span className="font-mono text-slate-400">{formatter.format(baseline)}</span>
        </div>
        <div className="pt-2 mt-2 border-t border-slate-800 flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-300">Variance:</span>
          <span className={`font-mono font-bold ${isCritical ? 'text-red-400' : 'text-emerald-400'}`}>
            {variance > 0 ? '+' : ''}{formatter.format(variance)}
          </span>
        </div>
      </div>
    </div>
  );
}
