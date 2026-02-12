'use client';
import React from 'react';
import type { Risk } from '@/app/types/domain';

type Props = {
  risks: Risk[];
  [key: string]: any;
};

export default function ActiveRisks({ risks }: Props) {
  return <div style={{ padding: 10, color: '#c9d1d9' }}>Active Risks ({risks.length})</div>;
}
