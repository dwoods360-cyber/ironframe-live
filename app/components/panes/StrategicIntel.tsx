'use client';
import React from 'react';
import type { Company } from '@/app/types/domain';

type Props = {
  company: Company;
  onThreatClick: (t: string) => void;

  // Optional props (so Dashboard doesn't have to pass them yet)
  ttlSeconds?: number;
  ttlInput?: string;
  setTtlInput?: React.Dispatch<React.SetStateAction<string>>;
  handleSetTtl?: () => void;

  // add placeholders for any other required props you previously had
  // (kept optional to avoid build breaks while iterating)
  [key: string]: Record<string, unknown>;
};

export default function StrategicIntel({
  company,
  onThreatClick,
  ttlSeconds = 0,
  ttlInput = '',
  setTtlInput,
  handleSetTtl,
}: Props) {
  // minimal safe UI — keep your real UI later
  const threats = [
    'Ransomware campaign',
    'Third-party breach',
    'Cloud misconfig',
    'Insider risk',
    'Supply-chain compromise',
  ];

  return (
    <div style={{ padding: 12, background: '#0f141a', height: '100%', overflow: 'auto' }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: '#c9d1d9' }}>
        Strategic Intel — {company?.name ?? 'Company'}
      </div>

      {/* Optional TTL controls (won't crash if not wired yet) */}
      <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: '#8b949e' }}>TTL:</div>
        <input
          value={ttlInput}
          onChange={(e) => setTtlInput?.(e.target.value)}
          placeholder="e.g., 3600"
          style={{
            flex: 1,
            padding: '6px 8px',
            borderRadius: 6,
            border: '1px solid #30363d',
            background: '#161b22',
            color: '#c9d1d9',
            fontSize: 11,
          }}
        />
        <button
          onClick={() => handleSetTtl?.()}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #30363d',
            background: '#21262d',
            color: '#c9d1d9',
            fontSize: 11,
            cursor: handleSetTtl ? 'pointer' : 'not-allowed',
            opacity: handleSetTtl ? 1 : 0.6,
          }}
          disabled={!handleSetTtl}
        >
          Set
        </button>
        <div style={{ fontSize: 11, color: '#8b949e' }}>{ttlSeconds ? `${ttlSeconds}s` : ''}</div>
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: '#8b949e' }}>Suggested threats</div>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {threats.map((t) => (
          <button
            key={t}
            onClick={() => onThreatClick(t)}
            style={{
              textAlign: 'left',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #30363d',
              background: '#161b22',
              color: '#c9d1d9',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
