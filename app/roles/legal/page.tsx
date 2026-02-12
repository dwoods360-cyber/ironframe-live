'use client';

import React, { useMemo, useState } from 'react';

type Metric = { label: string; value: string; note?: string };

export default function LegalPage() {
  // Placeholder metrics (wire to Supabase later)
  const [metrics] = useState<Metric[]>([
    { label: 'Open legal holds', value: '3', note: 'Last 30 days' },
    { label: 'Contract reviews', value: '12', note: 'In queue' },
    { label: 'Policy exceptions', value: '2', note: 'Pending approval' },
    { label: 'Regulatory inquiries', value: '0' },
  ]);

  const rows = useMemo(() => metrics, [metrics]);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Legal</h1>
      <p style={{ opacity: 0.75, marginBottom: 18 }}>
        Placeholder page to keep builds green. Wire data + actions later.
      </p>

      <div style={{ border: '1px solid #2d3139', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '10px 12px', background: '#111318' }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Metric</div>
          <div style={{ fontSize: 12, opacity: 0.8, textAlign: 'right' }}>Value</div>
        </div>

        {rows.map((m) => (
          <div
            key={m.label}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              padding: '12px',
              borderTop: '1px solid #2d3139',
              background: '#0b0d10',
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</div>
              {m.note ? <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{m.note}</div> : null}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, textAlign: 'right' }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
