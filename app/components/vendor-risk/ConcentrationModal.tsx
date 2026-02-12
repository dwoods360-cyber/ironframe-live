'use client';

import React from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ConcentrationModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(720px, 96vw)',
          background: '#111318',
          border: '1px solid #2d3139',
          borderRadius: '12px',
          padding: '18px',
          color: '#e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#cbd5e0' }}>CONCENTRATION ANALYSIS</div>
          <button
            onClick={onClose}
            style={{
              background: '#2d3139',
              border: '1px solid #3a3f49',
              color: '#e2e8f0',
              fontSize: '11px',
              padding: '6px 10px',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>

        <div style={{ fontSize: '11px', color: '#a0aec0', lineHeight: 1.55 }}>
          This view summarizes vendor concentration risk. If you don&apos;t have enough vendors in the dataset, results may
          be limited.
        </div>
      </div>
    </div>
  );
}
