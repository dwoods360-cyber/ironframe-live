'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

type Artifact = {
  id: string;
  name: string;
  createdAt?: string;
  [k: string]: unknown;
};

type Props = {
  isOpen: boolean;
  vendorId?: string | null;
};

export default function ArtifactDrawer({ isOpen, vendorId }: Props) {
  const [loading, setLoading] = useState(false);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const idCounterRef = useRef(1);

  const makeId = useCallback((): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    const n = idCounterRef.current++;
    return `art-${n}`;
  }, []);

  const fetchArtifacts = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    try {
      // Replace with your real fetch/supabase call if needed.
      // Keeping as a safe placeholder that doesn't explode the app.
      setArtifacts((prev) => prev);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (isOpen && vendorId) void fetchArtifacts();
  }, [isOpen, vendorId, fetchArtifacts]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ID generation happens in an event handler (not render)
    const newArtifact: Artifact = {
      id: makeId(),
      name: file.name,
      createdAt: new Date().toISOString(),
    };

    setArtifacts((prev) => [newArtifact, ...prev]);

    // reset input
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div style={{ background: '#111318', border: '1px solid #2d3139', borderRadius: '10px', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '12px', fontWeight: 900, color: '#cbd5e0' }}>ARTIFACTS</div>

        <label
          style={{
            background: '#2b6cb0',
            color: 'white',
            border: 'none',
            fontSize: '10px',
            fontWeight: 900,
            padding: '8px 10px',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          UPLOAD
          <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>
      </div>

      {loading && <div style={{ fontSize: '11px', color: '#718096' }}>Loading…</div>}

      <div style={{ display: 'grid', gap: '8px' }}>
        {artifacts.map((a) => (
          <div
            key={a.id}
            style={{
              padding: '10px',
              border: '1px solid #2d3139',
              borderRadius: '10px',
              background: '#0d1117',
              color: '#e2e8f0',
              fontSize: '11px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontWeight: 800 }}>{a.name}</span>
            <span style={{ color: '#718096' }}>{a.createdAt ? a.createdAt.slice(0, 10) : ''}</span>
          </div>
        ))}
        {artifacts.length === 0 && !loading && <div style={{ fontSize: '11px', color: '#718096' }}>No artifacts yet.</div>}
      </div>
    </div>
  );
}
