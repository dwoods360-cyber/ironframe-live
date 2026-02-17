"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, MoreVertical, Plus, Search, Mail, FileText, ShieldAlert, Archive, Zap, BarChart3 } from "lucide-react";

// SaaS Components & Utils
import NotificationHub from "@/app/components/NotificationHub";
import { appendAuditLog } from "@/app/utils/auditLogger";
import { useVendorActions } from "@/app/hooks/useVendorActions";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";

// Vendor Components
import AddVendorModal from "@/app/vendors/AddVendorModal";
import RFITemplate from "@/app/vendors/RFITemplate";
import Visualizer from "@/app/vendors/Visualizer";
import ScorecardIcon from "@/app/vendors/ScorecardIcon";
import RiskSparkbar from "@/app/vendors/RiskSparkbar";

// Services
import { incrementArchivedLowPriority } from "@/services/weeklySummaryService";
import { MASTER_VENDORS, RiskTier, VendorRecord, getDaysUntilExpiration } from "@/app/vendors/schema";
import { calculateVendorGrade, VendorLetterGrade } from "@/utils/scoringEngine";

const RISK_TIER_STYLE: Record<RiskTier, string> = {
  CRITICAL: "text-red-300",
  HIGH: "text-amber-500",
  LOW: "text-emerald-300",
};

const GRADE_BADGE_STYLE: Record<VendorLetterGrade, string> = {
  A: "border-emerald-400/80 bg-emerald-500/15 text-emerald-300",
  B: "border-amber-400/80 bg-amber-500/15 text-amber-200",
  C: "border-amber-400/80 bg-amber-500/15 text-amber-200",
  D: "border-red-400/80 bg-red-500/15 text-red-300",
  F: "border-red-400/80 bg-red-500/15 text-red-300",
};

