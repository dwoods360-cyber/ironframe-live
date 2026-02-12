'use client';
import React from 'react';

interface Props {
  feed: Record<string, unknown>[];
}

export default function AgentLogs({ feed }: Props) {
  return (
    <div className="pane">
      <div className="pane-header">Agent Manager Logs (DB)</div>
      <div className="pane-content">
        <div className="section-title">System Health</div>
        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
          {feed.length === 0 && <div className="p-4 text-xs text-gray-500">No logs found.</div>}
          {feed.map(f => (
             <div key={f.id} className="activity-item" style={{borderLeft: f.type === 'success' ? '3px solid var(--accent-success)' : '3px solid var(--accent-primary)'}}>
                <div className="activity-action" style={{color: f.type === 'success' ? 'var(--accent-success)' : 'var(--accent-primary)'}}>{f.agent}</div>
                <div className="activity-details">{f.message}</div>
                <div className="activity-time">{f.time}</div>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}
