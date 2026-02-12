'use client';
import React from 'react';

type Props = {
  activeRisks: unknown[];
  onRiskClick: (risk: unknown) => void;
};

export default function ActiveRisks({ activeRisks, onRiskClick }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {activeRisks.map((risk: unknown, idx: number) => (
        <div key={idx} onClick={() => onRiskClick(risk)} style={{ cursor: 'pointer', padding: '10px', background: '#161b22', border: '1px solid #30363d', borderRadius: '4px' }}>
          {String(risk)}
        </div>
      ))}
    </div>
  );
}
