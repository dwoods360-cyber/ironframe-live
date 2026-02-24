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
import { X, Loader2, ShieldCheck } from 'lucide-react';
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

        {/* IDLE: enterprise GRC ingestion dropzone */}
        {uploadState === 'idle' && (
          <div
            role="button"
            tabIndex={0}
            onClick={handleDropzoneClick}
            onKeyDown={(e) => e.key === 'Enter' && handleDropzoneClick()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative mt-5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-slate-900/50 p-10 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-blue-500/50 bg-slate-800/50'
                : 'border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/50'
            }`}
          >
            {/* Security Iconography */}
            <div className="mb-4 rounded-full bg-slate-950 p-4 ring-1 ring-slate-800">
              <svg
                className="h-8 w-8 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>

            {/* Primary Instruction */}
            <h3 className="mb-1 text-lg font-semibold text-slate-200">
              Secure Artifact Ingestion
            </h3>
            <p className="mb-6 max-w-sm text-sm text-slate-400">
              {isDragging
                ? 'Drop file to route to Level 2 DMZ.'
                : 'Drag and drop evidence files, or click to browse. All payloads are routed directly to the Level 2 DMZ Air-Gap.'}
            </p>

            {/* Interactive Button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDropzoneClick(); }}
              className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Select Artifact
            </button>

            {/* GRC Constraints & Agent Branding */}
            <div className="mt-8 flex w-full flex-col items-center justify-center space-y-2 border-t border-slate-800 pt-4">
              <div className="flex items-center space-x-2 text-xs font-medium text-amber-500/80">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>AGENT 14 (IRONGATE) INTERCEPT ACTIVE</span>
              </div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500">
                Supported: PDF, DOCX, CSV, XLSX (Max 50MB)
              </span>
            </div>
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
