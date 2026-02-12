'use client';

import React, { useMemo } from 'react';

type DocItem = {
  id?: string;
  name?: string;
  type?: string;
  createdAt?: string;
  [k: string]: unknown;
};

type Props = {
  documents?: DocItem[] | null;
};

export default function DocumentList({ documents }: Props) {
  const items = useMemo(() => (documents ?? []) as DocItem[], [documents]);
  const isLoading = documents == null;

  return (
    <div style={{ background: '#111318', border: '1px solid #2d3139', borderRadius: '10px', padding: '16px' }}>
      <div style={{ fontSize: '12px', fontWeight: 900, color: '#cbd5e0', marginBottom: '10px' }}>DOCUMENTS</div>

      {isLoading && <div style={{ fontSize: '11px', color: '#718096' }}>Loading…</div>}

      {!isLoading && items.length === 0 && <div style={{ fontSize: '11px', color: '#718096' }}>No documents.</div>}

      {!isLoading && items.length > 0 && (
        <div style={{ display: 'grid', gap: '8px' }}>
          {items.map((d, idx) => (
            <div
              key={(d.id as string) || `${idx}`}
              style={{
                padding: '10px',
                border: '1px solid #2d3139',
                borderRadius: '10px',
                background: '#0d1117',
                color: '#e2e8f0',
                fontSize: '11px',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <span style={{ fontWeight: 800 }}>{(d.name as string) || 'Untitled'}</span>
              <span style={{ color: '#718096' }}>{(d.type as string) || ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
