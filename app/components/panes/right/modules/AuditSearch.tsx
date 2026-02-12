'use client';
import React from 'react';

export default function AuditSearch() {
  return (
    <div style={{padding: '16px 20px', borderBottom: '1px solid #2d3139', background: '#161b22'}}>
      {/* FILTER CHIPS */}
      <div style={{display:'flex', gap:'8px', marginBottom:'12px'}}>
        {['ALL', 'HIGH', 'MED', 'LOW'].map(filter => (
          <span key={filter} style={{
            fontSize:'10px', fontWeight:800, padding:'4px 12px', borderRadius:'4px',
            background: filter === 'ALL' ? '#3182ce' : '#2d3748', 
            border: '1px solid #4a5568',
            color: 'white', cursor:'pointer', letterSpacing:'0.5px'
          }}>
            {filter}
          </span>
        ))}
      </div>

      {/* SEARCH BAR & SPYGLASS */}
      <div style={{display:'flex', gap:'10px'}}>
        <input 
          placeholder="Search audit log..." 
          style={{
            flex: 1, background:'#0d1117', border:'1px solid #30363d', 
            color:'#c9d1d9', fontSize:'12px', padding:'10px', borderRadius:'6px', outline:'none'
          }} 
        />
        <button style={{
          background:'#2d3748', border:'1px solid #4a5568', borderRadius:'6px', 
          width:'40px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'
        }}>
          🔍
        </button>
      </div>
    </div>
  );
}
