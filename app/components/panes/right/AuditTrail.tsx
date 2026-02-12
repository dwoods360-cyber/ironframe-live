'use client';

import React, { useMemo } from 'react';

type AuditItem = {
  timestamp: number;
  action?: string;
  actor?: string;
  severity?: string;
  [k: string]: unknown;
};

type Props = {
  liveData?: { auditLogs?: AuditItem[] } | null;
};

export default function AuditTrail({ liveData }: Props) {
  const items = useMemo(() => (liveData?.auditLogs ?? []) as AuditItem[], [liveData]);

  // Purity rule: do not call Date.now during render.
  // Memoize a stable "now" for this render frame.
  const nowMs = useMemo(() => new Date().getTime(), []);

  return (
    <div style={{ background: '#111318', border: '1px solid #2d3139', borderRadius: '10px', padding: '16px' }}>
      <div style={{ fontSize: '12px', fontWeight: 900, color: '#cbd5e0', marginBottom: '10px' }}>AUDIT TRAIL</div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ fontSize: '9px', color: '#718096', padding: '6px', textAlign: 'left' }}>Action</th>
            <th style={{ fontSize: '9px', color: '#718096', padding: '6px', textAlign: 'right' }}>Age</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const ts = typeof item.timestamp === 'number' ? item.timestamp : nowMs;
            const ageSeconds = Math.max(0, Math.floor((nowMs - ts) / 1000));
            const label = (item.action as string) || `Audit event ${idx + 1}`;

            return (
              <tr key={`${ts}-${idx}`}>
                <td
                  style={{
                    fontSize: '10px',
                    color: '#e2e8f0',
                    padding: '6px',
                    borderBottom: '1px solid #2d3139',
                    verticalAlign: 'top',
                  }}
                >
                  {label}
                </td>
                <td
                  style={{
                    fontSize: '9px',
                    color: '#718096',
                    padding: '6px',
                    borderBottom: '1px solid #2d3139',
                    textAlign: 'right',
                    verticalAlign: 'top',
                  }}
                >
                  {ageSeconds}s
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {items.length === 0 && <div style={{ fontSize: '11px', color: '#718096' }}>No audit events yet.</div>}
    </div>
  );
}
