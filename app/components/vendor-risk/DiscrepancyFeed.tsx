'use client';
import React from 'react';

type Discrepancy = {
  doc: string;
  req: string;
  tenant: string;
  vendor: string;
};

type Props = {
  activeDiscrepancies?: Discrepancy[];
};

export default function DiscrepancyFeed({ activeDiscrepancies = [] }: Props) {
  return (
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '6px', padding: '20px' }}>
      <h4 style={{ fontSize: '14px', color: '#ecc94b', margin: 0, fontWeight: 900 }}>AGENT_DISCREPANCY_FEED</h4>
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1.5fr 1fr 1.5fr 1.5fr 1fr', 
          gap: '20px', 
          fontSize: '10px', 
          color: '#718096', 
          borderBottom: '1px solid #30363d', 
          paddingBottom: '15px', 
          marginBottom: '15px', 
          fontWeight: 800 
        }}>
          <div>DOCUMENT</div><div>REQUIREMENT</div><div>TENANT_STANDARD</div><div>VENDOR_PROPOSED</div><div>ACTION</div>
        </div>
        {activeDiscrepancies.length > 0 ? (
          activeDiscrepancies.map((d, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr 1.5fr 1fr', gap: '20px', fontSize: '11px', marginBottom: '12px' }}>
              <div style={{ color: '#e6edf3' }}>{d.doc}</div>
              <div style={{ color: '#8b949e' }}>{d.req}</div>
              <div style={{ color: '#f85149' }}>{d.tenant}</div>
              <div style={{ color: '#3fb950' }}>{d.vendor}</div>
              <div style={{ color: '#58a6ff', cursor: 'pointer' }}>RESOLVE</div>
            </div>
          ))
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#8b949e', fontSize: '12px' }}>No active discrepancies detected.</div>
        )}
      </div>
    </div>
  );
}
