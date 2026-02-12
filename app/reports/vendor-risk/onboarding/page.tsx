'use client';
import React from 'react';
import Header from '../../../components/structure/Header';

export default function OnboardingPage() {
  const vendors: unknown[] = [];
  
  return (
    <div style={{ background: '#0d1117', minHeight: '100vh', color: 'white' }}>
      <Header />
      <div style={{ padding: '40px' }}>
        <h1>VENDOR_ONBOARDING</h1>
        {vendors.map((v: unknown, i: number) => (
          <div key={i}>{String(v)}</div>
        ))}
      </div>
    </div>
  );
}
