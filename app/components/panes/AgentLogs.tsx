'use client';
import React from 'react';

interface LogEntry {
  id: string | number;
  type: 'success' | 'error' | 'info' | string;
  agent: string;
  message: string;
  time: string;
}

type Props = {
  feed?: LogEntry[];
  [key: string]: any;
};

export default function AgentLogs({ feed = [] }: Props) {
  return (
    <div style={{ padding: 10, background: '#0d1117', height: '100%' }}>
      {feed.length === 0 && (
        <div style={{ color: '#8b949e', fontSize: 12 }}>No logs found.</div>
      )}
      {feed.map((f: LogEntry) => (
        <div 
          key={f.id} 
          style={{ 
            marginBottom: 8, 
            paddingLeft: 8, 
            borderLeft: `3px solid ${f.type === 'success' ? '#238636' : '#1f6feb'}` 
          }}
        >
          <div style={{ fontSize: 11, color: '#58a6ff', fontWeight: 'bold' }}>{f.agent}</div>
          <div style={{ fontSize: 12, color: '#c9d1d9' }}>{f.message}</div>
          <div style={{ fontSize: 10, color: '#8b949e' }}>{f.time}</div>
        </div>
      ))}
    </div>
  );
}
