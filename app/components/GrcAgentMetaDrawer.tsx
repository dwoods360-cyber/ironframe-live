"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Link from "next/link";
import { CONSTITUTIONAL_DIRECTIVE_BY_ID } from "@/app/config/constitutionalDirectives";
import {
  LAYOUT_DRAWER_BACKDROP_Z_CLASS,
  LAYOUT_DRAWER_PANEL_Z_CLASS,
  LAYOUT_VIEWPORT_HEADER_OFFSET_CLASS,
  LAYOUT_VIEWPORT_HEADER_OFFSET_SIMULATION_CLASS,
} from "@/app/config/layoutConstants";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";
import { useGrcAgentMetaDrawerStore } from "@/app/store/grcAgentMetaDrawerStore";
import { resolveTasConstitutionHref } from "@/app/utils/tasConstitutionDeepLink";

/**
 * GRC-002 agent specification drawer — portaled to `document.body` so `fixed` positioning
 * escapes the dashboard left rail (z-0) vs Audit Intelligence right rail (z-10) stacking trap.
 */
export default function GrcAgentMetaDrawer() {
  const isOpen = useGrcAgentMetaDrawerStore((s) => s.isOpen);
  const selectedAgent = useGrcAgentMetaDrawerStore((s) => s.selectedAgent);
  const close = useGrcAgentMetaDrawerStore((s) => s.close);
  const isSimulationMode = useSystemConfigStore().isSimulationMode;
  const topOffset = isSimulationMode
    ? LAYOUT_VIEWPORT_HEADER_OFFSET_SIMULATION_CLASS
    : LAYOUT_VIEWPORT_HEADER_OFFSET_CLASS;
  const [mounted, setMounted] = useState(false);
  const [panelEntered, setPanelEntered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setPanelEntered(false);
      return;
    }
    const frame = requestAnimationFrame(() => setPanelEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [isOpen, selectedAgent?.index]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!mounted || !isOpen || !selectedAgent) return null;

  const directiveKey = selectedAgent.name.toLowerCase();
  const directive = CONSTITUTIONAL_DIRECTIVE_BY_ID[directiveKey];
  const mandate =
    directive?.summary ??
    "Governed under strict /docs/TAS.md architectural enforcement. Cross-tenant memory bleed is zero-tolerance blocked.";
  const tasHref = directive
    ? resolveTasConstitutionHref(directive.anchorId, directive.tasLine)
    : "/constitution/tas";

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close agent specification drawer"
        className={`fixed inset-0 ${LAYOUT_DRAWER_BACKDROP_Z_CLASS} bg-black/45 backdrop-blur-[1px]`}
        onClick={close}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="grc-agent-meta-drawer-title"
        className={`fixed right-0 ${topOffset} bottom-0 flex w-[min(100vw,380px)] flex-col border-l border-slate-800 bg-[#09111f] p-6 font-mono text-white shadow-[-12px_0_40px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out ${LAYOUT_DRAWER_PANEL_Z_CLASS} ${
          panelEntered ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="mb-4 flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="min-w-0">
            <p id="grc-agent-meta-drawer-title" className="text-sm font-bold text-cyan-400">
              {selectedAgent.name} SPECIFICATION
            </p>
            <span className="mt-2 inline-block rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
              ACTIVE
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            className="shrink-0 rounded border border-slate-700/80 p-1 text-slate-500 transition-colors hover:border-slate-600 hover:text-slate-300"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto text-xs">
          <div>
            <span className="block text-slate-500">GRC Function ID:</span>
            <span className="text-slate-200">{`GRC-002-A${selectedAgent.index}`}</span>
          </div>
          <div>
            <span className="block text-slate-500">Data plane:</span>
            <span className="text-slate-200">{selectedAgent.dataSource}</span>
          </div>
          <div>
            <span className="block text-slate-500">Immutable Core Mandate:</span>
            <div className="mt-1 rounded border border-slate-800 bg-[#050a12] p-3 leading-relaxed text-slate-400">
              {mandate}
            </div>
          </div>
          {directive ? (
            <Link
              href={tasHref}
              className="inline-block text-[10px] font-bold uppercase tracking-wide text-cyan-400/90 hover:text-cyan-300"
              onClick={close}
            >
              Open TAS anchor · {directive.anchorId}
            </Link>
          ) : null}
        </div>
      </aside>
    </>,
    document.body,
  );
}
