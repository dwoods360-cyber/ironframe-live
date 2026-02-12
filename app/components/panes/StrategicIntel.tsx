'use client';
import React from 'react';
import type { Company } from '@/app/types/domain';

type Props = {
  company: Company;
  onThreatClick: (t: string) => void;

  // Optional props
  ttlSeconds?: number;
  ttlInput?: string;
  setTtlInput?: React.Dispatch<React.SetStateAction<string>>;
  handleSetTtl?: () => void;

  // FIX: Using any here allows functions like onThreatClick to coexist with the index signature
  [key: string]: any;
};

export default function StrategicIntel({
  company,
  onThreatClick,
  ttlSeconds = 0,
  ttlInput = '',
  setTtlInput,
  handleSetTtl,
}: Props) {
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
      <div style={{ marginTop: 10 }}>
        {threats.map((threat) => (
          <div 
            key={threat}
            onClick={() => onThreatClick(threat)}
            style={{ 
              padding: '4px 8px', 
              fontSize: 11, 
              color: '#58a6ff', 
              cursor: 'pointer',
              borderBottom: '1px solid #30363d'
            }}
          >
            {threat}
          </div>
        ))}
      </div>
    </div>
  );
}
