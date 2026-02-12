'use client';
import React from 'react';

export default function QuickReports() {
  const reports = [
    { label: 'Executive Summary', icon: '📊' },
    { label: 'Compliance Matrix', icon: '📋' },
    { label: 'Risk Heat Map', icon: '🎯' },
    { label: 'Dashboard Snapshot', icon: '📸' },
  ];

  return (
    <div style={{padding: '20px', background: '#161b22', borderTop: '1px solid #2d3139'}}>
      <div style={{fontSize:'10px', fontWeight:800, color:'#a0aec0', letterSpacing:'1px', marginBottom:'12px', textTransform:'uppercase'}}>QUICK REPORTS</div>
      <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
        {reports.map(rep => (
          <button key={rep.label} style={{
            background:'#22272e', border:'1px solid #30363d', borderRadius:'6px', 
            padding:'12px', color:'#e2e8f0', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', textAlign:'left'
          }}>
            <span style={{fontSize:'14px'}}>{rep.icon}</span>
            <span style={{fontSize:'11px', fontWeight:700}}>{rep.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
