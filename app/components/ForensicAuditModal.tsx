"use client";

import { useCallback } from "react";
import { Clipboard, Shield, X } from "lucide-react";
import GlobalViewportOverlay from "@/app/components/layout/GlobalViewportOverlay";

export type ForensicAuditModalProps = {
  isOpen: boolean;
  onClose: () => void;
  threatId: string;
  markdownAuditBlock: string;
};

export function ForensicAuditModal({
  isOpen,
  onClose,
  threatId,
  markdownAuditBlock,
}: ForensicAuditModalProps) {
  const handleCopyToClipboard = useCallback(() => {
    void navigator.clipboard.writeText(markdownAuditBlock);
  }, [markdownAuditBlock]);

  const inspectionLabel = threatId.trim()
    ? `INSPECTION WINDOW // THREAT_${threatId.substring(0, 8).toUpperCase()}`
    : "INSPECTION WINDOW // THREAT_UNKNOWN";

  return (
    <GlobalViewportOverlay
      open={isOpen}
      onClose={onClose}
      ariaLabelledBy="forensic-audit-modal-title"
      backdropClassName="bg-black/80 backdrop-blur-sm"
      panelClassName="flex max-h-[min(85vh,calc(100dvh-8rem))] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-cyan-500" aria-hidden />
          <span
            id="forensic-audit-modal-title"
            className="font-mono text-xs font-bold tracking-wider text-slate-200"
          >
            {inspectionLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-500 transition-colors hover:text-slate-300"
          aria-label="Close inspection window"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-800/60 bg-slate-900/40 px-4 py-2 text-xs">
        <button
          type="button"
          onClick={handleCopyToClipboard}
          className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-[10px] text-slate-400 transition-all hover:border-slate-700 hover:text-slate-200"
          data-testid="forensic-audit-copy"
        >
          <Clipboard className="h-3 w-3" aria-hidden />
          COPY ARTIFACT
        </button>
        <div className="ml-auto font-mono text-[10px] text-slate-600">STATUS: SECURE REGISTRY</div>
      </div>

      <div className="flex-1 overflow-y-auto border-b border-slate-800 bg-slate-950 p-5 font-mono text-xs text-slate-300">
        <pre className="whitespace-pre-wrap rounded border border-slate-900 bg-slate-950 p-4 font-mono text-[11px] leading-relaxed">
          {markdownAuditBlock}
        </pre>
      </div>

      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900 px-4 py-2.5 font-mono text-[10px] text-slate-500">
        <div>ENFORCEMENT SYSTEM: ACTIVE (AGENT 5)</div>
        <div>CONFIDENTIALITY: TENANT_SECURE</div>
      </div>
    </GlobalViewportOverlay>
  );
}
