'use client';

import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';

export default function RiskEngine() {
  const [activeThreats, setActiveThreats] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="p-6 bg-slate-900 animate-pulse rounded-xl border border-slate-800">Initializing...</div>;

  const toggleThreat = (id: string) => {
    setActiveThreats(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4">
          Top Sector Threats
        </label>
        <div className="space-y-3">
          {['ransomware', 'breach'].map((id) => {
            const isRegistered = activeThreats.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleThreat(id)}
                className={`w-full flex justify-between items-center p-4 rounded-lg border transition-all duration-300 ${
                  isRegistered
                    ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30"
                    : "border-slate-800 bg-slate-950 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-3 pointer-events-none">
                  {isRegistered ? <CheckCircle2 className="text-emerald-400" size={18} /> : <Zap className="text-blue-500" size={18} />}
                  <span className={`font-bold text-xs uppercase ${isRegistered ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {id}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
