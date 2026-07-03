"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, ShieldAlert, Zap, BarChart3, MoreVertical, ChevronDown, ShieldX } from "lucide-react";

// Components
import NotificationHub from "@/app/components/NotificationHub";
import ScorecardIcon from "@/app/vendors/ScorecardIcon";
import RFITemplate from "@/app/vendors/RFITemplate";
import VendorRiskOverrideModal from "@/app/vendors/VendorRiskOverrideModal";

import AddVendorModal, { type AddVendorSubmission } from "@/app/vendors/AddVendorModal";
import { MASTER_VENDORS, getDaysUntilExpiration, resolveCadenceStatus, type RiskTier, type VendorRecord } from "@/app/vendors/schema";
import { calculateVendorGrade, VendorLetterGrade } from "@/utils/scoringEngine";
import PilotSurfaceBanner, { VENDORS_PILOT_SURFACE_DETAIL } from "@/app/components/pilot/PilotSurfaceBanner";
import { createMonitoringAlertId } from "@/app/vendors/monitoringAlertIds";
import { vendorContactEmail } from "@/app/vendors/vendorContactEmail";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";
import { slugVendorId } from "@/app/lib/ironmap/vendorSupplyChainGraph";
import { usePilotStubExportGate } from "@/app/hooks/usePilotStubExportGate";
import { useHostTenantSlug } from "@/app/hooks/useHostTenantSlug";
import { buildHeaderRouteMatrix } from "@/app/utils/grcRouteMatch";
import {
  loadSessionIngestedVendors,
  saveSessionIngestedVendors,
  tenantEntityLabelFromSlug,
} from "@/app/vendors/vendorEvidenceRequirements";

export type VendorWorkflowAction =
  | "soc2-update"
  | "bulk-rfi"
  | "fourth-party-graph"
  | "map-view"
  | "override-risk";

type VendorRow = {
  vendorId: string;
  vendorName: string;
  riskTier: RiskTier;
  ale: number;
  healthScore: ReturnType<typeof calculateVendorGrade>;
};

const GRADE_STYLE: Record<VendorLetterGrade, string> = {
  A: "border-emerald-400/80 bg-emerald-500/15 text-emerald-300",
  B: "border-emerald-400/80 bg-emerald-500/15 text-emerald-300", 
  C: "border-amber-400/80 bg-amber-500/15 text-amber-200",
  D: "border-red-400/80 bg-red-500/15 text-red-300",
  F: "border-red-400/80 bg-red-500/15 text-red-300",
};

const FILTER_COLORS: Record<string, { active: string, inactive: string }> = {
  ALL: { active: "bg-slate-700 border-slate-400 text-white", inactive: "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white" },
  CRITICAL: { active: "bg-red-500/30 border-red-400 text-red-200", inactive: "bg-slate-950 border-slate-800 text-red-400 hover:border-red-400/80 hover:text-red-300" },
  HIGH: { active: "bg-amber-500/30 border-amber-400 text-amber-200", inactive: "bg-slate-950 border-slate-800 text-amber-400 hover:border-amber-400/80 hover:text-amber-300" },
  MED: { active: "bg-blue-500/30 border-blue-400 text-blue-200", inactive: "bg-slate-950 border-slate-800 text-blue-400 hover:border-blue-400/80 hover:text-blue-300" },
  LOW: { active: "bg-emerald-500/30 border-emerald-400 text-emerald-200", inactive: "bg-slate-950 border-slate-800 text-emerald-400 hover:border-emerald-400/80 hover:text-emerald-300" },
};

const DAY_MS = 24 * 60 * 60 * 1000;

function buildIngestedVendorRecord(
  payload: AddVendorSubmission,
  associatedEntity: string,
): VendorRecord {
  const parsedExpiration = payload.expirationDate
    ? new Date(payload.expirationDate).getTime()
    : Number.NaN;
  const documentExpirationDate = Number.isNaN(parsedExpiration)
    ? new Date(Date.now() + 90 * DAY_MS).toISOString()
    : new Date(parsedExpiration).toISOString();

  return {
    vendorName: payload.vendorName,
    associatedEntity,
    industry: payload.industry,
    vendorType: payload.vendorType,
    riskTier: payload.riskTier,
    securityRating: "Pending review",
    contractStatus: "MANUAL INGEST",
    documentExpirationDate,
    lastRequestSent: new Date().toISOString(),
    currentCadence: resolveCadenceStatus(getDaysUntilExpiration(documentExpirationDate)),
    criticalSubProcessors: [],
  };
}

