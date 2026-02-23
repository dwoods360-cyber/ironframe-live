"use client";

import { useState, use, useEffect } from "react";
import { notFound } from "next/navigation";
import QuarantineUpload from "@/app/components/QuarantineUpload";
import UploadArtifactModal from "@/app/components/vendor-risk/UploadArtifactModal";

export default function EntityVendorsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = use(params);
  const currentTenant = resolvedParams.tenant.toUpperCase();
  
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [pendingStagedFile, setPendingStagedFile] = useState<File | null>(null);

  useEffect(() => {
    const handleOpenAddVendor = () => setIsPortalOpen(true);
    window.addEventListener("vendors:open-add-vendor", handleOpenAddVendor);
    return () => window.removeEventListener("vendors:open-add-vendor", handleOpenAddVendor);
  }, []);

  return (
    <div className="min-h-full bg-slate-950 font-mono text-slate-200">
      <div className="p-6">
        {/* 2. THE QUARANTINE AIRLOCK SECTION */}
        <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/20 p-6 backdrop-blur-sm shadow-xl">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
              Airlock // Sandbox Mode Active
            </span>
          </div>
          <QuarantineUpload
            tenantId={`${currentTenant.toLowerCase()}-id`}
            onFileStaged={(file) => {
              setPendingStagedFile(file);
              setIsPortalOpen(true);
            }}
          />
          <p className="mt-2 text-[9px] text-slate-500 uppercase italic">
            Files dropped here are isolated in the 'ironframe-quarantine' enclave for Agent 5 analysis.
          </p>
        </section>

        {/* 3. GLOBAL VENDOR INTELLIGENCE HEADER */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[14px] font-black uppercase tracking-tighter text-white">
            SUPPLY CHAIN // GLOBAL VENDOR INTELLIGENCE
          </h2>
          <div className="flex gap-2">
             <button className="bg-slate-900 border border-slate-800 text-[10px] px-3 py-1 rounded text-slate-400 uppercase font-bold">Auto-Triage</button>
             <button className="bg-slate-900 border border-slate-800 text-[10px] px-3 py-1 rounded text-slate-400 uppercase font-bold">ROI Calc</button>
             <button className="bg-red-900/20 border border-red-500/50 text-[10px] px-3 py-1 rounded text-red-500 uppercase font-bold">Initiate Zero-Day Sync</button>
          </div>
        </div>

        {/* 4. THE INGESTION PORTAL MODAL */}
        {isPortalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
            <div className="w-full max-w-2xl border border-slate-800 bg-slate-900 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <UploadArtifactModal 
                isOpen={isPortalOpen} 
                onClose={() => { setIsPortalOpen(false); setPendingStagedFile(null); }}
                onUploadComplete={(data) => {
                  console.log("Upload complete:", data);
                  setIsPortalOpen(false);
                  setPendingStagedFile(null);
                }}
                tenantId={currentTenant}
                initialStagedFile={pendingStagedFile}
                onClearInitialFile={() => setPendingStagedFile(null)}
              />
            </div>
          </div>
        )}

        {/* 5. VENDOR TABLE PLACEHOLDER */}
        <div className="rounded border border-slate-800 bg-slate-900/40 p-12 text-center">
           <p className="text-[10px] text-slate-600 uppercase tracking-widest animate-pulse">
             Awaiting Agent 10 Graph Mapping... // Registry Sync: Pending
           </p>
        </div>

      </div>
    </div>
  );
}