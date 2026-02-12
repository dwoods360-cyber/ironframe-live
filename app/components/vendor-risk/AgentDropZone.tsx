'use client';
import React from 'react';

type Props = {
  onDetectedVendor?: (name: string) => void;
  onScanComplete?: (extractedData: Record<string, unknown>, discrepancy: Record<string, unknown>) => void;
  onScanStart?: () => void;
};

export default function AgentDropZone({ onDetectedVendor, onScanComplete, onScanStart }: Props) {
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onScanStart?.();
    
    const text = e.dataTransfer.getData('text/plain') || '';
    const detectedVendorName = text.trim() || 'Unknown Vendor';
    
    onDetectedVendor?.(detectedVendorName);
    
    // Mocking the scan completion data structure required by the feed
    onScanComplete?.(
      { name: detectedVendorName, type: 'MSA' },
      { doc: 'MSA_v1', req: 'Data Privacy', tenant: 'High Encryption', vendor: 'Standard Encryption' }
    );
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      style={{
        border: '1px dashed #2d3139',
        borderRadius: '10px',
        padding: '18px',
        background: '#0d1117',
        color: '#a0aec0',
        fontSize: '11px',
        cursor: 'pointer',
        textAlign: 'center'
      }}
    >
      DROP ARTIFACT HERE FOR AGENT_SCAN
    </div>
  );
}
