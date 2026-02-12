'use client';
import React from 'react';

interface Props { tenant: string; liveData: Record<string, unknown>; }

export default function SystemConfig({ liveData }: Props) {
  
  const health = liveData?.systemHealth || { ironsight: 'OFFLINE', coreintel: 'OFFLINE', coreguard: 'OFFLINE', agentManager: 'OFFLINE', integrity: 0 };
  const logs = liveData?.healingLog || [];

  const agents = [
    { name: 'AGENT MANAGER', role: 'System Orchestration', status: health.agentManager },
    { name: 'IRONSIGHT', role: 'Visual Threat Detection', status: health.ironsight },
    { name: 'COREINTEL', role: 'Pipeline Intelligence', status: health.coreintel },
    { name: 'COREGUARD', role: 'Risk Lifecycle & Healing', status: health.coreguard },
  ];

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto', background: '#0d1117' }}>
      <div style={{fontSize:'12px', fontWeight:700, color:'#a0aec0', marginBottom:'20px', letterSpacing:'1px'}}>AGENT MANAGER // SELF-HEALING CORE</div>

      {/* SYSTEM INTEGRITY */}
      <div style={{background: '#1c2128', border: '1px solid #2d3748', borderRadius: '8px', padding: '20px', marginBottom: '24px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
         <div>
           <div style={{fontSize:'10px', color:'#718096', fontWeight:700, marginBottom:'4px'}}>SYSTEM INTEGRITY</div>
           <div style={{fontSize:'24px', fontWeight:800, color: health.integrity > 95 ? '#48bb78' : '#ecc94b'}}>{health.integrity}%</div>
         </div>
         <div style={{textAlign:'right'}}>
           <div style={{fontSize:'10px', color:'#718096', fontWeight:700, marginBottom:'4px'}}>SELF-HEALING STATUS</div>
           <div style={{fontSize:'14px', fontWeight:700, color:'#48bb78'}}>ACTIVE • MONITORING</div>
         </div>
      </div>

      {/* AGENT GRID */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'24px'}}>
        {agents.map(agent => (
          <div key={agent.name} style={{background: '#161b22', border: '1px solid #30363d', borderRadius: '6px', padding: '16px'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
               <div style={{fontSize:'12px', fontWeight:800, color:'white', letterSpacing:'0.5px'}}>{agent.name}</div>
               <div style={{fontSize:'9px', fontWeight:700, color: agent.status === 'ONLINE' ? '#48bb78' : '#e53e3e', background: 'rgba(255,255,255,0.05)', padding:'4px 8px', borderRadius:'4px'}}>
                 {agent.status}
               </div>
            </div>
            <div style={{fontSize:'10px', color:'#8b949e'}}>{agent.role}</div>
            
            <div style={{marginTop:'12px', height:'4px', background:'#21262d', borderRadius:'2px', overflow:'hidden'}}>
               <div style={{height:'100%', width: agent.status === 'ONLINE' ? '100%' : '0%', background: agent.name === 'AGENT MANAGER' ? '#805ad5' : '#3182ce', animation: 'pulse 2s infinite'}}></div>
            </div>
          </div>
        ))}
      </div>

      {/* HEALING LOGS */}
      <div style={{fontSize:'10px', fontWeight:700, color:'#a0aec0', marginBottom:'12px', textTransform:'uppercase'}}>AUTONOMOUS REPAIR LOGS</div>
      <div style={{background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '0', overflow:'hidden'}}>
        {logs.length === 0 && <div style={{padding:'12px', fontSize:'11px', color:'#8b949e', fontStyle:'italic'}}>No incidents detected. System nominal.</div>}
        
        {logs.map((log: Record<string, unknown>, idx: number) => (
           <div key={log.id} style={{padding:'12px', borderBottom:'1px solid #21262d', background: idx === 0 ? 'rgba(56, 139, 253, 0.1)' : 'transparent', display:'flex', gap:'12px', alignItems:'center'}}>
              <div style={{fontSize:'9px', color: log.agent === 'AGENT MANAGER' ? '#d6bcfa' : '#58a6ff', fontFamily:'monospace', fontWeight:700, width:'100px'}}>{log.agent}</div>
              <div style={{fontSize:'11px', color:'#c9d1d9', flex:1}}>{log.action}</div>
              <div style={{fontSize:'9px', color:'#8b949e'}}>{log.time}</div>
           </div>
        ))}
      </div>
      
      <style jsx>{` @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } } `}</style>

    </div>
  );
}
