'use client';

/**
 * PROGRAMMER'S NOTES — GLOBAL DROP ZONE (AGENT 12 / AGENT 4)
 *
 * - This layout installs a tenant-scoped Global Drop Zone for zero-touch ingestion.
 * - All files dropped anywhere in the tenant surface are routed into the DMZ via `upload-to-dmz.ts`.
 * - Agent 12 / Agent 4 intercept the file in the quarantine bucket; no direct persistence is allowed here.
 * - Do NOT introduce alternate upload paths or bypasses; always call `uploadToQuarantine` for global drops.
 * - UI-only behavior (overlay, hints) may change, but the ingestion pipeline MUST remain DMZ-only.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { uploadToQuarantine } from '@/app/actions/upload-to-dmz';

type TenantLayoutProps = {
  children: React.ReactNode;
};

export default function TenantLayout({ children }: TenantLayoutProps) {
  const params = useParams();
  const [isDraggingGlobally, setIsDraggingGlobally] = useState(false);

  const tenant = useMemo(() => {
    const raw = (params as any)?.tenant;
    if (!raw) return '';
    return typeof raw === 'string' ? raw : raw[0] ?? '';
  }, [params]);

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.target === e.currentTarget) {
        setIsDraggingGlobally(true);
      }
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.target === e.currentTarget) {
        setIsDraggingGlobally(false);
      }
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Prevent browser from navigating / opening the file on drop
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDraggingGlobally(false);

      // Only treat drops on the layout background as global; inner drop zones handle their own logic.
      if (e.target !== e.currentTarget) {
        return;
      }

      const file = e.dataTransfer.files?.[0];
      if (!file || !tenant) {
        return;
      }

      try {
        const formData = new FormData();
        formData.set('file', file);
        await uploadToQuarantine(formData, tenant);
      } catch (err) {
        // Intentionally silent for now; dedicated components can surface detailed status.
        console.error('Global DMZ upload failed', err);
      }
    },
    [tenant]
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative h-full"
    >
      {children}

      {isDraggingGlobally && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-xs font-bold tracking-[0.3em] text-slate-300 uppercase">
              DROP FILE FOR SECURE INGESTION
            </p>
            <p className="mt-3 text-[10px] font-mono text-emerald-400 uppercase">
              // SENTINEL SWEEP STANDBY
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

