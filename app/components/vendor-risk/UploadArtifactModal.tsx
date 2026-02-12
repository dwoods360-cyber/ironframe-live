'use client';
import React from 'react';
import { X, Upload } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (data: unknown) => void;
};

export default function UploadArtifactModal({ isOpen, onClose, onUploadComplete }: Props) {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#161b22', padding: '24px', borderRadius: '8px', width: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>UPLOAD_ARTIFACT</h3>
          <X size={20} cursor="pointer" onClick={onClose} />
        </div>
        <div onClick={() => onUploadComplete({})} style={{ marginTop: '20px', border: '2px dashed #30363d', padding: '40px', textAlign: 'center', cursor: 'pointer' }}>
          <Upload size={32} />
          <p>Click to Upload</p>
        </div>
      </div>
    </div>
  );
}
