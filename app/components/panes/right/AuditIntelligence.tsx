'use client';
import React from 'react';
import AuditSearch from './modules/AuditSearch';
import RecentActivity from './modules/RecentActivity';
import AuditTrail from './modules/AuditTrail';
import QuickReports from './modules/QuickReports';

export default function AuditIntelligence() {
  return (
    <div style={{
      background: '#1a1d23', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      borderLeft: '1px solid #2d3139',
      overflow: 'hidden' 
    }}>
      {/* 1. FIXED HEADER */}
      <div style={{padding: '12px 20px', borderBottom: '1px solid #2d3139', background: '#161b22', flexShrink: 0}}>
        <span style={{fontSize:'11px', fontWeight:700, color:'#e2e8f0', letterSpacing:'0.5px'}}>AUDIT INTELLIGENCE</span>
      </div>

      {/* 2. FIXED SEARCH & FILTER SECTION (Now Pinned) */}
      <div style={{flexShrink: 0, zIndex: 10}}>
        <AuditSearch />
      </div>

      {/* 3. SCROLLABLE CONTENT AREA */}
      <div style={{flex: 1, overflowY: 'auto'}}>
        <RecentActivity />
        <AuditTrail />
        <QuickReports />
      </div>
    </div>
  );
}
