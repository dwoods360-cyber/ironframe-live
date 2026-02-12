'use client';
import React from 'react';

export default function RecentActivity() {
  const activities = [
    { type: 'THREAT DETECTED', msg: 'IronSight identified 3 new CVEs in web frameworks', time: '5 minutes ago' },
    { type: 'POLICY GAP', msg: 'CoreIntel flagged MFA requirement missing from Access Control policy', time: '12 minutes ago' },
    { type: 'VENDOR ALERT', msg: 'CoreGuard: Salesforce SOC 2 certification expires in 28 days', time: '1 hour ago' },
  ];

  return (
    <div style={{padding: '20px', borderBottom: '1px solid #2d3139'}}>
      <div style={{fontSize:'10px', fontWeight:800, color:'#a0aec0', letterSpacing:'1px', marginBottom:'12px', textTransform:'uppercase'}}>RECENT ACTIVITY</div>
      <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
        {activities.map((act, i) => (
          <div key={i} style={{
            background:'#22272e', 
            border:'1px solid #30363d', 
            borderLeft:'3px solid #3182ce', 
            borderRadius:'4px', 
            padding:'12px'
          }}>
            <div style={{color:'#3182ce', fontSize:'10px', fontWeight:800, marginBottom:'4px', textTransform:'uppercase'}}>{act.type}</div>
            <div style={{color:'#e2e8f0', fontSize:'11px', lineHeight:'1.4', marginBottom:'6px'}}>{act.msg}</div>
            <div style={{color:'#718096', fontSize:'10px'}}>{act.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
