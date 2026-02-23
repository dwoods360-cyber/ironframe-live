'use client';

/**
 * PROGRAMMER'S NOTES — AGENT 12 / AGENT 4 INVISIBLE INGESTION NET
 *
 * - This component installs a window-level Global Drop Zone for zero-touch ingestion.
 * - All captured files are funneled into the DMZ via `upload-to-dmz.ts` (uploadToQuarantine).
 * - Agent 12 / Agent 4 observe and process files from the quarantine bucket; no other persistence is allowed here.
 * - If no tenant context is present in the URL, this net stays inert and ignores drag events.
 * - Do NOT add alternate upload paths, client-only storage, or bypasses around the DMZ pipeline.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { uploadToQuarantine } from '@/app/actions/upload-to-dmz';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function GlobalDropZone() {
  const params = useParams();

  const tenant = useMemo(() => {
    const raw = (params as any)?.tenant;
    if (!raw) return '';
    return typeof raw === 'string' ? raw : raw[0] ?? '';
  }, [params]);

  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<UploadStatus>('idle');

  useEffect(() => {
    if (!tenant) {
      return;
    }

    let dragDepth = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragDepth += 1;
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragDepth -= 1;
      if (dragDepth <= 0) {
        dragDepth = 0;
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      dragDepth = 0;
      setIsDragging(false);

      const file = e.dataTransfer?.files?.[0];
      if (!file) {
        return;
      }

      try {
        setStatus('uploading');
        const formData = new FormData();
        formData.append('file', file);
        await uploadToQuarantine(formData, tenant);
        setStatus('success');
        setTimeout(() => setStatus('idle'), 2000);
      } catch (err) {
        console.error('GlobalDropZone DMZ upload failed', err);
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [tenant]);

  if (!tenant) {
    // No tenant context; keep the net inert.
    return null;
  }

  return (
    <>
      {isDragging && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-xs font-bold tracking-[0.35em] text-slate-200 uppercase">
              DROP FILE FOR SECURE INGESTION
            </p>
            <p className="mt-3 text-[10px] font-mono text-emerald-400 uppercase">
              // SENTINEL SWEEP STANDBY
            </p>
          </div>
        </div>
      )}

      {status !== 'idle' && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[101] -translate-x-1/2">
          <div className="rounded-full border border-slate-700 bg-slate-900/90 px-4 py-1.5 text-[10px] font-mono text-slate-200 shadow-lg">
            {status === 'uploading' && 'Routing file to DMZ ingress…'}
            {status === 'success' && 'File secured in DMZ. Agents notified.'}
            {status === 'error' && 'DMZ upload failed. Check Sentinel logs.'}
          </div>
        </div>
      )}
    </>
  );
}

