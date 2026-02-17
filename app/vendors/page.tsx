"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, MoreVertical, Plus, Search } from "lucide-react";

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
import { Industry, MASTER_VENDORS, RiskTier, VendorRecord, getDaysUntilExpiration } from "@/app/vendors/schema";
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
  
  const [vendors, setVendors] = useState<VendorRecord[]>(MASTER_VENDORS);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"TABLE" | "MAP">("TABLE");
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [rfiTarget, setRfiTarget] = useState<{ vendorName: string; vendorEmail: string } | null>(null);

  const { resolveInternalStakeholderEmail } = useVendorActions(
    systemConfig.companyStakeholders,
    systemConfig.vendorTypeRequirements
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleEmailVendor = (vendor: VendorRecord) => {
    const internalEmail = resolveInternalStakeholderEmail(vendor.associatedEntity);
    const subject = `Security Evidence Request: ${vendor.vendorName}`;
    const body = `Hello ${vendor.vendorName} team,\n\nPlease provide updated SOC2 documentation.`;
    window.open(`mailto:support@${vendor.vendorName.toLowerCase().replace(/\s+/g, '-')}.local?cc=${internalEmail}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
    
    appendAuditLog({
      action: "EMAIL_SENT",
      entity: "VENDOR",
      details: `Outreach initiated for ${vendor.vendorName}`,
      timestamp: new Date().toISOString()
    });
  };

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
        <h1 className="mb-4 text-[11px] font-bold uppercase tracking-wide text-white">SUPPLY CHAIN // GLOBAL VENDOR INTELLIGENCE</h1>

        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2">
          <div className="relative w-[260px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search..." 
              className="bg-slate-950 border border-slate-800 rounded px-4 py-2 text-[11px] text-white pl-9 w-full outline-none" 
            />
          </div>

          <Link href="/reports/audit-trail?scope=vendor-changes" className="inline-flex h-8 items-center rounded border border-slate-800 bg-slate-950 px-3 text-[10px] font-bold text-slate-300 hover:border-blue-500">
            Activity Log
          </Link>

          <button onClick={() => setView(view === "TABLE" ? "MAP" : "TABLE")} className="h-8 rounded border border-slate-800 bg-slate-950 px-3 text-[10px] font-bold text-slate-300 hover:border-blue-500">
            {view === "TABLE" ? "Map View" : "Table View"}
          </button>
          
          <Link href="/" className="inline-flex h-8 items-center rounded border border-slate-800 bg-slate-950 px-3 text-[10px] font-bold text-slate-300 hover:border-blue-500 ml-auto">
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
              <p>RATING</p>
              <p>STATUS</p>
              <p>COUNTDOWN</p>
              <p>LOCKER</p>
              <p className="text-right">ACTIONS</p>
            </div>

            <div className="max-h-[500px] overflow-y-auto p-2 space-y-2">
              {vendorGraph.map((vendor) => (
                <div key={vendor.vendorId} className="grid grid-cols-9 items-center gap-3 bg-slate-900/40 border border-slate-800 px-4 py-3 text-[11px] hover:border-blue-500/50">
                  <div className="flex items-center gap-2">
                    <ScorecardIcon grade={vendor.healthScore.grade} className={GRADE_BADGE_STYLE[vendor.healthScore.grade]} />
                    <RiskSparkbar trendPoints={[40, 50, 60]} statusLabel="Stable" />
                  </div>
                  <p className="font-semibold text-white">{vendor.vendorName}</p>
                  <p className="text-slate-400">{vendor.associatedEntity}</p>
                  <p className={`font-bold ${RISK_TIER_STYLE[vendor.riskTier as RiskTier]}`}>{vendor.riskTier}</p>
                  <p>{vendor.securityRating}</p>
                  <p className="text-slate-400">{vendor.contractStatus}</p>
                  <p className={`font-bold ${vendor.daysUntilExpiration < 30 ? 'text-red-300' : 'text-emerald-300'}`}>
                    {vendor.daysUntilExpiration <= 0 ? "EXPIRED" : `${vendor.daysUntilExpiration} DAYS`}
                  </p>
                  <div className="flex gap-1"><span className="bg-slate-800 px-1.5 py-0.5 rounded text-[8px] border border-slate-700">SOC2</span></div>
                  <div className="text-right">
                    <button onClick={() => handleEmailVendor(vendor)} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"><MoreVertical className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Visualizer vendors={vendorGraph} />
        )}
      </section>

      {/* Operational Modal Layers - FIXED PROP INJECTION */}
      <AddVendorModal 
        isOpen={isAddVendorModalOpen} 
        onClose={() => setIsAddVendorModalOpen(false)} 
        vendorTypeRequirements={systemConfig.vendorTypeRequirements}
        onSubmit={(data) => {
          console.log("New Vendor:", data);
          setIsAddVendorModalOpen(false);
        }}
      />

      {rfiTarget && (
        <RFITemplate 
          isOpen={true}
          vendorName={rfiTarget.vendorName}
          onClose={() => setRfiTarget(null)}
          onGenerate={() => setRfiTarget(null)}
        />
      )}
    </div>
  );
}