'use client';

import React, { useCallback, useState } from 'react';
import Header from '../../components/structure/Header';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/client';

type Gauge = {
  label: string;
  value: number;
  unit?: string;
  color?: string;
};

type StakeholderMetrics = {
  summary?: string;
  gauges?: Gauge[];
  [k: string]: unknown;
};

export default function RolePage() {
  const [metrics, setMetrics] = useState<StakeholderMetrics | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  /**
   * Fetch metrics for OPS role.
   * NOTE: We intentionally do NOT call this from useEffect because
   * the repo's lint rule `react-hooks/set-state-in-effect` flags that pattern.
   * Instead, we fetch on explicit user action (and after saving).
   */
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stakeholder_metrics')
        .select('metric_data')
        .eq('role_key', 'ops')
        .single();

      if (error) return;
      if (data?.metric_data) setMetrics(data.metric_data as StakeholderMetrics);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const handleUpdate = async () => {
    const { error } = await supabase
      .from('stakeholder_metrics')
      .update({ metric_data: metrics })
      .eq('role_key', 'ops');

    if (!error) {
      setIsEditMode(false);
      await fetchMetrics(); // refresh after save (not from an effect)
    }
  };

  const navChipStyle: React.CSSProperties = {
    background: '#2d3748',
    color: '#cbd5e0',
    border: '1px solid #4a5568',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '9px',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    textDecoration: 'none',
    height: '28px',
    userSelect: 'none',
  };

  // If we haven't loaded yet, show a manual "Load" button instead of auto-fetching in useEffect.
  if (!metrics) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', color: 'white', fontFamily: 'Inter, sans-serif' }}>
        <div className="no-print">
          <Header />
        </div>

        <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>OPS PERSPECTIVE</h1>
          <p style={{ color: '#718096', fontSize: '13px', marginBottom: '16px' }}>
            This page is configured to load metrics on demand (to satisfy the repo’s hook purity lint rules).
          </p>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => void fetchMetrics()}
              disabled={loading}
              style={{
                background: loading ? '#1a1d23' : '#3182ce',
                color: 'white',
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid #2d3139',
                fontSize: '12px',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'LOADING…' : 'LOAD OPS METRICS'}
            </button>

            <Link href="/reports" style={navChipStyle}>
              <span>📄</span> RETURN TO REPORTS
            </Link>

            <Link href="/" style={{ textDecoration: 'none' }}>
              <button
                style={{
                  background: '#2d3748',
                  color: 'white',
                  padding: '0 16px',
                  height: '36px',
                  borderRadius: '6px',
                  border: '1px solid #4a5568',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                ← DASHBOARD
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div className="no-print">
        <Header />
      </div>

      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>OPS PERSPECTIVE</h1>

            {isEditMode ? (
              <textarea
                value={String(metrics.summary ?? '')}
                onChange={(e) => setMetrics({ ...metrics, summary: e.target.value })}
                style={{
                  background: '#0d1117',
                  color: '#48bb78',
                  border: '1px solid #48bb78',
                  width: '100%',
                  padding: '10px',
                  fontSize: '13px',
                  borderRadius: '4px',
                }}
              />
            ) : (
              <p style={{ color: '#718096', fontSize: '13px' }}>{metrics.summary}</p>
            )}
          </div>

          <div className="no-print" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div
              onClick={() => void fetchMetrics()}
              style={{ ...navChipStyle, background: '#1a1d23', border: '1px solid #2d3139', color: '#cbd5e0' }}
              title="Reload metrics"
            >
              <span>🔄</span> REFRESH
            </div>

            <div
              onClick={() => setIsEditMode(!isEditMode)}
              style={{
                ...navChipStyle,
                background: isEditMode ? '#48bb78' : '#2d3748',
                color: isEditMode ? '#0d1117' : '#cbd5e0',
              }}
            >
              <span>⚙️</span> {isEditMode ? 'EXIT EDITOR' : 'EDIT METRICS'}
            </div>

            {isEditMode && (
              <div onClick={() => void handleUpdate()} style={{ ...navChipStyle, background: '#3182ce', color: 'white' }}>
                <span>💾</span> SAVE TO DB
              </div>
            )}

            <div onClick={() => window.print()} style={navChipStyle}>
              <span>🖨️</span> PRINT REPORT
            </div>

            <Link href="/reports" style={navChipStyle}>
              <span>📄</span> RETURN TO REPORTS
            </Link>

            <Link href="/" style={{ textDecoration: 'none' }}>
              <button
                style={{
                  background: '#2d3748',
                  color: 'white',
                  padding: '0 16px',
                  height: '28px',
                  borderRadius: '4px',
                  border: '1px solid #4a5568',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ← DASHBOARD
              </button>
            </Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          {(metrics.gauges ?? []).map((g, i) => (
            <div
              key={i}
              style={{
                background: '#1a1d23',
                padding: '24px',
                borderRadius: '8px',
                border: '1px solid #2d3139',
                position: 'relative',
              }}
            >
              <div style={{ fontSize: '10px', color: '#a0aec0', fontWeight: 800, marginBottom: '15px' }}>{g.label}</div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                {isEditMode ? (
                  <input
                    type="number"
                    value={Number(g.value ?? 0)}
                    onChange={(e) => {
                      const next = Number.parseInt(e.target.value || '0', 10);
                      const newGauges = [...(metrics.gauges ?? [])];
                      newGauges[i] = { ...newGauges[i], value: Number.isFinite(next) ? next : 0 };
                      setMetrics({ ...metrics, gauges: newGauges });
                    }}
                    style={{
                      background: '#0d1117',
                      color: g.color ?? '#cbd5e0',
                      border: 'none',
                      fontSize: '32px',
                      fontWeight: 900,
                      width: '100px',
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '36px', fontWeight: 900, color: g.color || 'white' }}>
                    {g.value}
                    {g.unit}
                  </div>
                )}

                <span style={{ fontSize: '14px', color: (g.value ?? 0) > 50 ? '#48bb78' : '#f56565' }}>
                  {(g.value ?? 0) > 50 ? '▲' : '▼'}
                </span>
              </div>

              <div style={{ height: '6px', background: '#0d1117', borderRadius: '3px', marginTop: '15px', overflow: 'hidden' }}>
                <div style={{ width: `${Number(g.value ?? 0)}%`, height: '100%', background: g.color || '#3182ce', transition: 'width 1s ease-in-out' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
