'use client';

/**
 * PROGRAMMER'S NOTES — ZERO-TRUST INGESTION PORT
 *
 * - This component is the Zero-Trust Ingestion Port for vendor artifacts.
 * - It MUST interface exclusively with the DMZ pipeline defined in `upload-to-dmz.ts`.
 * - All file ingress and persistence MUST flow through `uploadToQuarantine` and nowhere else.
 * - Two-step flow: stage file (verify) → confirm → DMZ upload. No upload until user confirms.
 * - Do NOT introduce alternate upload paths, client-only storage, or any bypass around the DMZ.
 * - Changes to this component should be reviewed with security context in mind.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { X, Upload, Loader2, ShieldCheck } from 'lucide-react';
import { uploadToQuarantine } from '@/app/actions/upload-to-dmz';

type UploadState = 'idle' | 'staged' | 'scanning' | 'success';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (data: unknown) => void;
  /** Tenant slug or id for DMZ; falls back to URL segment [tenant] when omitted or empty. */
  tenantId?: string | null;
  /** When opening the modal with a file already staged (e.g. from page drop zone), pass it here. */
  initialStagedFile?: File | null;
  /** Called after the modal has applied initialStagedFile so the parent can clear it. */
  onClearInitialFile?: () => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadArtifactModal({
  isOpen,
  onClose,
  onUploadComplete,
  tenantId: tenantIdProp,
  initialStagedFile,
  onClearInitialFile,
}: Props) {
  const params = useParams();
  const tenantFromUrl = params.tenant;
  const effectiveTenant = useMemo(() => {
    const fromProp = tenantIdProp?.trim() ?? '';
    if (fromProp) return fromProp;
    const fromUrl = typeof tenantFromUrl === 'string' ? tenantFromUrl : tenantFromUrl?.[0];
    return (fromUrl ?? '').toString();
  }, [tenantIdProp, tenantFromUrl]);

  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && initialStagedFile) {
      setStagedFile(initialStagedFile);
      setUploadState('staged');
      setError(null);
      onClearInitialFile?.();
    }
  }, [isOpen, initialStagedFile, onClearInitialFile]);

  const performUpload = useCallback(
    async (file: File) => {
      if (!effectiveTenant) {
        setError('Tenant context is required for DMZ upload. Open this modal from a tenant route (e.g. /{tenant}/vendors) or pass tenantId.');
        setUploadState('staged');
        return;
      }

      setError(null);
      setUploadState('scanning');
      try {
        const formData = new FormData();
        formData.set('file', file);

        const result = await uploadToQuarantine(formData, effectiveTenant);

        if (result && (result as { success?: boolean }).success) {
          setUploadState('success');
          onUploadComplete(result);
        } else {
          throw new Error('DMZ upload did not return success.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.');
        setUploadState('staged');
      }
    },
    [onUploadComplete, effectiveTenant]
  );

  const handleFileSelect = useCallback((file: File | null) => {
    setError(null);
    setStagedFile(file);
    setUploadState(file ? 'staged' : 'idle');
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploadState === 'scanning') return;
    handleFileSelect(file);
  };

  const handleConfirmScan = useCallback(() => {
    if (!stagedFile || uploadState !== 'staged') return;
    void performUpload(stagedFile);
  }, [stagedFile, uploadState, performUpload]);

  const handleDropzoneClick = () => {
    if (uploadState === 'scanning') return;
    inputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (uploadState !== 'idle') return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploadState !== 'idle') return;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    handleFileSelect(file);
  };

  if (!isOpen) return null;

  const borderColor = isDragging ? '#60a5fa' : '#30363d';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: '#161b22',
          padding: '24px',
          borderRadius: '8px',
          width: '400px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>UPLOAD_ARTIFACT</h3>
          <X size={20} cursor="pointer" onClick={onClose} />
        </div>

        <input
          ref={inputRef}
          type="file"
          onChange={handleFileChange}
          disabled={uploadState === 'scanning'}
          style={{ display: 'none' }}
          aria-hidden
        />

        {/* IDLE: dropzone */}
        {uploadState === 'idle' && (
          <div
            role="button"
            tabIndex={0}
            onClick={handleDropzoneClick}
            onKeyDown={(e) => e.key === 'Enter' && handleDropzoneClick()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              marginTop: '20px',
              border: `2px dashed ${borderColor}`,
              padding: '40px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'border-color 0.15s ease-out, opacity 0.15s ease-out',
            }}
          >
            <Upload size={32} />
            <p>
              {isDragging
                ? 'Drop file to stage for DMZ'
                : 'Click or drag a file here to stage for security scan'}
            </p>
          </div>
        )}

        {/* STAGED: verify and confirm */}
        {uploadState === 'staged' && stagedFile && (
          <div style={{ marginTop: '20px' }}>
            <div
              style={{
                border: '2px solid #30363d',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                background: '#0d1117',
              }}
            >
              <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#8b949e', textTransform: 'uppercase' }}>
                File
              </p>
              <p style={{ margin: 0, fontWeight: 600 }}>{stagedFile.name}</p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#8b949e' }}>
                {formatFileSize(stagedFile.size)}
              </p>
              <p style={{ margin: '12px 0 0', fontSize: '11px', color: '#8b949e', textTransform: 'uppercase' }}>
                Destination tenant / vendor context
              </p>
              <p style={{ margin: '4px 0 0', fontWeight: 600 }}>
                {effectiveTenant || <span style={{ color: '#f87171' }}>Not set — upload will fail</span>}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={handleConfirmScan}
                disabled={!effectiveTenant}
                style={{
                  padding: '12px 16px',
                  background: effectiveTenant ? '#238636' : '#21262d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: effectiveTenant ? 'pointer' : 'not-allowed',
                }}
              >
                Confirm & Initiate Security Scan
              </button>
              <button
                type="button"
                onClick={() => handleFileSelect(null)}
                style={{
                  padding: '8px',
                  background: 'transparent',
                  color: '#8b949e',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Choose different file
              </button>
            </div>
          </div>
        )}

        {/* SCANNING: Agent 12 / Agent 4 in DMZ */}
        {uploadState === 'scanning' && (
          <div
            style={{
              marginTop: '24px',
              padding: '32px 24px',
              textAlign: 'center',
              border: '2px dashed #30363d',
              borderRadius: '8px',
            }}
          >
            <Loader2 size={40} className="animate-spin" style={{ marginBottom: '16px' }} />
            <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Security scan in progress</p>
            <p style={{ margin: 0, fontSize: '12px', color: '#8b949e' }}>
              Agent 12 / Agent 4 intercepting file in DMZ
            </p>
          </div>
        )}

        {/* SUCCESS */}
        {uploadState === 'success' && (
          <div
            style={{
              marginTop: '24px',
              padding: '32px 24px',
              textAlign: 'center',
              border: '2px solid #238636',
              borderRadius: '8px',
              background: 'rgba(35, 134, 54, 0.1)',
            }}
          >
            <ShieldCheck size={40} style={{ color: '#3fb950', marginBottom: '16px' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Upload complete</p>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#8b949e' }}>
              File secured in DMZ. Agents will process.
            </p>
          </div>
        )}

        {error && (
          <p
            style={{
              marginTop: '12px',
              color: '#f87171',
              fontSize: '14px',
            }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
