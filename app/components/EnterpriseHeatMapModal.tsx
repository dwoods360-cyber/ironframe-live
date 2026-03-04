"use client";

import { useEffect } from "react";
import EnterpriseHeatMap from "./EnterpriseHeatMap";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function EnterpriseHeatMapModal({ isOpen, onClose }: Props) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enterprise Heat Map"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">
            Enterprise Heat Map
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-[10px] font-bold uppercase text-slate-200 hover:bg-slate-700"
          >
            Close
          </button>
        </div>
        <div className="max-h-[85vh] overflow-y-auto p-4">
          <EnterpriseHeatMap />
        </div>
      </div>
    </div>
  );
}
