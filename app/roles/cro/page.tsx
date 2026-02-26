'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Metrics = Record<string, unknown>;

export default function CroRolePage() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://build-bypass.supabase.co';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'build-bypass-key';
    return createClient(url, key);
  }, []);

  const [metrics, setMetrics] = useState<Metrics>({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setStatus('');
    const { data, error } = await supabase
      .from('stakeholder_metrics')
      .select('metric_data')
      .eq('role_key', 'cro')
      .single();

    if (error) {
      setStatus(`Load failed: ${error.message}`);
      setLoading(false);
      return;
    }

    setMetrics((data?.metric_data as Metrics) || {});
    setStatus('Loaded.');
    setLoading(false);
  }, [supabase]);

  const handleUpdate = useCallback(async () => {
    setLoading(true);
    setStatus('');
    const { error } = await supabase
      .from('stakeholder_metrics')
      .update({ metric_data: metrics })
      .eq('role_key', 'cro');

    if (error) {
      setStatus(`Save failed: ${error.message}`);
      setLoading(false);
      return;
    }

    setStatus('Saved.');
    setLoading(false);
  }, [supabase, metrics]);

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>CRO Dashboard</h1>

      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button
          onClick={() => void fetchMetrics()}
          disabled={loading}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #333' }}
        >
          {loading ? 'Loading…' : 'Load metrics'}
        </button>

        <button
          onClick={() => void handleUpdate()}
          disabled={loading}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #333' }}
        >
          Save metrics
        </button>
      </div>

      {status ? <p style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>{status}</p> : null}

      <pre style={{ marginTop: 16, background: '#111', color: '#eee', padding: 12, borderRadius: 10, overflow: 'auto' }}>
{JSON.stringify(metrics, null, 2)}
      </pre>
    </div>
  );
}
