'use client';
import React from 'react';
import Header from '../components/structure/Header';
import Link from 'next/link';

export default function ReportsPage() {
  const stakeholderRoles = [
    { name: 'CISO STRATEGIC', path: '/roles/ciso' },
    { name: 'CRO ENTERPRISE', path: '/roles/cro' },
    { name: 'BOARD GOVERNANCE', path: '/roles/board' },
    { name: 'LEGAL / PRIVACY', path: '/roles/legal' },
    { name: 'CFO / FINANCIAL', path: '/roles/cfo' },
    { name: 'INTERNAL AUDIT', path: '/roles/audit' },
    { name: 'PRODUCT SECURITY', path: '/roles/product' },
    { name: 'INSURANCE / RISK', path: '/roles/insurance' },
    { name: 'OPS RESILIENCE', path: '/roles/ops' },
    { name: 'ITSM MANAGER', path: '/roles/itsm' }
  ];

  const navChipStyle = { background: '#2d3748', color: '#cbd5e0', border: '1px solid #4a5568', padding: '4px 12px', borderRadius: '12px', fontSize: '9px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', textDecoration: 'none' };

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <Header />
      
      <div className="no-print" style={{ height: '40px', background: '#3182ce', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: 800 }}>📄 REPORTING TERMINAL</div>
          <div onClick={() => window.print()} style={navChipStyle}><span>🖨️</span> PRINT REPORT</div>
          <Link href="/reports/technical-ops" style={navChipStyle}><span>⚙️</span> TECHNICAL DATA</Link>
        </div>
        <Link href="/" style={navChipStyle}><span>🏠</span> RETURN TO MAIN PAGE</Link>
      </div>
      
      <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>SYSTEM REPORTS</h1>
        <p style={{ color: '#718096', marginBottom: '32px' }}>Comprehensive Audit and Compliance Reporting Hub</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
          {/* Column 1: Risk Distribution (FULL DATA RESTORED) */}
          <div style={{ background: '#1a1d23', border: '1px solid #2d3139', borderRadius: '8px', padding: '24px' }}>
            <h3 style={{ fontSize: '11px', color: '#3182ce', fontWeight: 800, marginBottom: '20px', letterSpacing: '0.5px' }}>RISK DISTRIBUTION</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #2d3748' }}>
                <span style={{ fontSize: '13px', color: '#a0aec0' }}>Active Threats</span><span style={{ fontWeight: 800 }}>1</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #2d3748' }}>
                <span style={{ fontSize: '13px', color: '#a0aec0' }}>Open Gaps</span><span style={{ fontWeight: 800 }}>14</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#a0aec0' }}>Critical Findings</span><span style={{ fontWeight: 800, color: '#f56565' }}>3</span>
              </div>
            </div>
          </div>

          {/* Column 2: Available Exports (FULL DATA RESTORED) */}
          <div style={{ background: '#1a1d23', border: '1px solid #2d3139', borderRadius: '8px', padding: '24px' }}>
            <h3 style={{ fontSize: '11px', color: '#48bb78', fontWeight: 800, marginBottom: '20px', letterSpacing: '0.5px' }}>AVAILABLE EXPORTS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: '#2d3748', border: '1px solid #4a5568', padding: '10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📄</span><span style={{ fontSize: '11px', fontWeight: 700 }}>Download HIPAA Compliance PDF</span>
              </div>
              <div style={{ background: '#2d3748', border: '1px solid #4a5568', padding: '10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📄</span><span style={{ fontSize: '11px', fontWeight: 700 }}>Export SOC2 Readiness Gap Map</span>
              </div>
              <div style={{ background: '#2d3748', border: '1px solid #4a5568', padding: '10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📄</span><span style={{ fontSize: '11px', fontWeight: 700 }}>Generate ISO 27001 Annex A List</span>
              </div>
            </div>
          </div>

          {/* Column 3: Quick Reports (FULL DATA + ACTIVE LINKS) */}
          <div style={{ background: '#1a1d23', border: '1px solid #2d3139', borderRadius: '8px', padding: '24px' }}>
            <h3 style={{ fontSize: '11px', color: '#ecc94b', fontWeight: 800, marginBottom: '20px', letterSpacing: '0.5px' }}>QUICK REPORTS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/audit-trail" style={{ textDecoration: 'none' }}>
                <div style={{ background: '#2d3748', border: '1px solid #4a5568', padding: '10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📜</span><span style={{ fontSize: '11px', fontWeight: 700, color: 'white' }}>MASTER AUDIT TRAIL</span>
                </div>
              </Link>
              <Link href="/reports/nist-framework" style={{ textDecoration: 'none' }}>
                <div style={{ background: '#2d3748', border: '1px solid #4a5568', padding: '10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🛡️</span><span style={{ fontSize: '11px', fontWeight: 700, color: 'white' }}>NIST CSF MATURITY OVERVIEW</span>
                </div>
              </Link>
              <Link href="/reports/vendor-risk" style={{ textDecoration: 'none' }}>
                <div style={{ background: '#2d3748', border: '1px solid #4a5568', padding: '10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🏢</span><span style={{ fontSize: '11px', fontWeight: 700, color: 'white' }}>VENDOR RISK INVENTORY</span>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Stakeholder Hub */}
        <div style={{ background: '#1a1d23', border: '1px solid #2d3139', borderRadius: '8px', padding: '32px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#718096', marginBottom: '24px', letterSpacing: '1px' }}>STAKEHOLDER REPORTING VIEWS</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {stakeholderRoles.map((role, idx) => (
              <Link key={idx} href={role.path} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#0d1117', border: '1px solid #2d3748', padding: '16px', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#3182ce' }}>{role.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