export default function VendorsOverviewPage() {
  const [isMounted, setIsMounted] = useState(false);
  const systemConfig = useSystemConfigStore();
  
  const [vendors] = useState<VendorRecord[]>(MASTER_VENDORS);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"TABLE" | "MAP">("TABLE");
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [rfiTarget, setRfiTarget] = useState<{ vendorName: string; vendorEmail: string } | null>(null);
  const [persona, setPersona] = useState<'CISO' | 'CEO'>('CISO');

  useEffect(() => {
    setIsMounted(true);
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const vendorGraph = useMemo(() => {
    if (!isMounted) return [];
    return vendors.filter(v => v.vendorName.toLowerCase().includes(search.toLowerCase())).map(v => {
      const days = getDaysUntilExpiration(v.documentExpirationDate);
      return {
        ...v,
        vendorId: v.vendorName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        daysUntilExpiration: days,
        healthScore: calculateVendorGrade({
          daysUntilSoc2Expiration: days,
          evidenceLockerDocs: [], 
          hasActiveIndustryAlert: false,
          hasActiveBreachAlert: false,
          hasPendingVersioning: false,
          hasStakeholderEscalation: false,
          requiresManualReview: false
        })
      };
    });
  }, [isMounted, vendors, search]);

  if (!isMounted) return <div className="min-h-full bg-slate-950" />;

  return (
    <div className="min-h-full bg-slate-950 p-6 font-sans">
      <NotificationHub 
        alerts={[]}
        resolveRiskTier={(name) => vendors.find(v => v.vendorName === name)?.riskTier || "LOW"}
        onArchiveLowPriority={(ids) => incrementArchivedLowPriority(ids.length)}
      />

      <section className="rounded border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-[11px] font-bold uppercase tracking-wide text-white">SUPPLY CHAIN // GLOBAL VENDOR INTELLIGENCE</h1>
          
          <button 
            data-testid="header-add-vendor-chip"
            onClick={() => setIsAddVendorModalOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-[10px] font-bold text-white transition-all hover:border-blue-500 animate-pulse"
          >
            <Plus className="h-3 w-3" /> ADD VENDOR
          </button>
        </div>

        {/* Workflow Ribbon */}
        <div className="mb-6 flex gap-3 overflow-x-auto pb-2 border-b border-slate-800/50">
          <button className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded text-[10px] font-bold text-blue-400 hover:border-blue-500">
            <Zap className="h-3 w-3" /> AUTO-TRIAGE
          </button>
          <button className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded text-[10px] font-bold text-emerald-400 hover:border-emerald-500">
            <FileText className="h-3 w-3" /> BULK RFI
          </button>
          <button
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded text-[10px] font-bold text-amber-400 hover:border-amber-500"
            onClick={() => alert('Calculating Risk ROI: Total ALE - Mitigation Cost')}
          >
            <BarChart3 className="h-3 w-3" /> ROI CALC
          </button>
          <button className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded text-[10px] font-bold text-slate-400 hover:border-emerald-500">
            <ShieldAlert className="h-3 w-3" /> AUDIT MODE
          </button>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex items-center gap-2">
          <div className="relative w-[260px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search registry..." 
              className="bg-slate-950 border border-slate-800 rounded px-4 py-2 text-[11px] text-white pl-9 w-full outline-none focus:border-blue-500/50" 
            />
          </div>

          <Link href="/reports/audit-trail" className="inline-flex h-8 items-center rounded border border-slate-800 bg-slate-950 px-3 text-[10px] font-bold uppercase text-slate-300 hover:border-blue-500">
            Activity Log
          </Link>

          <button onClick={() => setView(view === "TABLE" ? "MAP" : "TABLE")} className="h-8 rounded border border-slate-800 bg-slate-950 px-3 text-[10px] font-bold uppercase text-slate-300 hover:border-blue-500">
            {view === "TABLE" ? "Map View" : "Table View"}
          </button>
          
          <Link href="/" className="inline-flex h-8 items-center rounded border border-slate-800 bg-slate-950 px-3 text-[10px] font-bold uppercase text-slate-300 hover:border-blue-500 ml-auto">
            Back
          </Link>
        </div>

        {view === "TABLE" ? (
          <div className="rounded border border-slate-800 overflow-hidden">
            <div className="grid grid-cols-9 border-b border-slate-800 bg-slate-950 px-4 py-2 text-[10px] font-bold uppercase text-slate-300">
              <p>Scorecard</p>
              <p>VENDOR NAME</p>
              <p>ENTITY</p>
              <p>RISK</p>
              {persona === 'CEO' ? <p>PROJECTED LOSS (ALE)</p> : <p>RATING</p>}
              <p>STATUS</p>
              <p>COUNTDOWN</p>
              <p>LOCKER</p>
              <p className="text-right">ACTIONS</p>
            </div>

            <div className="max-h-[600px] overflow-y-auto p-2 space-y-2">
              {vendorGraph.map((vendor) => (
                <div key={vendor.vendorId} className="grid grid-cols-9 items-center gap-3 bg-slate-900/40 border border-slate-800 px-4 py-3 text-[11px] hover:border-blue-500/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <ScorecardIcon grade={vendor.healthScore.grade} className={GRADE_BADGE_STYLE[vendor.healthScore.grade]} />
                    <RiskSparkbar trendPoints={[40, 50, 60]} statusLabel="Stable" />
                  </div>
                  <p className="font-semibold text-white flex items-center gap-1">
                    {vendor.vendorName}
                    <Zap className="h-3 w-3 text-amber-400 animate-pulse" title="Continuous Monitoring" />
                  </p>
                  <p className="text-slate-400">{vendor.associatedEntity}</p>
                  <p className={`font-bold ${RISK_TIER_STYLE[vendor.riskTier as RiskTier]}`}>{vendor.riskTier}</p>
                  <p className="text-white">{vendor.securityRating}</p>
                  <p className="text-slate-400">{vendor.contractStatus}</p>
                  <p className={`font-bold ${vendor.daysUntilExpiration < 30 ? 'text-red-300' : 'text-emerald-300'}`}>
                    {vendor.daysUntilExpiration <= 0 ? "EXPIRED" : `${vendor.daysUntilExpiration} DAYS`}
                  </p>
                  <div className="flex gap-1"><span className="bg-slate-800 px-1.5 py-0.5 rounded text-[8px] border border-slate-700">SOC2</span></div>
                  
                  <div className="text-right relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === vendor.vendorId ? null : vendor.vendorId);
                      }}
                      className={`p-1 rounded transition-colors ${activeMenuId === vendor.vendorId ? 'bg-blue-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {activeMenuId === vendor.vendorId && (
                      <div className="absolute right-0 mt-2 w-48 bg-slate-950 border border-slate-800 rounded shadow-2xl z-[100] overflow-hidden">
                        <button className="w-full flex items-center gap-2 px-4 py-2 text-[10px] text-left hover:bg-slate-900 border-b border-slate-900">
                          <Mail className="h-3 w-3 text-blue-400" /> EMAIL VENDOR
                        </button>
                        <button className="w-full flex items-center gap-2 px-4 py-2 text-[10px] text-left hover:bg-slate-900 border-b border-slate-900">
                          <FileText className="h-3 w-3 text-emerald-400" /> GENERAL RFI
                        </button>
                        <button className="w-full flex items-center gap-2 px-4 py-2 text-[10px] text-left hover:bg-slate-900">
                          <ShieldAlert className="h-3 w-3 text-red-400" /> AUDIT REQUEST
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Visualizer vendors={vendorGraph} />
        )}
      </section>

      <AddVendorModal 
        isOpen={isAddVendorModalOpen} 
        onClose={() => setIsAddVendorModalOpen(false)} 
        vendorTypeRequirements={systemConfig.vendorTypeRequirements}
        onSubmit={() => setIsAddVendorModalOpen(false)}
      />
    </div>
  );
}