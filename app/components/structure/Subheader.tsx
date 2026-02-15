'use client';
import React from 'react';
import Link from 'next/link';

interface SubheaderProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export default function Subheader({ currentView, onViewChange }: SubheaderProps) {
  const navigationItems = [
    { id: 'DASHBOARD', label: '📊 DASHBOARD' },
    { id: 'CONFIG', label: '⚙️ SYSTEM CONFIG' }
  ];

  const subheaderStyle: React.CSSProperties = {
    height: '40px',
    width: '100%',
    background: '#3182ce',
    borderBottom: '1px solid #2d3139',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    zIndex: 10
  };

  const navContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    flex: 1
  };

  const getButtonStyle = (isActive: boolean): React.CSSProperties => ({
    background: isActive ? '#1a202c' : 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    border: isActive ? '1px solid #4a5568' : '1px solid transparent',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  });

  const reportChipStyle: React.CSSProperties = {
    background: '#2d3748',
    color: '#cbd5e0',
    border: '1px solid #4a5568',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '9px',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginRight: '120px',
    cursor: 'pointer',
    textDecoration: 'none'
  };

  return (
    <div style={subheaderStyle}>
      <div style={navContainerStyle}>
        {navigationItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            style={getButtonStyle(currentView === item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      
      {/* WRAPPED CHIP TO OPEN REPORTS SUBPAGE */}
      <Link href="/reports" style={{ textDecoration: 'none' }}>
        <div style={reportChipStyle}>
          <span>📄</span> BACK
        </div>
      </Link>
    </div>
  );
}
