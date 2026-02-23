import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";

// Initialize Prisma directly on the server
const prisma = new PrismaClient();

const VALID_TENANTS = ["medshield", "vaultbank", "gridcore"];

export default async function TenantCommandCenter({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;
  const currentTenant = resolvedParams.tenant.toLowerCase();

  // Security Check 1: Route Validation
  if (!VALID_TENANTS.includes(currentTenant)) {
    notFound(); 
  }

  // The Orchestrator's DB Query: Fetch the isolated tenant vault
  const tenantData = await prisma.tenant.findFirst({
    where: {
      name: {
        contains: currentTenant,
        mode: "insensitive", 
      },
    },
    include: {
      // Bring in the N-Tier Vendors
      vendors: {
        orderBy: { riskTier: "asc" },
      },
      // Bring in the 12-Agent Workforce Logs (latest 5)
      agent_logs: {
        orderBy: { timestamp: "desc" },
        take: 5,
      },
    },
  });

  // Security Check 2: Database Confirmation
  if (!tenantData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-10">
        <h1 className="text-red-500 font-bold tracking-widest uppercase mb-4 text-xl">
          Database Sync Error
        </h1>
        <p className="text-slate-400">
          Agent 1 (The Orchestrator) could not find <span className="text-white font-mono">{currentTenant}</span> in Supabase.
        </p>
        <p className="text-slate-500 text-sm mt-2">
          Did you run the Prisma seed file?
        </p>
      </div>
    );
  }

  // Format the ALE Baseline (e.g., 11100000 -> $11.1M)
  const formattedAle = `$${(tenantData.ale_baseline / 1000000).toFixed(1)}M`;
  const criticalVendors = tenantData.vendors.filter(v => v.riskTier === "CRITICAL").length;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-slate-950 p-10 pt-32">
      <div className="w-full max-w-5xl">
        <div className="flex justify-between items-end mb-8 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-widest text-white mb-1">
              {tenantData.name}
            </h1>
            <p className="text-emerald-500 font-mono text-xs tracking-wider uppercase">
              {tenantData.industry} // SECURE ENCLAVE
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              Financial Exposure (ALE Baseline)
            </p>
            <p className="text-2xl font-bold text-red-400">
              {formattedAle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vendor Telemetry */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-lg shadow-lg">
            <h2 className="text-[11px] font-bold text-slate-400 mb-4 uppercase tracking-widest">
              Supply Chain Telemetry
            </h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-slate-950 rounded border border-slate-800 flex-1">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Total Vendors</p>
                <p className="text-xl font-bold text-white">{tenantData.vendors.length}</p>
              </div>
              <div className="p-4 bg-red-500/10 rounded border border-red-500/30 flex-1">
                <p className="text-[10px] text-red-400 uppercase font-bold">Critical Risk</p>
                <p className="text-xl font-bold text-red-500">{criticalVendors}</p>
              </div>
            </div>
          </div>

          {/* Agent Workforce Logs */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-lg shadow-lg">
            <h2 className="text-[11px] font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Agent Stream
            </h2>
            <div className="space-y-3">
              {tenantData.agent_logs.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No agent logs recorded yet.</p>
              ) : (
                tenantData.agent_logs.map((log) => (
                  <div key={log.id} className="border-l-2 border-emerald-500 pl-3">
                    <p className="text-[10px] text-emerald-400 font-mono">
                      [AGENT {log.agentId}: {log.agentName}]
                    </p>
                    <p className="text-xs text-slate-300">{log.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}