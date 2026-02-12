'use client';
import React from 'react';

type Props = {
  tenant: string;
  view: string;
  selectedThreat: Record<string, unknown> | null;
};

export default function AnalystView({ tenant, view, selectedThreat }: Props) {
  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #30363d', paddingBottom: '15px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900 }}>ANALYST_WORKSPACE: {tenant}</h3>
        <p style={{ color: '#8b949e', fontSize: '12px', marginTop: '4px' }}>VIEW_MODE: {view}</p>
      </div>

      {selectedThreat ? (
        <div style={{ background: '#161b22', border: '1px solid #30363d', padding: '20px', borderRadius: '6px' }}>
          <h4 style={{ color: '#58a6ff', margin: '0 0 10px 0' }}>ACTIVE_INTEL_FOCUS</h4>
          <div style={{ fontSize: '13px' }}>{selectedThreat.title || 'Inbound Threat Vector'}</div>
        </div>
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e', border: '1px dashed #30363d', borderRadius: '6px' }}>
          SELECT THREAT FROM LEFT PANE TO INITIALIZE ANALYSIS
        </div>
      )}
    </div>
  );
}
