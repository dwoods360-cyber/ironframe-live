'use client';
import React from 'react';
import Header from '../../components/structure/Header';
import Link from 'next/link';

export default function NISTFrameworkPage() {
  const functions = [
    { id: 'ID', name: 'IDENTIFY', score: 85, color: '#3182ce', sub: 'Asset Management, Risk Assessment' },
    { id: 'PR', name: 'PROTECT', score: 72, color: '#48bb78', sub: 'Identity Management, Data Security' },
    { id: 'DE', name: 'DETECT', score: 64, color: '#ecc94b', sub: 'Anomalies, Monitoring' },
    { id: 'RS', name: 'RESPOND', score: 91, color: '#f56565', sub: 'Response Planning, Mitigation' },
    { id: 'RC', name: 'RECOVER', score: 88, color: '#9f7aea', sub: 'Recovery Planning, Improvements' }
  ];

  const navChipStyle = { background: '#2d3748', color: '#cbd5e0', border: '1px solid #4a5568', padding: '4px 12px', borderRadius: '12px', fontSize: '9px', fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' };

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <Header />
      <div style={{ height: '40px', background: '#3182ce', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '10px', fontWeight: 800 }}>🛡️ NIST CSF 2.0 MATURITY TERMINAL</div>
        <Link href="/reports" style={navChipStyle}><span>📄</span> BACK</Link>
      </div>

      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '32px' }}>NIST CSF 2.0 MATURITY HUB</h1>
        
        <div style={{ display: 'grid', gap: '20px' }}>
          {functions.map((fn) => (
            <div key={fn.id} style={{ background: '#1a1d23', border: '1px solid #2d3139', borderRadius: '8px', padding: '24px', display: 'flex', alignItems: 'center', gap: '30px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '4px', background: fn.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 900, color: '#0d1117' }}>{fn.id}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '1px' }}>{fn.name}</span>
                  <span style={{ color: fn.color, fontWeight: 800 }}>{fn.score}%</span>
                </div>
                <div style={{ height: '8px', background: '#0d1117', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${fn.score}%`, height: '100%', background: fn.color }} />
                </div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#718096' }}>{fn.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
