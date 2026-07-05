"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import InTenantSupportModal from "@/app/components/support/InTenantSupportModal";
import { REQUEST_ENGINEERING_HELP_LABEL } from "@/app/components/support/RequestEngineeringHelpTrigger";
import {
  LAYOUT_AGENT_INSPECT_DRAWER_TOP_CLASS,
  LAYOUT_AGENT_INSPECT_DRAWER_TOP_SIM_CLASS,
  LAYOUT_DRAWER_BACKDROP_Z_CLASS,
  LAYOUT_DRAWER_PANEL_Z_CLASS,
} from "@/app/config/layoutConstants";
import { useTenantBillingGate } from "@/app/context/TenantBillingGateContext";
import { isDemoModeActive } from "@/app/lib/demo/demoMode";
import { useInTenantSupportDrawerStore } from "@/app/store/inTenantSupportDrawerStore";
import { useGetStartedReaderStore } from "@/app/store/getStartedReaderStore";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";
import { isDemoRouteGroupPath } from "@/app/utils/grcRouteMatch";

export default function InTenantSupportDrawer() {
  const pathname = usePathname();
  const { billingBlocked } = useTenantBillingGate();
  const { isOpen, close } = useInTenantSupportDrawerStore();
  const isSimulationMode = useSystemConfigStore().isSimulationMode;
  const inlineDocHref = useGetStartedReaderStore().inlineDocHref;
  const demoSandbox = isDemoRouteGroupPath(pathname) || isDemoModeActive();
  const isGetStartedOrientationReader =
    (pathname === "/get-started" || pathname.startsWith("/get-started/")) &&
    Boolean(inlineDocHref);
  const [mounted, setMounted] = useState(false);
  const [panelEntered, setPanelEntered] = useState(false);

  const topOffset = useMemo(() => {
    if (isGetStartedOrientationReader) {
      if (demoSandbox && isSimulationMode) return "top-[11.75rem]";
      if (demoSandbox || isSimulationMode) return "top-[8.75rem]";
      return "top-[6.5rem]";
    }
    if (demoSandbox && isSimulationMode) return "top-[13.5rem]";
    if (demoSandbox || isSimulationMode) return LAYOUT_AGENT_INSPECT_DRAWER_TOP_SIM_CLASS;
    return LAYOUT_AGENT_INSPECT_DRAWER_TOP_CLASS;
  }, [demoSandbox, isGetStartedOrientationReader, isSimulationMode]);

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
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close support drawer"
        className={`fixed inset-x-0 bottom-0 ${topOffset} ${LAYOUT_DRAWER_BACKDROP_Z_CLASS} bg-black/45 backdrop-blur-[1px]`}
        onClick={close}
      />
      <aside
        id="in-tenant-support-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="in-tenant-support-drawer-title"
        className={`fixed right-0 ${topOffset} bottom-0 grid w-[min(100vw,420px)] grid-rows-[auto_minmax(0,1fr)] border-l border-slate-800 bg-[#070e20] shadow-[-12px_0_40px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out ${LAYOUT_DRAWER_PANEL_Z_CLASS} ${
          panelEntered ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p
              id="in-tenant-support-drawer-title"
              className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-400"
            >
              {REQUEST_ENGINEERING_HELP_LABEL}
            </p>
            <p className="mt-1 text-[10px] text-slate-500">
              Workspace diagnostics attach automatically to your ticket.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded border border-slate-700/80 text-slate-500 transition hover:border-slate-600 hover:text-slate-300"
            aria-label="Close support drawer"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto overscroll-y-contain custom-scrollbar px-4 py-4 sm:px-5 [scrollbar-gutter:stable]">
          <InTenantSupportModal />
        </div>
      </aside>
    </>,
    document.body,
  );
}
