'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '../../components/structure/Header';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/client';

type StakeholderMetricGauge = {
  label: string;
  value: number;
  unit?: string;
  color?: string;
};

type StakeholderMetricData = {
  summary: string;
  gauges?: StakeholderMetricGauge[];
  // Allow additional keys coming from the DB without breaking the UI.
  [key: string]: unknown;
};

export default function RolePage() {
  const [metrics, setMetrics] = useState<StakeholderMetricData | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Create a stable client instance so hooks can depend on it safely.
  const supabase = useMemo(() => createClient(), []);

  const fetchMetrics = useCallback(async () => {
    const { data } = await supabase
      .from('stakeholder_metrics')
      .select('metric_data')
      .eq('role_key', 'product')
      .single();

    if (data?.metric_data) setMetrics(data.metric_data as StakeholderMetricData);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMetrics();
  }, [fetchMetrics]);

  const handleUpdate = useCallback(async () => {
    if (!metrics) return;

    const { error } = await supabase
      .from('stakeholder_metrics')
      .update({ metric_data: metrics })
      .eq('role_key', 'product');

    if (!error) {
      setIsEditMode(false);
      await fetchMetrics();
    }
  }, [metrics, supabase, fetchMetrics]);

  const navChipStyle = {
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
  };

  if (!metrics) {
    return (
      <div style={{ background: '#0d1117', minHeight: '100vh', color: '#718096', padding: '40px' }}>
        Synchronizing Intelligence Terminal...
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
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>product PERSPECTIVE</h1>

            {isEditMode ? (
              <textarea
                value={(metrics.summary ?? '') as string}
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
              <div onClick={handleUpdate} style={{ ...navChipStyle, background: '#3182ce', color: 'white' }}>
                <span>💾</span> SAVE TO DB
              </div>
            )}

            <div onClick={() => window.print()} style={navChipStyle}>
              <span>🖨️</span> PRINT REPORT
            </div>

            <Link href="/reports" style={navChipStyle}>
              <span>📄</span> BACK
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
                BACK
              </button>
            </Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          {metrics.gauges?.map((g, i) => (
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
                    value={g.value}
                    onChange={(e) => {
                      const nextVal = Number(e.target.value);
                      const nextGauges = [...(metrics.gauges ?? [])];
                      nextGauges[i] = { ...nextGauges[i], value: Number.isFinite(nextVal) ? nextVal : 0 };
                      setMetrics({ ...metrics, gauges: nextGauges });
                    }}
                    style={{
                      background: '#0d1117',
                      color: g.color,
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

                {/* TREND INDICATOR */}
                <span style={{ fontSize: '14px', color: g.value > 50 ? '#48bb78' : '#f56565' }}>{g.value > 50 ? '▲' : '▼'}</span>
              </div>

              <div style={{ height: '6px', background: '#0d1117', borderRadius: '3px', marginTop: '15px', overflow: 'hidden' }}>
                <div style={{ width: g.value + '%', height: '100%', background: g.color || '#3182ce', transition: 'width 1s ease-in-out' }} />
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
