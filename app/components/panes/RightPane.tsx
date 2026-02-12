'use client';
import React from 'react';
import AuditIntelligence from './right/AuditIntelligence';

interface AuditLog {
  id: string | number;
  severity: string;
}

type Props = {
  company: any;
  logs?: AuditLog[];
  [key: string]: any;
};

export default function RightPane({ company, logs = [], ...props }: Props) {
  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    color: '#8b949e',
    marginBottom: '8px',
    textTransform: 'uppercase'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px' }}>
      <AuditIntelligence company={company} />
      
      <div style={{ marginTop: '20px', flex: 1 }}>
        <div style={sectionLabelStyle}>AUDIT TRAIL ({logs.length})</div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {logs.map((log) => (
            <div 
              key={log.id} 
              style={{ 
                background: '#1a202c', 
                borderLeft: `4px solid ${log.severity === 'MED' ? '#ecc94b' : '#4a5568'}`,
                padding: '10px',
                borderRadius: '4px'
              }}
            >
              {/* Log Content */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
