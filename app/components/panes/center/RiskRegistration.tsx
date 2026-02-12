'use client';
import React, { useMemo, useState } from 'react';
import type { Risk } from '@/app/types/domain';

export type RiskRegistrationProps = {
  risks?: Risk[];
  onAction?: (riskId: number, action: string, note?: string, newScore?: number) => void | Promise<void>;
  onAddRisk?: (title: string, likelihood?: string, impact?: string) => void | Promise<void>;

  // forward-compat
  [key: string]: Record<string, unknown>;
};

export default function RiskRegistration({ risks = [], onAction, onAddRisk }: RiskRegistrationProps) {
  const [title, setTitle] = useState('');
  const [likelihood, setLikelihood] = useState('');
  const [impact, setImpact] = useState('');

  const registrationCount = useMemo(
    () => risks.filter((r: Record<string, unknown>) => r?.status === 'REGISTRATION').length,
    [risks]
  );

  return (
    <div style={{ padding: 10, borderBottom: '1px solid #2d3139', background: '#0d1117' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#c9d1d9' }}>Risk Registration</div>
      <div style={{ marginTop: 6, fontSize: 11, color: '#8b949e' }}>
        {registrationCount} in registration
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New risk title…"
          style={{
            padding: '6px 8px',
            borderRadius: 6,
            border: '1px solid #30363d',
            background: '#161b22',
            color: '#c9d1d9',
            fontSize: 11,
            minWidth: 220,
          }}
        />
        <input
          value={likelihood}
          onChange={(e) => setLikelihood(e.target.value)}
          placeholder="likelihood"
          style={{
            padding: '6px 8px',
            borderRadius: 6,
            border: '1px solid #30363d',
            background: '#161b22',
            color: '#c9d1d9',
            fontSize: 11,
            width: 110,
          }}
        />
        <input
          value={impact}
          onChange={(e) => setImpact(e.target.value)}
          placeholder="impact"
          style={{
            padding: '6px 8px',
            borderRadius: 6,
            border: '1px solid #30363d',
            background: '#161b22',
            color: '#c9d1d9',
            fontSize: 11,
            width: 110,
          }}
        />

        <button
          onClick={() => {
            const t = title.trim();
            if (!t) return;
            void onAddRisk?.(t, likelihood || undefined, impact || undefined);
            setTitle('');
            setLikelihood('');
            setImpact('');
          }}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #30363d',
            background: '#21262d',
            color: '#c9d1d9',
            fontSize: 11,
            cursor: onAddRisk ? 'pointer' : 'not-allowed',
            opacity: onAddRisk ? 1 : 0.6,
          }}
          disabled={!onAddRisk}
        >
          Add
        </button>

        <button
          onClick={() => {
            // optional demo action; harmless if not wired
            void onAction?.(0, 'PENDING_SOC', 'Queued for SOC review');
          }}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #30363d',
            background: '#21262d',
            color: '#c9d1d9',
            fontSize: 11,
            cursor: onAction ? 'pointer' : 'not-allowed',
            opacity: onAction ? 1 : 0.6,
          }}
          disabled={!onAction}
        >
          Demo SOC queue
        </button>
      </div>
    </div>
  );
}