function mapVendorToRow(
  vendor: VendorRecord,
  riskOverrides: Record<string, RiskTier>,
): VendorRow {
  const days = getDaysUntilExpiration(vendor.documentExpirationDate);
  const vendorId = slugVendorId(vendor.vendorName);
  const baseTier = vendor.vendorName.includes("Azure Health") ? "CRITICAL" : vendor.riskTier;
  const effectiveTier = riskOverrides[vendorId] ?? baseTier;
  const evidenceLockerDocs =
    vendor.contractStatus === "MANUAL INGEST" ? [] : (["SOC2", "INSURANCE"] as string[]);

  return {
    ...vendor,
    vendorId,
    riskTier: effectiveTier,
    ale: effectiveTier === "CRITICAL" ? 160000 : effectiveTier === "HIGH" ? 80000 : 20000,
    healthScore: calculateVendorGrade({
      daysUntilSoc2Expiration: days,
      evidenceLockerDocs,
      hasActiveIndustryAlert: false,
      hasActiveBreachAlert: vendor.vendorName === "Schneider Electric",
      hasPendingVersioning: false,
      hasStakeholderEscalation: false,
      requiresManualReview: vendor.contractStatus === "MANUAL INGEST",
    }),
  };
}

// ==========================================
// ++++ COMPONENT 1: Alerts Section      ++++
// ==========================================

function ActiveNotificationSystem({ alerts, setAlerts, vendorGraph }: any) {
  const resolveRiskTier = (vendorName: string) => {
    const vendor = vendorGraph.find((v: any) => v.vendorName === vendorName);
    return vendor ? vendor.riskTier : "LOW";
  };

  return (
    <div className="mt-6 shrink-0">
      <NotificationHub 
        alerts={alerts}
        resolveRiskTier={resolveRiskTier}
        onApprove={(alert) => setAlerts((prev: any) => prev.filter((a: any) => a.id !== alert.id))}
        onReject={(id) => setAlerts((prev: any) => prev.filter((a: any) => a.id !== id))}
        onArchiveLowPriority={(ids) => setAlerts((prev: any) => prev.filter((a: any) => !ids.includes(a.id)))}
      />
    </div>
  );
}

// ==========================================
// ++++ COMPONENT 2: Header & Actions    ++++
// ==========================================

function PageHeaderAndActions({
  persona,
  setPersona,
  showRoi,
  setShowRoi,
  onZeroDayToggle,
  isZeroDayOpen,
  onAutoTriage,
  onActivityLog,
  workflowActionsBlocked,
  workflowBlockedMessage,
}: {
  persona: "CISO" | "CEO";
  setPersona: (p: "CISO" | "CEO") => void;
  showRoi: boolean;
  setShowRoi: (v: boolean) => void;
  onZeroDayToggle: () => void;
  isZeroDayOpen: boolean;
  onAutoTriage: () => void;
  onActivityLog: () => void;
  workflowActionsBlocked: boolean;
  workflowBlockedMessage: string;
}) {
  return (
    <div className="flex justify-between items-start mb-6 shrink-0">
      <div className="flex flex-col gap-4">
        <h1 className="font-bold uppercase tracking-widest text-sm text-white">
          SUPPLY CHAIN // GLOBAL VENDOR INTELLIGENCE
        </h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onAutoTriage}
            className="flex h-11 items-center gap-2 border border-slate-700 bg-slate-800/50 px-4 text-xs font-normal uppercase tracking-wider text-blue-300 rounded transition-all hover:bg-slate-800 hover:border-blue-500/60"
          >
            <Zap size={14} /> AUTO-TRIAGE
          </button>
          {/* ROI CALC toggle with Amber text for disruption */}
          <button
            type="button"
            onClick={() => setShowRoi(!showRoi)}
            className={`flex h-11 items-center gap-2 border px-4 text-xs font-normal uppercase tracking-wider rounded transition-all ${showRoi ? "bg-amber-500 border-amber-400 text-white" : "bg-slate-800/50 border-slate-700 text-amber-300 hover:bg-slate-800"}`}
          >
            <BarChart3 size={14} /> ROI CALC
          </button>
          {/* Red Disruptor Button */}
          <button
            type="button"
            title={workflowActionsBlocked ? workflowBlockedMessage : undefined}
            aria-disabled={workflowActionsBlocked}
            onClick={onZeroDayToggle}
            className={`h-11 px-4 rounded text-[10px] font-black uppercase tracking-widest transition-all border ${workflowActionsBlocked ? "cursor-not-allowed border-red-500/20 text-red-500/40 opacity-50" : isZeroDayOpen ? "bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]" : "border-red-500/50 text-red-500 hover:bg-red-500/10"}`}
          >
            {isZeroDayOpen ? "TERMINAL ACTIVE" : "INITIATE ZERO-DAY SYNC"}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-end gap-4">
        <div className="flex bg-slate-950 p-1 rounded border border-slate-800">
          <button type="button" onClick={() => setPersona("CISO")} className={`h-11 px-4 text-xs font-normal transition-all ${persona === "CISO" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300"}`}>CISO VIEW</button>
          <button type="button" onClick={() => setPersona("CEO")} className={`h-11 px-4 text-xs font-normal transition-all ${persona === "CEO" ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-300"}`}>CEO VIEW</button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onActivityLog}
            data-testid="vendors-activity-log"
            className="h-11 px-4 bg-slate-950 border border-slate-800 rounded text-[10px] uppercase tracking-wider text-slate-400 hover:text-white hover:border-slate-600 font-bold transition-colors"
          >
            ACTIVITY LOG
          </button>
          <button
            type="button"
            aria-current="page"
            className="h-11 px-4 bg-slate-950 border border-blue-500/60 rounded text-[10px] uppercase tracking-wider text-blue-400 font-bold"
          >
            TABLE VIEW
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ++++ COMPONENT 3: Search & Filters    ++++
// ==========================================

