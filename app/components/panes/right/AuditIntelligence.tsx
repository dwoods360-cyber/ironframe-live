'use client';
import React from 'react';
import type { Company } from '@/app/types/domain';

type Props = {
  company: Company | null;
  [key: string]: any;
};

export default function AuditIntelligence({ company }: Props) {
  return <div style={{ padding: 10, color: '#c9d1d9' }}>Audit Intel: {company?.name ?? 'None'}</div>;
}
