'use client';
import React, { useState } from 'react';

export default function SandboxPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const executeDelete = () => {
    if (deleteTarget) {
      // FIX: Explicitly handle the 'unknown' type to allow .id access
      setDocuments(prev => prev.filter(d => d.id !== (deleteTarget as any).id));
      setDeleteTarget(null);
    }
  };

  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <h1>Sandbox Artifacts</h1>
      {/* Sandbox logic would continue here */}
    </div>
  );
}
