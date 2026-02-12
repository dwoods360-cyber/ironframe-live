'use client';
import React from 'react';

interface Props { tenant: string; liveData: Record<string, unknown>; onUpdateData: Record<string, unknown>; }

export default function RightPane({ tenant, liveData, }: Props) {
  const logs = liveData?.auditLogs || [];

  const containerStyle: React.CSSProperties = {
    width: '320px',
    background: '#15181e',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    borderLeft: '1px solid #2d3139',
    overflowY: 'auto'
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 700,
    color: '#718096',
    marginBottom: '12px',
    letterSpacing: '1px'
  };

  return (
    <div style={containerStyle}>
      {/* AUDIT INTELLIGENCE */}
      <div>
        <div style={sectionLabelStyle}>AUDIT INTELLIGENCE</div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
          {['ALL', 'HIGH', 'MED', 'LOW'].map(f => (
            <button key={f} style={{ flex: 1, background: f === 'ALL' ? '#3182ce' : '#2d3748', border: 'none', borderRadius: '4px', color: 'white', fontSize: '9px', fontWeight: 800, padding: '6px 0', cursor: 'pointer' }}>{f}</button>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <input placeholder={`Search ${tenant} logs...`} style={{ width: '100%', background: '#1a202c', border: '1px solid #2d3139', borderRadius: '4px', padding: '8px 30px 8px 10px', color: 'white', fontSize: '11px' }} />
          <span style={{ position: 'absolute', right: '10px', top: '8px' }}>🔍</span>
        </div>
      </div>

      {/* PENDING QUEUE */}
      <div>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#ecc94b', marginBottom: '4px' }}>PENDING INTAKE QUEUE (0)</div>
        <div style={{ fontSize: '11px', color: '#718096', fontStyle: 'italic' }}>No pending items.</div>
      </div>

      {/* AUDIT TRAIL */}
      <div style={{ flex: 1 }}>
        <div style={sectionLabelStyle}>AUDIT TRAIL ({logs.length})</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {logs.map((log: Record<string, unknown>) => (
            <div key={log.id} style={{ background: '#1a202c', borderLeft: `4px solid ${log.severity === 'MED' ? '#ecc94b' : '#4a5568'}`, padding: '10px', borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: log.severity === 'MED' ? '#ecc94b' : '#a0aec0', marginBottom: '4px' }}>{log.severity} PRIORITY</div>
              <div style={{ fontSize: '11px', color: 'white', marginBottom: '4px' }}>{log.action}</div>
              <div style={{ fontSize: '10px', color: '#718096' }}>{log.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
