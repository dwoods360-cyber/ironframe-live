'use client';
import React from 'react';

export default function AuditTrail() {
  const auditItems = [
    { action: 'RISK ACKNOWLEDGED', msg: 'J. Doe moved "API Vulnerability" from DRAFT to ACTIVE status', time: '2 hours ago' },
    { action: 'SIGNAL INGESTED', msg: 'IronSight detected: Critical CVE in Apache Log4j', time: '3 hours ago' },
    { action: 'POLICY REVIEWED', msg: 'Quarterly review completed for Data Protection Policy by Compliance Team', time: '5 hours ago' },
    { action: 'RISK RESOLVED', msg: 'Security Team marked "Phishing Campaign" as RESOLVED with evidence', time: '1 day ago' },
  ];

  return (
    <div style={{padding: '20px', borderBottom: '1px solid #2d3139'}}>
      <div style={{fontSize:'10px', fontWeight:800, color:'#a0aec0', letterSpacing:'1px', marginBottom:'12px', textTransform:'uppercase'}}>AUDIT TRAIL</div>
      {auditItems.map((item, i) => (
        <div key={i} style={{
          background:'#22272e', 
          border:'1px solid #30363d', 
          borderLeft:'3px solid #3182ce', 
          borderRadius:'4px', 
          padding:'12px', 
          marginBottom:'8px'
        }}>
          <div style={{color:'#3182ce', fontSize:'10px', fontWeight:800, marginBottom:'4px', textTransform:'uppercase'}}>{item.action}</div>
          <div style={{color:'#e2e8f0', fontSize:'11px', lineHeight:'1.4', marginBottom:'6px'}}>{item.msg}</div>
          <div style={{color:'#718096', fontSize:'10px'}}>{item.time}</div>
        </div>
      ))}
    </div>
  );
}
