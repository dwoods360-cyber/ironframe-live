'use client';
import React from 'react';
import type { Risk } from '@/app/types/domain';

type Props = {
  risks: Risk[];
  onAction: (riskId: number, action: string, note?: string, newScore?: number) => Promise<void>;
  onAddRisk: (risk: any) => void;
  [key: string]: any;
};

export default function RiskRegistration({ risks, onAction, onAddRisk }: Props) {
  return <div style={{ padding: 10, color: '#c9d1d9' }}>Risk Registration ({risks.length})</div>;
}
