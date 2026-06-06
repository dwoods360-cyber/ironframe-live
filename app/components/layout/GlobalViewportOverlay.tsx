"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  LAYOUT_GLOBAL_MODAL_Z_CLASS,
  LAYOUT_VIEWPORT_HEADER_OFFSET_CLASS,
  LAYOUT_VIEWPORT_HEADER_OFFSET_SIMULATION_CLASS,
} from "@/app/config/layoutConstants";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";

export type GlobalViewportOverlayProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Passed to `role="dialog"` for a11y (`aria-labelledby`). */
  ariaLabelledBy?: string;
  /** Inner panel wrapper — width, max-height, borders, etc. */
  panelClassName?: string;
  /** Backdrop tint / blur override. */
  backdropClassName?: string;
};

const DEFAULT_PANEL =
  "flex max-h-[min(90vh,calc(100dvh-8rem))] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950/95 shadow-2xl shadow-black/50";

/**
 * Feature 6 — portaled modal shell: escapes tripane column stacking (right rail z-10),
 * renders above the fixed header stack (z-40), and keeps content below header clearance.
 */
export default function GlobalViewportOverlay({
  open,
  onClose,
  children,
  ariaLabelledBy,
  panelClassName = DEFAULT_PANEL,
  backdropClassName = "bg-black/55 backdrop-blur-md",
}: GlobalViewportOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const isSimulationMode = useSystemConfigStore().isSimulationMode;
  const topOffset = isSimulationMode
    ? LAYOUT_VIEWPORT_HEADER_OFFSET_SIMULATION_CLASS
    : LAYOUT_VIEWPORT_HEADER_OFFSET_CLASS;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close dialog"
        className={`fixed inset-0 ${LAYOUT_GLOBAL_MODAL_Z_CLASS} ${backdropClassName}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        className={`fixed inset-x-0 bottom-0 ${topOffset} ${LAYOUT_GLOBAL_MODAL_Z_CLASS} flex items-start justify-center overflow-y-auto p-4 sm:items-center`}
      >
        <div className={panelClassName} onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}
