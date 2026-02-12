'use client';
import React from 'react';
export default function Header() {
  return (
    <div style={{height: '60px', background: '#15181e', borderBottom: '1px solid #2d3139', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)', zIndex: 50}}>
      <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
        <div style={{background: '#3182ce', width: '28px', height: '28px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '13px'}}>IF</div>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}><span style={{color:'white', fontWeight:800, fontSize:'14px'}}>IRONFRAME CORE</span><span style={{color:'#4a5568', fontSize:'14px'}}>|</span><span style={{color:'#48bb78', fontWeight:700, fontSize:'11px'}}>ACTIVE GRC</span></div>
      </div>
      <div style={{display:'flex', alignItems:'center', gap:'20px'}}><div style={{width:'6px', height:'6px', borderRadius:'50%', background:'#48bb78', boxShadow:'0 0 6px #48bb78'}} /><span style={{color:'#48bb78', fontSize:'10px', fontWeight:800}}>LIVE MONITORING</span></div>
      <div style={{display:'flex', alignItems:'center', gap:'10px'}}><div style={{border: '1px solid #ecc94b', borderRadius: '4px', padding: '5px 12px', color: '#ecc94b', fontSize: '10px', fontWeight: 800}}><span>🔒</span> SECURE SESSION</div></div>
    </div>
  );
}
