'use client';
import React from 'react';
import type { Risk } from '@/app/types/domain';

type Props = {
  risks: Risk[];
  onAction: (riskId: number, action: string, note?: string, newScore?: number) => Promise<void>;
  [key: string]: any;
};

export default function PipelineIngestion({ risks, onAction }: Props) {
  return <div style={{ padding: 10, color: '#c9d1d9' }}>Pipeline Ingestion ({risks.length} pending)</div>;
}
