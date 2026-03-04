'use client';
import React, { useMemo, useState } from 'react';
import type { Risk } from '@/app/types/domain';

type Props = {
  risks: Risk[];
  [key: string]: any;
};

export default function ActiveRisks({ risks }: Props) {
  const [search, setSearch] = useState('');
  const lower = search.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      !lower
        ? risks
        : risks.filter((r) => {
            const title = r.title.toLowerCase();
            const desc = r.description?.toLowerCase() ?? '';
            const owner = r.owner?.toLowerCase() ?? '';
            const status = r.status?.toLowerCase() ?? '';
            return (
              title.includes(lower) ||
              desc.includes(lower) ||
              owner.includes(lower) ||
              status.includes(lower)
            );
          }),
    [risks, lower],
  );

  return (
    <div style={{ padding: 10, color: '#c9d1d9', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ marginBottom: 6, fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>
        Active Risks ({filtered.length} of {risks.length})
      </div>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search active risks by title, owner, status…"
        style={{
          width: '100%',
          padding: '4px 8px',
          marginBottom: 8,
          borderRadius: 4,
          border: '1px solid #30363d',
          backgroundColor: '#0d1117',
          color: '#c9d1d9',
          fontSize: 12,
        }}
        aria-label="Search active risks"
      />
    </div>
  );
}