function FilterControls({ searchQuery, setSearchQuery, grcContext, setGrcContext, grcDateFilter, setGrcDateFilter, riskFilter, setRiskFilter, counts }: any) {
  return (
    <div className="flex justify-between items-center mb-4 gap-4 shrink-0">
      <div className="flex gap-3">
        {/* Search Bar */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input 
            type="text" 
            placeholder="SEARCH REGISTRY..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full bg-slate-950 border border-slate-800 rounded py-2 pl-9 pr-4 text-xs uppercase tracking-wider text-white placeholder:text-slate-600 outline-none focus:border-blue-500 font-normal transition-all" 
          />
        </div>
        
        {/* GRC CONTEXT: Framework Specifics */}
        <div className="relative w-48">
          <select 
            value={grcContext} 
            onChange={(e) => setGrcContext(e.target.value)} 
            className="w-full bg-slate-950 border border-slate-800 rounded py-2 pl-4 pr-8 text-[10px] uppercase tracking-widest text-slate-300 outline-none focus:border-blue-500 font-black appearance-none cursor-pointer hover:border-slate-600 transition-colors"
          >
            <option value="ALL">ALL GRC CONTEXTS</option>
            <option value="SOC2">SOC 2 TYPE II</option>
            <option value="ISO">ISO 27001:2022</option>
            <option value="HIPAA">HIPAA / HITRUST</option>
            <option value="PCI">PCI-DSS v4.0</option>
            <option value="GDPR">GDPR / CCPA</option>
            <option value="NIST">NIST CSF 2.0</option>
            <option value="FEDRAMP">FEDRAMP / CMMC</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
        </div>

        {/* DATE FILTERING: Audit & Renewal Windows */}
        <div className="relative w-52">
          <select 
            value={grcDateFilter} 
            onChange={(e) => setGrcDateFilter(e.target.value)} 
            className="w-full bg-slate-950 border border-slate-800 rounded py-2 pl-4 pr-8 text-[10px] uppercase tracking-widest text-slate-300 outline-none focus:border-blue-500 font-black appearance-none cursor-pointer hover:border-slate-600 transition-colors"
          >
            <option value="ALL">ALL AUDIT DATES</option>
            <option value="30_DAYS">RENEWAL: &lt; 30 DAYS</option>
            <option value="90_DAYS">RENEWAL: &lt; 90 DAYS</option>
            <option value="Q1">Q1 REPORTING CYCLE</option>
            <option value="Q2">Q2 REPORTING CYCLE</option>
            <option value="Q3">Q3 REPORTING CYCLE</option>
            <option value="Q4">Q4 REPORTING CYCLE</option>
            <option value="ANNUAL">ANNUAL REVIEW DUE</option>
            <option value="EXPIRED">EXPIRED (ACTION REQ)</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
        </div>
      </div>
      
      {/* RISK CHIPS */}
      <div className="flex gap-2">
        {(["ALL", "CRITICAL", "HIGH", "MED", "LOW"] as const).map((tier) => (
          <button 
            key={tier} 
            onClick={() => setRiskFilter(tier as any)} 
            className={`px-3 py-1.5 border rounded text-[10px] font-black uppercase tracking-widest transition-all ${
              riskFilter === tier ? FILTER_COLORS[tier]?.active : FILTER_COLORS[tier]?.inactive
            }`}
          >
            {tier} <span className="ml-1 opacity-60">({counts[tier]})</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// ++++ COMPONENT 4: Zero-Day Terminal   ++++
// ==========================================

function ZeroDayPanel({ isOpen, onClose, onExecute }: any) {
  const [cveId, setCveId] = useState("");
  if (!isOpen) return null;
  return (
    <div className="mb-6 bg-red-950/20 border border-red-500/40 rounded-lg p-6 animate-in slide-in-from-top duration-300 relative z-50">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="text-red-500" size={20} />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-red-100">ZERO-DAY SYNC AGENT: EXECUTION TERMINAL</h2>
          </div>
          <p className="text-[10px] text-red-400/80 uppercase tracking-widest font-bold font-mono">HIGH-PRIORITY BLAST-RADIUS SCAN ENGINE</p>
        </div>
        <button onClick={onClose} className="text-red-500 hover:text-red-300 transition-colors"><MoreVertical size={18} className="rotate-90" /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-red-300 uppercase tracking-widest mb-2">TARGET CVE ID (v.2026 REF)</label>
          <div className="flex gap-3">
            <input type="text" placeholder="CVE-2026-XXXXX" value={cveId} onChange={(e) => setCveId(e.target.value.toUpperCase())} className="flex-1 bg-slate-950 border border-red-500/30 rounded px-4 py-2 text-sm font-mono text-red-200 outline-none focus:border-red-500 transition-all" />
            <button onClick={() => { if(cveId) { onExecute(cveId); setCveId(""); } }} className="bg-red-600 hover:bg-red-500 text-white text-xs font-black px-6 py-2 rounded uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)]">EXECUTE SCAN</button>
          </div>
        </div>
        <div className="bg-slate-950/50 border border-red-500/20 rounded p-3 text-[10px] font-bold text-red-400 uppercase tracking-widest">
          AUTO-ROUTING: [CISO] [VP_INFRA] [LEGAL]
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ++++ COMPONENT 5: Vendor Table Grid   ++++
// ==========================================

function VendorTable({
  filteredVendors,
  quarantinedIds,
  handleQuarantine,
  onWorkflowAction,
  workflowActionsBlocked,
  workflowBlockedMessage,
  onPilotWorkflowBlocked,
  persona,
  showRoi,
  grcDateFilter,
  getDynamicStatus,
}: {
  filteredVendors: VendorRow[];
  quarantinedIds: Set<string>;
  handleQuarantine: (vendorId: string, vendorName: string) => void;
  onWorkflowAction: (action: VendorWorkflowAction, vendor: VendorRow) => void;
  workflowActionsBlocked: boolean;
  workflowBlockedMessage: string;
  onPilotWorkflowBlocked: () => void;
  persona: "CISO" | "CEO";
  showRoi: boolean;
  grcDateFilter: string;
  getDynamicStatus: (filter: string) => string;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuId) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenuId(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

  const runWorkflowAction = (action: VendorWorkflowAction, vendor: VendorRow) => {
    if (workflowActionsBlocked) {
      onPilotWorkflowBlocked();
      return;
    }
    onWorkflowAction(action, vendor);
    setOpenMenuId(null);
  };

  const handleMenuToggle = (vendorId: string, isMenuOpen: boolean) => {
    setOpenMenuId(isMenuOpen ? null : vendorId);
  };

  const menuItemClass = (toneClass: string, withBorder = false) =>
    [
      "min-h-11 w-full px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest",
      withBorder ? "border-t border-slate-800" : "",
      workflowActionsBlocked
        ? "cursor-not-allowed text-slate-500 opacity-60"
        : `${toneClass} hover:bg-slate-800`,
    ].join(" ");

  const getPayloadLabel = (tier: string) => {
    if (tier === 'CRITICAL') return "PHI / PII";
    if (tier === 'HIGH') return "FINANCIAL / PII";
    return "INTERNAL OPS";
  };

  const renderLockerBadge = (grade: string, isQuarantined: boolean) => {
    if (isQuarantined) return <span className="border px-2 py-1 rounded text-[10px] font-bold bg-slate-900 border-slate-800 text-slate-600">LOCKED</span>;
    if (grade === 'A' || grade === 'B') return <span className="border px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/10 border-emerald-500/30 text-emerald-400 uppercase">SOC2: VALID</span>;
    if (grade === 'C') return <span className="border px-2 py-1 rounded text-[10px] font-bold bg-amber-500/10 border-amber-500/30 text-amber-400 uppercase">SOC2: REVIEW</span>;
    return <span className="border px-2 py-1 rounded text-[10px] font-bold bg-red-500/10 border-red-500/30 text-red-400 animate-pulse uppercase">SOC2: EXPIRED</span>;
  };

  return (
    <div className="border border-slate-800 rounded flex-1 overflow-y-auto relative bg-slate-900/20 shadow-lg min-h-0">
      <div className="sticky top-0 z-20 grid grid-cols-10 bg-slate-950 px-4 py-3 text-[10px] font-black tracking-widest text-slate-400 uppercase border-b border-slate-800 items-center">
        <p>SCORECARD</p><p className="col-span-2">VENDOR NAME</p><p className="text-blue-300">DATA PAYLOAD</p><p>RISK</p>
        <p>{persona === "CEO" || showRoi ? "PROJ. LOSS" : "RATING"}</p><p>STATUS</p><p>COUNTDOWN</p><p className="text-blue-300">LOCKER</p><p className="text-right">ACTIONS</p>
      </div>
      <div className="divide-y divide-slate-800/50 pb-32">
        {filteredVendors.map((vendor) => {
          const isQuarantined = quarantinedIds.has(vendor.vendorId);
          const isMenuOpen = openMenuId === vendor.vendorId;
          return (
            <div key={vendor.vendorId} className={`grid grid-cols-10 items-center px-4 py-3 hover:bg-slate-800/50 transition-colors relative ${isQuarantined ? 'bg-rose-950/10' : ''}`}>
              <ScorecardIcon grade={vendor.healthScore.grade} className={isQuarantined ? `opacity-50 grayscale ${GRADE_STYLE[vendor.healthScore.grade as VendorLetterGrade]}` : GRADE_STYLE[vendor.healthScore.grade as VendorLetterGrade]} />
              <div className="col-span-2 pr-4">
                <p className={`text-xs font-bold uppercase tracking-wider ${isQuarantined ? 'line-through text-slate-600' : 'text-white'}`}>{vendor.vendorName}</p>
                <p className={`text-[9px] uppercase flex items-center gap-1 font-bold ${isQuarantined ? 'text-slate-600' : 'text-emerald-400'}`}><Zap size={10} /> RECENTLY ALIGNED</p>
              </div>
              <p className="text-[10px] text-blue-200/80 font-black uppercase tracking-widest">{getPayloadLabel(vendor.riskTier)}</p>
              <p className={`text-xs font-black tracking-widest ${vendor.riskTier === 'CRITICAL' ? 'text-red-500' : 'text-emerald-500'}`}>{vendor.riskTier}</p>
              <p className="font-mono text-xs font-bold tracking-tighter">{(persona === "CEO" || showRoi) ? `$${vendor.ale.toLocaleString()}` : `${vendor.healthScore.score}/100`}</p>
              <p className={`text-[10px] uppercase font-bold tracking-widest ${isQuarantined ? 'text-rose-400' : 'text-slate-400'}`}>{isQuarantined ? "QUARANTINED" : getDynamicStatus(grcDateFilter)}</p>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">72 DAYS</p>
              <div>{renderLockerBadge(vendor.healthScore.grade, isQuarantined)}</div>
              <div ref={isMenuOpen ? menuRef : undefined} className="text-right flex items-center justify-end gap-1 relative">
                <button
                  type="button"
                  title={isQuarantined ? "Release quarantine (demonstration)" : "Quarantine vendor (demonstration)"}
                  onClick={() => handleQuarantine(vendor.vendorId, vendor.vendorName)}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded border ${isQuarantined ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'text-slate-500 border-transparent hover:text-rose-400'}`}
                >
                  <ShieldX size={14} />
                </button>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  aria-label={`Workflow actions for ${vendor.vendorName}`}
                  title="Workflow actions"
                  onClick={() => handleMenuToggle(vendor.vendorId, isMenuOpen)}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded ${isMenuOpen ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-800'}`}
                >
                  <MoreVertical size={14}/>
                </button>
                {isMenuOpen && (
                  <div role="menu" className="absolute top-12 right-0 w-60 bg-slate-900 border border-slate-700 rounded-md shadow-2xl z-50 overflow-hidden flex flex-col text-left">
                    <div className="px-3 py-2 border-b border-slate-800 bg-slate-950 font-black text-[9px] tracking-widest text-slate-500 uppercase">WORKFLOW ACTIONS</div>
                    {workflowActionsBlocked ? (
                      <p className="border-b border-amber-500/25 bg-amber-950/20 px-3 py-2 text-[9px] leading-snug text-amber-200/90">
                        Seed registry preview — select an action to see why it is disabled until billing is ACTIVE.
                      </p>
                    ) : null}
                    <button type="button" role="menuitem" aria-disabled={workflowActionsBlocked} title={workflowActionsBlocked ? workflowBlockedMessage : undefined} onClick={() => runWorkflowAction("soc2-update", vendor)} className={menuItemClass("text-slate-300")}>Request SOC2 Update</button>
                    <button type="button" role="menuitem" aria-disabled={workflowActionsBlocked} title={workflowActionsBlocked ? workflowBlockedMessage : undefined} onClick={() => runWorkflowAction("bulk-rfi", vendor)} className={menuItemClass("text-slate-300", true)}>Initiate Bulk RFI</button>
                    <button type="button" role="menuitem" aria-disabled={workflowActionsBlocked} title={workflowActionsBlocked ? workflowBlockedMessage : undefined} onClick={() => runWorkflowAction("fourth-party-graph", vendor)} className={menuItemClass("text-slate-300", true)}>View 4th-Party Graph</button>
                    <button type="button" role="menuitem" aria-disabled={workflowActionsBlocked} title={workflowActionsBlocked ? workflowBlockedMessage : undefined} onClick={() => runWorkflowAction("map-view", vendor)} className={menuItemClass("text-blue-400", true)}>Switch to Map View</button>
                    <button type="button" role="menuitem" aria-disabled={workflowActionsBlocked} title={workflowActionsBlocked ? workflowBlockedMessage : undefined} onClick={() => runWorkflowAction("override-risk", vendor)} className={menuItemClass("text-amber-400 font-black", true)}>Override Risk Score</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// ++++ COMPONENT 6: Main Assembler      ++++
// ==========================================

export default function VendorsOverviewPage() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const hostTenantSlug = useHostTenantSlug();
  const routes = useMemo(
    () => buildHeaderRouteMatrix(pathname, hostTenantSlug),
    [pathname, hostTenantSlug],
  );
  const vendorsBase = routes.prefix ? `${routes.prefix}/vendors` : "/vendors";
  const { generalRfiChecklist, vendorDocumentUpdateTemplate, socDepartmentEmail, vendorTypeRequirements } =
    useSystemConfigStore();
  const { suppressed: workflowActionsBlocked, workflowBlockedMessage } = usePilotStubExportGate();
  const [isMounted, setIsMounted] = useState(false);
  const [persona, setPersona] = useState<"CISO" | "CEO">("CISO"); 
  const [showRoi, setShowRoi] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [grcContext, setGrcContext] = useState("ALL");
  const [grcDateFilter, setGrcDateFilter] = useState("ALL"); 
  const [riskFilter, setRiskFilter] = useState<"ALL" | "CRITICAL" | "HIGH" | "MED" | "LOW">("ALL");
  const [quarantinedIds, setQuarantinedIds] = useState<Set<string>>(new Set());
  const [riskOverrides, setRiskOverrides] = useState<Record<string, RiskTier>>({});
  const [isZeroDayOpen, setIsZeroDayOpen] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [rfiVendor, setRfiVendor] = useState<VendorRow | null>(null);
  const [overrideVendor, setOverrideVendor] = useState<VendorRow | null>(null);
  const [workflowNotice, setWorkflowNotice] = useState<string | null>(null);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [ingestedVendors, setIngestedVendors] = useState<VendorRecord[]>([]);

  const tenantEntity = useMemo(
    () => tenantEntityLabelFromSlug(hostTenantSlug),
    [hostTenantSlug],
  );

  const showPilotWorkflowBlocked = () => setWorkflowNotice(workflowBlockedMessage);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isMounted) return;
    setIngestedVendors(loadSessionIngestedVendors(hostTenantSlug));
  }, [isMounted, hostTenantSlug]);

  useEffect(() => {
    if (!isMounted) return;
    saveSessionIngestedVendors(hostTenantSlug, ingestedVendors);
  }, [ingestedVendors, hostTenantSlug, isMounted]);

  useEffect(() => {
    const handleOpenAddVendor = () => setIsAddVendorOpen(true);
    window.addEventListener("vendors:open-add-vendor", handleOpenAddVendor);
    return () => window.removeEventListener("vendors:open-add-vendor", handleOpenAddVendor);
  }, []);

  const vendorGraph = useMemo((): VendorRow[] => {
    if (!isMounted) return [];

    const registry = [...MASTER_VENDORS, ...ingestedVendors].filter((vendor) => {
      if (!hostTenantSlug) return true;
      return vendor.associatedEntity.toUpperCase() === tenantEntity;
    });

    return registry.map((vendor) => mapVendorToRow(vendor, riskOverrides));
  }, [isMounted, riskOverrides, ingestedVendors, hostTenantSlug, tenantEntity]);

  // DYNAMIC CHIP COUNTS (Fixed)
  const counts = useMemo(() => {
    const base = { ALL: vendorGraph.length, CRITICAL: 0, HIGH: 0, MED: 0, LOW: 0 };
    vendorGraph.forEach(v => {
      const tier = v.riskTier as keyof typeof base;
      if (tier in base) base[tier]++;
    });
    return base;
  }, [vendorGraph]);

  const handleZeroDayExecute = (cve: string) => {
    if (workflowActionsBlocked) {
      showPilotWorkflowBlocked();
      return;
    }
    const newAlert = {
      id: createMonitoringAlertId("cve"),
      vendorName: "SYSTEM REGISTRY",
      documentType: `THREAT DETECTED: ${cve}`,
      source: "ZeroDayAgent",
      discoveredAt: new Date().toISOString(),
    };
    setAlerts((prev) => [newAlert, ...prev]);
    setIsZeroDayOpen(false);
    alert(`🚀 ZERO-DAY AGENT ACTIVE\n\nScanning registry for ${cve}.\nNotifying: [CISO], [VP_INFRA], [LEGAL]`);
  };

  const handleQuarantine = (vendorId: string, vendorName: string) => {
    let shouldCreateAlert = false;
    setQuarantinedIds((prev) => {
      const next = new Set(prev);
      if (next.has(vendorId)) {
        next.delete(vendorId);
        shouldCreateAlert = false;
      } else {
        next.add(vendorId);
        shouldCreateAlert = true;
      }
      return next;
    });
    if (shouldCreateAlert) {
      setAlerts((prev) => [
        {
          id: createMonitoringAlertId("q", vendorId),
          vendorName,
          documentType: "QUARANTINE_PROTOCOL",
          source: "AgentManager",
          discoveredAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  };

  const queuePermissionAlert = (vendorName: string, documentType: string, source: string, idPrefix: string, vendorId?: string) => {
    setAlerts((prev) => [
      {
        id: createMonitoringAlertId(idPrefix, vendorId),
        vendorName,
        documentType,
        source,
        discoveredAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const handleWorkflowAction = (action: VendorWorkflowAction, vendor: VendorRow) => {
    if (workflowActionsBlocked) {
      showPilotWorkflowBlocked();
      return;
    }
    switch (action) {
      case "soc2-update": {
        const vendorEmail = vendorContactEmail(vendor.vendorName);
        const subject = `SOC 2 Evidence Update Request // ${vendor.vendorName}`;
        const body = vendorDocumentUpdateTemplate;
        const mailto = `mailto:${encodeURIComponent(vendorEmail)}?cc=${encodeURIComponent(socDepartmentEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailto, "_blank");
        queuePermissionAlert(vendor.vendorName, "SOC2_RENEWAL_REQUEST", "CadenceManager", "soc2", vendor.vendorId);
        break;
      }
      case "bulk-rfi":
        setRfiVendor(vendor);
        break;
      case "fourth-party-graph":
        router.push(`${vendorsBase}/supply-chain?vendor=${encodeURIComponent(vendor.vendorId)}`);
        break;
      case "map-view":
        router.push(`${vendorsBase}/supply-chain`);
        break;
      case "override-risk":
        setOverrideVendor(vendor);
        break;
      default:
        break;
    }
  };

  const handleRiskOverrideSubmit = (nextTier: RiskTier, justification: string) => {
    if (!overrideVendor) return;

    setRiskOverrides((prev) => ({ ...prev, [overrideVendor.vendorId]: nextTier }));
    queuePermissionAlert(
      overrideVendor.vendorName,
      `RISK_OVERRIDE: ${overrideVendor.riskTier} -> ${nextTier} | ${justification}`,
      "GovernanceBoard",
      "risk",
      overrideVendor.vendorId,
    );
    setOverrideVendor(null);
  };

  const handleAutoTriage = () => {
    setAlerts((prev) =>
      prev.filter((alert) => {
        const tier =
          vendorGraph.find((row) => row.vendorName === alert.vendorName)?.riskTier ?? "LOW";
        return tier === "CRITICAL" || tier === "HIGH";
      }),
    );
  };

  const handleActivityLog = () => {
    router.push("/reports/audit-trail");
  };

  const handleAddVendorSubmit = (payload: AddVendorSubmission) => {
    const record = buildIngestedVendorRecord(payload, tenantEntity);
    setIngestedVendors((prev) => {
      const vendorId = slugVendorId(record.vendorName);
      const withoutDuplicate = prev.filter((row) => slugVendorId(row.vendorName) !== vendorId);
      return [record, ...withoutDuplicate];
    });
    queuePermissionAlert(
      payload.vendorName,
      "VENDOR_MANUAL_INGEST",
      "AgentManager",
      "ingest",
      slugVendorId(payload.vendorName),
    );
    setWorkflowNotice(`${payload.vendorName} added to the ${tenantEntity} vendor registry.`);
    setIsAddVendorOpen(false);
  };

  if (!isMounted) return <div className="h-screen bg-slate-950" />;

  const filteredVendors = vendorGraph
    .filter(v => v.vendorName.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(v => riskFilter === "ALL" || v.riskTier === riskFilter);

  return (
    <div className="h-screen bg-slate-950 font-sans text-slate-200 flex flex-col overflow-hidden">
      <div className="px-6 pt-4">
        <PilotSurfaceBanner
          compact
          detail={workflowActionsBlocked ? VENDORS_PILOT_SURFACE_DETAIL : undefined}
        />
      </div>
      <div className="px-6 pb-6 flex flex-col flex-1 overflow-hidden relative">
        <ActiveNotificationSystem alerts={alerts} setAlerts={setAlerts} vendorGraph={vendorGraph} />
        <div className="border border-slate-800 bg-slate-900/40 rounded-lg p-6 flex flex-col flex-1 min-h-0">
          <PageHeaderAndActions
            persona={persona}
            setPersona={setPersona}
            showRoi={showRoi}
            setShowRoi={setShowRoi}
            onZeroDayToggle={() => {
              if (workflowActionsBlocked) {
                showPilotWorkflowBlocked();
                return;
              }
              setIsZeroDayOpen(!isZeroDayOpen);
            }}
            isZeroDayOpen={isZeroDayOpen}
            onAutoTriage={handleAutoTriage}
            onActivityLog={handleActivityLog}
            workflowActionsBlocked={workflowActionsBlocked}
            workflowBlockedMessage={workflowBlockedMessage}
          />
          <ZeroDayPanel isOpen={isZeroDayOpen} onClose={() => setIsZeroDayOpen(false)} onExecute={handleZeroDayExecute} />
          <FilterControls searchQuery={searchQuery} setSearchQuery={setSearchQuery} grcContext={grcContext} setGrcContext={setGrcContext} grcDateFilter={grcDateFilter} setGrcDateFilter={setGrcDateFilter} riskFilter={riskFilter} setRiskFilter={setRiskFilter} counts={counts} />
          <VendorTable
            filteredVendors={filteredVendors}
            quarantinedIds={quarantinedIds}
            handleQuarantine={handleQuarantine}
            onWorkflowAction={handleWorkflowAction}
            workflowActionsBlocked={workflowActionsBlocked}
            workflowBlockedMessage={workflowBlockedMessage}
            onPilotWorkflowBlocked={showPilotWorkflowBlocked}
            persona={persona}
            showRoi={showRoi}
            grcDateFilter={grcDateFilter}
            getDynamicStatus={(d) => (d === "EXPIRED" ? "IMMEDIATE ACTION" : "VIOLATION DETECTED")}
          />
        </div>
      </div>

      {workflowNotice ? (
        <div
          className="fixed bottom-4 right-4 z-[60] max-w-sm rounded-lg border border-amber-500/40 bg-amber-950/90 px-4 py-3 font-mono text-[11px] leading-relaxed text-amber-100 shadow-lg"
          role="alert"
        >
          <p>{workflowNotice}</p>
          <button
            type="button"
            onClick={() => setWorkflowNotice(null)}
            className="mt-2 inline-flex h-11 items-center rounded border border-amber-500/50 px-3 text-[10px] font-bold uppercase tracking-wider text-amber-200"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {rfiVendor ? (
        <RFITemplate
          isOpen
          vendorName={rfiVendor.vendorName}
          vendorEmail={vendorContactEmail(rfiVendor.vendorName)}
          internalStakeholderEmail={socDepartmentEmail}
          checklistItems={generalRfiChecklist}
          onClose={() => setRfiVendor(null)}
          onGenerate={() => {
            queuePermissionAlert(rfiVendor.vendorName, "GENERAL_RFI_DISPATCHED", "AgentManager", "rfi", rfiVendor.vendorId);
            setRfiVendor(null);
          }}
        />
      ) : null}

      {overrideVendor ? (
        <VendorRiskOverrideModal
          vendorName={overrideVendor.vendorName}
          currentTier={overrideVendor.riskTier}
          onClose={() => setOverrideVendor(null)}
          onSubmit={handleRiskOverrideSubmit}
        />
      ) : null}

      {isAddVendorOpen ? (
        <AddVendorModal
          isOpen={isAddVendorOpen}
          onClose={() => setIsAddVendorOpen(false)}
          onSubmit={handleAddVendorSubmit}
          vendorTypeRequirements={vendorTypeRequirements}
        />
      ) : null}
    </div>
  );
}