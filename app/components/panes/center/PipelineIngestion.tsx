'use client';
import React from 'react';
import type { Risk } from '@/app/types/domain';

export type PipelineIngestionProps = {
  risks?: Risk[];
  onAction?: (riskId: number, action: string, note?: string, newScore?: number) => void | Promise<void>;

  // allow forward-compat without breaking builds
  [key: string]: Record<string, unknown>;
};

export default function PipelineIngestion({ risks = [], onAction }: PipelineIngestionProps) {
  return (
    <div style={{ padding: 10, borderBottom: '1px solid #2d3139', background: '#161b22' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#c9d1d9' }}>Pipeline Ingestion</div>
      <div style={{ marginTop: 6, fontSize: 11, color: '#8b949e' }}>
        {risks.length} risks loaded
      </div>

      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => onAction?.(0, 'PENDING_AGENT', 'Triggered demo ingestion')}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #30363d',
            background: '#21262d',
            color: '#c9d1d9',
            fontSize: 11,
            cursor: onAction ? 'pointer' : 'not-allowed',
            opacity: onAction ? 1 : 0.6,
          }}
          disabled={!onAction}
        >
          Demo ingest
        </button>
      </div>
    </div>
  );
}
