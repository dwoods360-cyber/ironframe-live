'use client';

import React, { useMemo, useState } from 'react';

type ScannedData = {
  vendor_name?: string;
  category?: string;
  criticality?: number;
  [k: string]: unknown;
};

type FormData = {
  vendor_name: string;
  category: string;
  criticality: number;
  data_handling: number;
  compliance_scope: number;
  insurance_coverage: number;
  audit_frequency: number;
  score: number;
  inherent_score: number;
  mitigation_score: number;
};

type Props = {
  scannedData?: ScannedData | null;
  onSubmit?: (data: FormData) => void | Promise<void>;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Pure calculation (no state updates)
function computeScores(fd: Omit<FormData, 'score' | 'inherent_score' | 'mitigation_score'>) {
  const inherent =
    clamp(fd.criticality, 1, 5) +
    clamp(fd.data_handling, 1, 5) +
    clamp(fd.compliance_scope, 1, 5);

  const mitigation =
    clamp(fd.insurance_coverage, 1, 5) +
    clamp(fd.audit_frequency, 1, 5);

  // Example residual: higher inherent minus mitigation; keep bounded 1..25
  let residual = inherent * 2 - mitigation;
  if (!Number.isFinite(residual)) residual = 5;
  residual = clamp(residual, 1, 25);

  return { inherent, mitigation, residual };
}

export default function IngestionForm({ scannedData, onSubmit }: Props) {
  const [base, setBase] = useState<Omit<FormData, 'score' | 'inherent_score' | 'mitigation_score'>>({
    vendor_name: '',
    category: '',
    criticality: 3,
    data_handling: 3,
    compliance_scope: 3,
    insurance_coverage: 3,
    audit_frequency: 3,
  });

  // Derive a merged "view" that includes scannedData WITHOUT setting state in effects.
  const mergedBase = useMemo(() => {
    if (!scannedData) return base;
    return {
      ...base,
      vendor_name: (scannedData.vendor_name ?? base.vendor_name) as string,
      category: (scannedData.category ?? base.category) as string,
      criticality: typeof scannedData.criticality === 'number' ? scannedData.criticality : base.criticality,
    };
  }, [base, scannedData]);

  const computed = useMemo(() => computeScores(mergedBase), [mergedBase]);

  const full: FormData = useMemo(
    () => ({
      ...mergedBase,
      score: computed.residual,
      inherent_score: computed.inherent,
      mitigation_score: computed.mitigation,
    }),
    [mergedBase, computed]
  );

  const setField = <K extends keyof typeof base>(key: K, value: (typeof base)[K]) => {
    setBase((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit?.(full);
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: '#111318', border: '1px solid #2d3139', borderRadius: '10px', padding: '16px' }}>
      <div style={{ fontSize: '12px', fontWeight: 900, color: '#cbd5e0', marginBottom: '10px' }}>INGESTION</div>

      <div style={{ display: 'grid', gap: '8px' }}>
        <input
          value={full.vendor_name}
          onChange={(e) => setField('vendor_name', e.target.value)}
          placeholder="Vendor name"
          style={{ width: '100%', background: '#0d1117', border: '1px solid #2d3139', borderRadius: '10px', padding: '10px', color: '#e2e8f0', fontSize: '11px' }}
        />
        <input
          value={full.category}
          onChange={(e) => setField('category', e.target.value)}
          placeholder="Category"
          style={{ width: '100%', background: '#0d1117', border: '1px solid #2d3139', borderRadius: '10px', padding: '10px', color: '#e2e8f0', fontSize: '11px' }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <label style={{ fontSize: '10px', color: '#a0aec0' }}>
            Criticality (1-5)
            <input
              type="number"
              min={1}
              max={5}
              value={full.criticality}
              onChange={(e) => setField('criticality', clamp(Number(e.target.value), 1, 5))}
              style={{ width: '100%', marginTop: '4px', background: '#0d1117', border: '1px solid #2d3139', borderRadius: '10px', padding: '8px', color: '#e2e8f0', fontSize: '11px' }}
            />
          </label>

          <label style={{ fontSize: '10px', color: '#a0aec0' }}>
            Data handling (1-5)
            <input
              type="number"
              min={1}
              max={5}
              value={full.data_handling}
              onChange={(e) => setField('data_handling', clamp(Number(e.target.value), 1, 5))}
              style={{ width: '100%', marginTop: '4px', background: '#0d1117', border: '1px solid #2d3139', borderRadius: '10px', padding: '8px', color: '#e2e8f0', fontSize: '11px' }}
            />
          </label>

          <label style={{ fontSize: '10px', color: '#a0aec0' }}>
            Compliance scope (1-5)
            <input
              type="number"
              min={1}
              max={5}
              value={full.compliance_scope}
              onChange={(e) => setField('compliance_scope', clamp(Number(e.target.value), 1, 5))}
              style={{ width: '100%', marginTop: '4px', background: '#0d1117', border: '1px solid #2d3139', borderRadius: '10px', padding: '8px', color: '#e2e8f0', fontSize: '11px' }}
            />
          </label>

          <label style={{ fontSize: '10px', color: '#a0aec0' }}>
            Insurance (1-5)
            <input
              type="number"
              min={1}
              max={5}
              value={full.insurance_coverage}
              onChange={(e) => setField('insurance_coverage', clamp(Number(e.target.value), 1, 5))}
              style={{ width: '100%', marginTop: '4px', background: '#0d1117', border: '1px solid #2d3139', borderRadius: '10px', padding: '8px', color: '#e2e8f0', fontSize: '11px' }}
            />
          </label>

          <label style={{ fontSize: '10px', color: '#a0aec0' }}>
            Audit frequency (1-5)
            <input
              type="number"
              min={1}
              max={5}
              value={full.audit_frequency}
              onChange={(e) => setField('audit_frequency', clamp(Number(e.target.value), 1, 5))}
              style={{ width: '100%', marginTop: '4px', background: '#0d1117', border: '1px solid #2d3139', borderRadius: '10px', padding: '8px', color: '#e2e8f0', fontSize: '11px' }}
            />
          </label>
        </div>

        <div style={{ border: '1px solid #2d3139', borderRadius: '10px', padding: '10px', background: '#0d1117', color: '#a0aec0', fontSize: '11px' }}>
          <div><b style={{ color: '#e2e8f0' }}>Computed scores</b></div>
          <div>Inherent: <span style={{ color: '#e2e8f0' }}>{full.inherent_score}</span></div>
          <div>Mitigation: <span style={{ color: '#e2e8f0' }}>{full.mitigation_score}</span></div>
          <div>Residual: <span style={{ color: '#e2e8f0' }}>{full.score}</span></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            style={{ background: '#2b6cb0', border: '1px solid #2b6cb0', color: 'white', fontSize: '11px', fontWeight: 900, padding: '8px 10px', borderRadius: '10px', cursor: 'pointer' }}
          >
            Save Vendor
          </button>
        </div>
      </div>
    </form>
  );
}
