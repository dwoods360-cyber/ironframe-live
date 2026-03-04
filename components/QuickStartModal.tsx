'use client';

import { useEffect } from 'react';

type QuickStartModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function QuickStartModal({ isOpen, onClose }: QuickStartModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-start-title"
      >
        <div
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-700 bg-slate-800/80 px-5 py-4">
            <h2 id="quick-start-title" className="text-lg font-bold tracking-tight text-white">
              🛡️ Ironframe: Integrated Risk Management (IRM) Quick Start
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-2 text-slate-400 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto px-5 py-6 text-slate-200" style={{ maxHeight: 'calc(90vh - 72px)' }}>
            <ol className="space-y-6 list-none pl-0">
              <li>
                <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-400 mb-2">
                  1. Continuous Monitoring
                </h3>
                <ul className="space-y-1.5 text-sm text-slate-300 list-disc list-inside">
                  <li>Scan the Risk Register for high-impact events.</li>
                  <li>Click any risk to open the Assessment Workspace (the drawer).</li>
                </ul>
              </li>

              <li>
                <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-400 mb-2">
                  2. Risk Assessment
                </h3>
                <ul className="space-y-1.5 text-sm text-slate-300 list-disc list-inside">
                  <li>Open the Assessment Workspace (the drawer) to perform a Qualitative Analysis.</li>
                  <li>Toggle to Executive View for a 3-sentence Board Summary.</li>
                  <li>Toggle to Full Technical Audit to see NIST CSF & SOC 2 Control Mappings.</li>
                  <li>Use the Minimize (Chevron) button to pin the drawer to the sidebar while you monitor the Governance Activity Stream.</li>
                </ul>
              </li>

              <li>
                <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-400 mb-2">
                  3. Control Alignment
                </h3>
                <ul className="space-y-1.5 text-sm text-slate-300 list-disc list-inside">
                  <li>Review the AI-generated NIST CSF & SOC 2 Mapping.</li>
                </ul>
              </li>

              <li>
                <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-400 mb-2">
                  4. Evidence Collection
                </h3>
                <ul className="space-y-1.5 text-sm text-slate-300 list-disc list-inside">
                  <li>Log Analyst Observations in the Analyst Notes section.</li>
                  <li>Click &apos;Commit Evidence to Ledger&apos; to record your work on the Immutable Audit Trail.</li>
                  <li>Click &apos;Email Stakeholders&apos; to send an automated brief to the CISO team.</li>
                </ul>
              </li>

              <li>
                <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-400 mb-2">
                  5. Governance Sign-off
                </h3>
                <p className="text-sm text-slate-300">
                  Finalize the Executive Brief for Board review. Ensure the DMZ SECURE LINK pulsing green light is active before saving sensitive data.
                </p>
              </li>
            </ol>

            <div className="mt-8 pt-4 border-t border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-lg bg-slate-700 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
