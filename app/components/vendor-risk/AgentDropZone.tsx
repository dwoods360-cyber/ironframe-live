'use client';
import React from 'react';
import { logToQuarantine } from '@/app/actions/quarantine'; // Import the new action

type Props = {
  onDetectedVendor?: (name: string) => void;
  onScanComplete?: (extractedData: Record<string, unknown>, discrepancy: Record<string, unknown>) => void;
  onScanStart?: () => void;
};

export default function AgentDropZone({ onDetectedVendor, onScanComplete, onScanStart }: Props) {
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onScanStart?.();
    
    // 1. Get the file name from the dropped file
    const file = e.dataTransfer.files[0];
    const fileName = file?.name || 'Unknown_Artifact.pdf';
    
    // 2. Trigger the real Air-Gap Ingestion
    const result = await logToQuarantine(fileName);

    if (result.success) {
       onDetectedVendor?.(fileName);
       // Now passing real record ID context
       onScanComplete?.(
         { name: fileName, type: 'QUARANTINED', dbId: result.record?.id },
         { status: 'PENDING_AGENT_14' }
       );
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="border-2 border-dashed border-[#2d3139] rounded-xl p-6 bg-[#0d1117] text-[#a0aec0] text-[11px] cursor-pointer text-center hover:border-blue-500 transition-colors"
    >
      DROP ARTIFACT HERE FOR AGENT_SCAN
    </div>
  );
}