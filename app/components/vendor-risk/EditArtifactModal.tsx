'use client';

import React, { useState } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  artifact?: { id: string; name: string; notes?: string } | null;
  onSave?: (updates: { name: string; notes: string }) => void;
};

export default function EditArtifactModal({ isOpen, onClose, artifact, onSave }: Props) {
  const [name, setName] = useState(artifact?.name ?? '');
  const [notes, setNotes] = useState(artifact?.notes ?? '');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave?.({ name: name.trim(), notes });
    onClose();
  };

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
        zIndex: 60,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(640px, 96vw)',
          background: '#111318',
          border: '1px solid #2d3139',
          borderRadius: '12px',
          padding: '18px',
          color: '#e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#cbd5e0' }}>EDIT ARTIFACT</div>
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

        <div style={{ fontSize: '11px', color: '#a0aec0', marginBottom: '10px' }}>
          Tip: use &quot;Evidence&quot; naming like SOC2, ISO 27001, or pen-test reports.
        </div>

        <div style={{ display: 'grid', gap: '8px' }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Artifact name"
            style={{
              width: '100%',
              background: '#0d1117',
              border: '1px solid #2d3139',
              borderRadius: '10px',
              padding: '10px',
              color: '#e2e8f0',
              fontSize: '11px',
            }}
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            rows={5}
            style={{
              width: '100%',
              background: '#0d1117',
              border: '1px solid #2d3139',
              borderRadius: '10px',
              padding: '10px',
              color: '#e2e8f0',
              fontSize: '11px',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
          <button
            onClick={onClose}
            style={{
              background: '#2d3139',
              border: '1px solid #3a3f49',
              color: '#e2e8f0',
              fontSize: '11px',
              padding: '8px 10px',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              background: '#2b6cb0',
              border: '1px solid #2b6cb0',
              color: 'white',
              fontSize: '11px',
              fontWeight: 900,
              padding: '8px 10px',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
