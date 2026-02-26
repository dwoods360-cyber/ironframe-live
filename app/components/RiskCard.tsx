import React from 'react';

interface RiskCardProps {
  label: string;
  amountCents: bigint | number;
  baselineCents: bigint | number;
  type: 'MEDSHIELD' | 'VAULTBANK' | 'GRIDCORE';
}

export default function RiskCard({ label, amountCents, baselineCents, type }: RiskCardProps) {
  const amount = Number(amountCents) / 100;
  const baseline = Number(baselineCents) / 100;
  const variance = amount - baseline;
  const isCritical = variance > 0;

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <div className={`p-6 rounded-xl border ${
      isCritical ? 'bg-red-950/20 border-red-900/50' : 'bg-emerald-950/20 border-emerald-900/50'
    }`}>
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
