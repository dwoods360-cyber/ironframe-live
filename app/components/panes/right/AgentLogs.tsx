'use client';
import React from 'react';

export default function AgentLogs() {
  const logs = [
    { id: 1, time: '14:02:15', agent: 'CoreIntel', msg: 'Routine Integrity Scan -> Verified' },
    { id: 2, time: '13:58:22', agent: 'NetGuard', msg: 'Outbound Traffic Anomaly -> Blocked' },
    { id: 3, time: '13:45:10', agent: 'CoreIntel', msg: 'Signature Update v.9.2 -> Applied' },
    { id: 4, time: '13:30:05', agent: 'SysMon', msg: 'CPU Usage Alert (92%) -> Resolved' },
    { id: 5, time: '13:15:00', agent: 'CoreIntel', msg: 'Routine Integrity Scan -> Verified' },
  ];

  return (
    <div style={{background: '#1a1d23', height: '100%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #2d3139'}}>
      <div style={{padding: '12px 20px', borderBottom: '1px solid #2d3139', background: '#161b22'}}>
        <span style={{fontSize:'10px', fontWeight:700, color:'#718096', letterSpacing:'1px'}}>AGENT MANAGER LOGS (DB)</span>
      </div>
      
      <div style={{padding: '20px', overflowY: 'auto', flex: 1}}>
        <div style={{fontSize:'10px', fontWeight:700, color:'#a0aec0', marginBottom:'12px'}}>SYSTEM HEALTH</div>
        {logs.map(log => (
          <div key={log.id} style={{background:'#22272e', border:'1px solid #2d3748', borderRadius:'6px', padding:'12px', marginBottom:'8px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
              <span style={{color:'#63b3ed', fontSize:'10px', fontWeight:700}}>{log.agent}</span>
              <span style={{color:'#718096', fontSize:'10px'}}>{log.time}</span>
            </div>
            <div style={{color:'#cbd5e0', fontSize:'11px'}}>{log.msg}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
