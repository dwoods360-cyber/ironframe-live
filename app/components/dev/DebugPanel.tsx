"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";
import { TENANT_UUIDS, TenantKey } from "@/app/utils/tenantIsolation";
import { useTenantContext } from "@/app/context/TenantProvider";
import { calculateFinancialImpact } from "@/app/utils/scoring";

type AlertPayload = {
  title: string;
  targetData: string;
  liability: number;
  perEventImpact: number;
};

const DEBUG_PANEL_POSITION_STORAGE_KEY = "dev-tenant-switcher-position-v1";

export default function DebugPanel() {
  const { activeTenantKey, activeTenantUuid, setDevTenantOverride } = useTenantContext();
  const isDevelopment = process.env.NODE_ENV === "development";
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    isDragging: false,
    pointerId: -1,
    offsetX: 0,
    offsetY: 0,
  });
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(null);

  const [isTesting, setIsTesting] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [debugMessage, setDebugMessage] = useState<string | null>(null);
  const [alertPayload, setAlertPayload] = useState<AlertPayload | null>(null);
  const [isPanelHovered, setIsPanelHovered] = useState(false);

  useEffect(() => {
    const positionWithinViewport = (nextX: number, nextY: number) => {
      const panel = panelRef.current;
      const panelWidth = panel?.offsetWidth ?? 288;
      const panelHeight = panel?.offsetHeight ?? 360;
      const maxX = Math.max(8, window.innerWidth - panelWidth - 8);
      const maxY = Math.max(8, window.innerHeight - panelHeight - 8);

      return {
        x: Math.min(Math.max(8, nextX), maxX),
        y: Math.min(Math.max(8, nextY), maxY),
      };
    };

    const initializePosition = () => {
      if (!panelRef.current) {
        return;
      }

      setPanelPosition(() => {
        const raw = window.localStorage.getItem(DEBUG_PANEL_POSITION_STORAGE_KEY);

        if (raw) {
          try {
            const parsed = JSON.parse(raw) as { x: number; y: number };
            if (typeof parsed.x === "number" && typeof parsed.y === "number") {
              return positionWithinViewport(parsed.x, parsed.y);
            }
          } catch {
            // no-op
          }
        }

        const panelWidth = panelRef.current?.offsetWidth ?? 288;
        const panelHeight = panelRef.current?.offsetHeight ?? 360;
        return positionWithinViewport(window.innerWidth - panelWidth - 16, window.innerHeight - panelHeight - 16);
      });
    };

    initializePosition();

    const onResize = () => {
      setPanelPosition((current) => {
        if (!current) {
          return current;
        }

        return positionWithinViewport(current.x, current.y);
      });
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!panelPosition) {
      return;
    }

    window.localStorage.setItem(DEBUG_PANEL_POSITION_STORAGE_KEY, JSON.stringify(panelPosition));
  }, [panelPosition]);

  const onDragStart = (event: PointerEvent<HTMLButtonElement>) => {
    if (!panelRef.current || !panelPosition) {
      return;
    }

    dragRef.current.isDragging = true;
    dragRef.current.pointerId = event.pointerId;
    dragRef.current.offsetX = event.clientX - panelPosition.x;
    dragRef.current.offsetY = event.clientY - panelPosition.y;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onDragMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging || event.pointerId !== dragRef.current.pointerId || !panelRef.current) {
      return;
    }

    const panelWidth = panelRef.current.offsetWidth;
    const panelHeight = panelRef.current.offsetHeight;
    const maxX = Math.max(8, window.innerWidth - panelWidth - 8);
    const maxY = Math.max(8, window.innerHeight - panelHeight - 8);
    const nextX = Math.min(Math.max(8, event.clientX - dragRef.current.offsetX), maxX);
    const nextY = Math.min(Math.max(8, event.clientY - dragRef.current.offsetY), maxY);

    setPanelPosition({ x: nextX, y: nextY });
  };

  const onDragEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.isDragging && event.pointerId === dragRef.current.pointerId) {
      dragRef.current.isDragging = false;
      dragRef.current.pointerId = -1;
    }
  };

  const runCrossTenantTest = async () => {
    setIsTesting(true);
    setDebugMessage(null);
    setShieldActive(false);
    setAlertPayload(null);

    try {
      const response = await fetch("/api/medshield/assets", {
        headers: {
          "x-tenant-id": activeTenantUuid ?? "",
          "x-target-tenant-id": TENANT_UUIDS.medshield,
        },
      });

      if (response.status === 403) {
        const impact = calculateFinancialImpact("medshield", "CRITICAL");

        setShieldActive(true);
        setAlertPayload({
          title: "CROSS-TENANT ATTACK NEUTRALIZED",
          targetData: "MEDSHIELD // PATIENT_RECORDS",
          liability: impact.avgBreachLiability,
          perEventImpact: impact.criticalPerEventImpact,
        });
        setDebugMessage("Shield active.");
        setTimeout(() => setShieldActive(false), 2500);
      } else {
        setDebugMessage("Cross-tenant fetch was not blocked (same-tenant or unrestricted context).");
      }
    } catch (error) {
      setDebugMessage(`Debug fetch error: ${(error as Error).message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const setTenant = (tenant: TenantKey | null) => {
    setDevTenantOverride(tenant);
    setDebugMessage(tenant ? `Dev tenant override set to ${tenant.toUpperCase()}` : "Dev tenant override cleared.");
  };

  if (!isDevelopment) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
      onPointerEnter={() => setIsPanelHovered(true)}
      onPointerLeave={() => setIsPanelHovered(false)}
      onMouseEnter={() => setIsPanelHovered(true)}
      onMouseLeave={() => setIsPanelHovered(false)}
      className="fixed z-[80] w-72 rounded border border-slate-700 bg-slate-950/85 p-3 shadow-2xl backdrop-blur-sm transition-opacity duration-200"
      style={panelPosition ? { left: `${panelPosition.x}px`, top: `${panelPosition.y}px`, opacity: isPanelHovered ? 1 : 0.5 } : { right: "16px", bottom: "16px", opacity: isPanelHovered ? 1 : 0.5 }}
    >
      <button
        type="button"
        onPointerDown={onDragStart}
        className="mb-2 w-full cursor-move rounded border border-slate-700 bg-slate-900/90 px-2 py-1 text-left text-[9px] font-bold uppercase tracking-wide text-slate-300 active:cursor-grabbing"
        aria-label="Drag tenant switcher"
      >
        Drag Switcher
      </button>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-white">Dev Tenant Switcher</p>
      <p className="mb-2 text-[9px] text-slate-400">Active: {activeTenantKey ? activeTenantKey.toUpperCase() : "NONE"}</p>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setTenant("medshield")} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-bold uppercase text-slate-200 hover:border-blue-500">Medshield</button>
        <button type="button" onClick={() => setTenant("vaultbank")} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-bold uppercase text-slate-200 hover:border-blue-500">Vaultbank</button>
        <button type="button" onClick={() => setTenant("gridcore")} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-bold uppercase text-slate-200 hover:border-blue-500">Gridcore</button>
        <button type="button" onClick={() => setTenant(null)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-bold uppercase text-slate-200 hover:border-blue-500">Clear</button>
      </div>

      <button
        type="button"
        onClick={runCrossTenantTest}
        disabled={isTesting}
        className="w-full rounded border border-red-500/70 bg-red-500/10 px-2 py-1 text-[9px] font-bold uppercase text-red-300 disabled:opacity-50"
      >
        {isTesting ? "Testing..." : "ATTEMPT CROSS-TENANT FETCH"}
      </button>
      <p className="text-[9px] text-slate-500 font-mono mt-1 italic leading-tight">
        ILLEGAL_FETCH_HELP: This action simulates an illegal cross-tenant fetch and should be blocked with a 403 guardrail.
      </p>
      <p className="text-[9px] text-slate-500 font-mono leading-tight">
        SYSTEM_NOTE: Cross-tenant alerts utilize Medshield liability baselines by design.
      </p>

      {alertPayload && shieldActive && (
        <div className="mt-2 animate-pulse rounded border border-red-500 bg-red-500/20 p-2 text-[9px]">
          <p className="font-bold uppercase tracking-wide text-red-200">{alertPayload.title}</p>
          <p className="mt-1 text-red-100">Target Data: {alertPayload.targetData}</p>
          <p className="mt-1 text-red-100">Averted HIPAA Liability: <span className="font-mono font-bold text-red-50">${alertPayload.liability.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
          <p className="mt-1 text-red-100">Averted Per-Event Impact: <span className="font-mono font-bold text-red-50">${alertPayload.perEventImpact.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
        </div>
      )}

      {debugMessage && (
        <div className={`mt-2 rounded border px-2 py-1 text-[9px] font-bold uppercase ${shieldActive ? "animate-pulse border-red-500 bg-red-500/20 text-red-300" : "border-slate-700 bg-slate-900 text-slate-300"}`}>
          {debugMessage}
        </div>
      )}
    </div>
  );
}
