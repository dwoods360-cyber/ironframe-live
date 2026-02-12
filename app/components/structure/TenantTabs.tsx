'use client';
import React from 'react';
interface Props { current: string; onChange: (tenant: string) => void; }
export default function TenantTabs({ current, onChange }: Props) {
  const tabs = [{ id: 'MEDSHIELD', label: 'MEDSHIELD HEALTH' }, { id: 'VAULTBANK', label: 'VAULTBANK GLOBAL' }, { id: 'GRIDCORE', label: 'GRIDCORE ENERGY' }];
  return (
    <div style={{height: '40px', background: '#1a202c', borderBottom: '1px solid #2d3139', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '4px'}}>
      {tabs.map(tab => (
        <div key={tab.id} onClick={() => onChange(tab.id)} style={{padding: '0 16px', height: '100%', background: current === tab.id ? '#2d3748' : 'transparent', borderTop: current === tab.id ? '2px solid #3182ce' : '2px solid transparent', color: current === tab.id ? 'white' : '#718096', fontSize: '11px', fontWeight: current === tab.id ? 800 : 700, display: 'flex', alignItems: 'center', cursor: 'pointer'}}>{tab.label}</div>
      ))}
      <div style={{marginLeft: 'auto', color: '#48bb78', fontSize: '10px', fontWeight: 800}}>AGENT MANAGER: ONLINE</div>
    </div>
  );
}
