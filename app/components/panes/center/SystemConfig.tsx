'use client';
import React from 'react';

interface HealthData {
  agentManager?: string;
  ironsight?: string;
  coreintel?: string;
  coreguard?: string;
  [key: string]: any;
}

type Props = {
  health?: HealthData;
  [key: string]: any;
};

export default function SystemConfig({ health = {} }: Props) {
  const agents = [
    { name: 'AGENT MANAGER', role: 'System Orchestration', status: health.agentManager || 'OFFLINE' },
    { name: 'IRONSIGHT', role: 'Visual Threat Detection', status: health.ironsight || 'OFFLINE' },
    { name: 'COREINTEL', role: 'Pipeline Intelligence', status: health.coreintel || 'OFFLINE' },
    { name: 'COREGUARD', role: 'Risk Lifecycle & Healing', status: health.coreguard || 'OFFLINE' },
  ];

  return (
    <div style={{ padding: '15px', background: '#0d1117', height: '100%' }}>
      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#8b949e', marginBottom: '15px' }}>SYSTEM_CONFIG_STATUS</div>
      <div style={{ display: 'grid', gap: '10px' }}>
        {agents.map((agent) => (
          <div key={agent.name} style={{ background: '#161b22', padding: '10px', border: '1px solid #30363d', borderRadius: '4px' }}>
            <div style={{ fontSize: '11px', color: '#58a6ff' }}>{agent.name}</div>
            <div style={{ fontSize: '10px', color: '#c9d1d9' }}>{agent.role}</div>
            <div style={{ fontSize: '10px', color: agent.status === 'ONLINE' ? '#238636' : '#f85149', marginTop: '5px' }}>
              ● {agent.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
