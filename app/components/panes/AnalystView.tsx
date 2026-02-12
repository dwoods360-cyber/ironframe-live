'use client';
import React from 'react';

interface Threat {
  title: string;
  description?: string;
}

type Props = {
  selectedThreat?: Threat | null;
  [key: string]: any;
};

export default function AnalystView({ selectedThreat }: Props) {
  return (
    <div style={{ padding: '20px', background: '#0d1117', height: '100%' }}>
      {selectedThreat ? (
        <div style={{ background: '#161b22', border: '1px solid #30363d', padding: '20px', borderRadius: '6px' }}>
          <h4 style={{ color: '#58a6ff', margin: '0 0 10px 0' }}>ACTIVE_INTEL_FOCUS</h4>
          <div style={{ fontSize: '13px', color: '#c9d1d9' }}>
            {selectedThreat.title || 'Inbound Threat Vector'}
          </div>
        </div>
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e', border: '1px dashed #30363d', borderRadius: '6px' }}>
          Select a threat to analyze
        </div>
      )}
    </div>
  );
}
