"use client";

import SalesAgentPortalContent from "@/app/components/marketing/SalesAgentPortalContent";

interface SalesAgentSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Marketing homepage slide-over only — dedicated route uses full-page layout. */
export default function SalesAgentSlideOver({ isOpen, onClose }: SalesAgentSlideOverProps) {
  if (!isOpen) return null;

  return (
    <div className="animate-fadeIn fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300">
      <button
        type="button"
        className="absolute inset-0 -z-10 cursor-default"
        aria-label="Close sales specialist panel"
        onClick={onClose}
      />

      <div className="relative flex h-full w-full max-w-lg flex-col justify-between overflow-y-auto border-l border-slate-800 bg-[#040a1b] p-4 shadow-2xl sm:p-6">
        <div className="space-y-6">
          <header className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="min-w-0 flex-1">
              <p className="mb-1 font-mono text-[9px] leading-snug tracking-wide text-cyan-400 uppercase sm:text-[10px]">
                PRE-FLIGHT LEAD CONVERSION GATES
              </p>
              <h2 className="font-sans text-base font-bold text-white sm:text-lg">
                AI Growth & Strategy Specialist
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded border border-slate-800 bg-slate-900 font-mono text-slate-400 transition-transform active:scale-95 hover:text-white"
              aria-label="Close panel"
            >
              ✕
            </button>
          </header>

          <SalesAgentPortalContent />
        </div>

        <footer className="mt-8 flex justify-between border-t border-slate-900 pt-4 font-mono text-[9px] text-slate-600">
          <span>PORTAL_REF: AM_CONVERT_V1</span>
          <span>SYSTEM STATE: DETERMINISTIC</span>
        </footer>
      </div>
    </div>
  );
}
