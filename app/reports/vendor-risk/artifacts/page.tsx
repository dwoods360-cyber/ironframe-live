'use client';
import React, { useState } from 'react';
import { FolderOpen, MoreVertical, Trash2 } from 'lucide-react';
import Header from '../../../components/structure/Header';

export default function ArtifactsPage() {
  const [documents] = useState<Record<string, unknown>[]>([]);
  const handleView = (doc: Record<string, unknown>) => {
    window.open((doc.url as string) || '#', '_blank');
  };

  return (
    <div style={{ background: '#0d1117', minHeight: '100vh', color: 'white' }}>
      <Header />
      <div style={{ padding: '24px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FolderOpen /> ARTIFACTS</h2>
        {documents.map((doc, i) => (
          <div key={i} onClick={() => handleView(doc)}><MoreVertical size={14} /><Trash2 size={14} /></div>
        ))}
      </div>
    </div>
  );
}
