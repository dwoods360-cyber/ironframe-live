"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Activity, ArrowLeft, ShieldAlert } from "lucide-react";

import Visualizer from "@/app/vendors/Visualizer";
import PilotSurfaceBanner from "@/app/components/pilot/PilotSurfaceBanner";
import { useHostTenantSlug } from "@/app/hooks/useHostTenantSlug";
import { buildHeaderRouteMatrix } from "@/app/utils/grcRouteMatch";
import {
  buildVendorSupplyChainNodes,
  countActiveThreatIntelVendors,
} from "@/app/lib/ironmap/vendorSupplyChainGraph";

export default function VendorSupplyChainPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname() ?? "/";
  const hostTenantSlug = useHostTenantSlug();
  const routes = useMemo(
    () => buildHeaderRouteMatrix(pathname, hostTenantSlug),
    [pathname, hostTenantSlug],
  );
  const vendorsHref = routes.prefix ? `${routes.prefix}/vendors` : "/vendors";
  const nodes = useMemo(() => buildVendorSupplyChainNodes(), []);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(nodes[0]?.vendorId ?? null);

  useEffect(() => {
    const vendorParam = searchParams.get("vendor")?.trim().toLowerCase();
    if (!vendorParam) return;

    const match = nodes.find((node) => node.vendorId === vendorParam);
    if (match) {
      setSelectedVendorId(match.vendorId);
    }
  }, [nodes, searchParams]);

  const activeVendorIds = useMemo(
    () => nodes.filter((n) => n.cascadedRiskTier !== "LOW").map((n) => n.vendorId),
    [nodes],
  );

  const selected = nodes.find((n) => n.vendorId === selectedVendorId) ?? null;
  const intelCount = countActiveThreatIntelVendors(nodes);

  return (
    <div className="min-h-full bg-slate-950 font-sans text-slate-200">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 text-slate-100">
      <PilotSurfaceBanner compact />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
            Ironmap // Agent 10
          </p>
          <h1 className="mt-1 text-lg font-bold uppercase tracking-widest text-white">
            Supply Chain Blast Radius
          </h1>
          <p className="mt-2 max-w-2xl text-xs text-slate-400">
            N-tier vendor telemetry mapped to internal Finance and IT service nodes. Cascaded risk
            elevates when subprocessors report breach intelligence.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={vendorsHref}
            data-testid="supply-chain-vendor-registry-link"
            className="inline-flex h-11 items-center gap-2 rounded border border-slate-700 bg-slate-900 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:border-slate-500"
          >
            <ArrowLeft size={14} />
            Vendor Registry
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Vendors Mapped</p>
          <p className="mt-1 text-2xl font-bold text-white">{nodes.length}</p>
        </div>
        <div className="rounded border border-red-900/50 bg-red-950/20 p-4">
          <p className="text-[9px] font-bold uppercase tracking-wider text-red-300">Active Threat Intel</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-red-200">
            <ShieldAlert size={20} />
            {intelCount}
          </p>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Subprocessors Tracked</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-white">
            <Activity size={20} className="text-blue-400" />
            {nodes.reduce((sum, n) => sum + n.subProcessorCount, 0)}
          </p>
        </div>
      </div>

      <Visualizer
        vendors={nodes}
        selectedVendorId={selectedVendorId}
        activeVendorIds={activeVendorIds}
        onSelectVendor={setSelectedVendorId}
      />

      {selected ? (
        <div className="rounded border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Vendor</p>
          <p className="mt-1 text-sm font-semibold text-white">{selected.vendorName}</p>
          <p className="mt-2 text-xs text-slate-400">
            Entity: {selected.associatedEntity} · Industry: {selected.industry} · Cascaded tier:{" "}
            <span className="font-mono text-amber-300">{selected.cascadedRiskTier}</span> · Health grade:{" "}
            {selected.healthScore.grade}
          </p>
          {selected.breachSubProcessors.length > 0 ? (
            <p className="mt-2 text-xs text-red-300">
              Breach subprocessors: {selected.breachSubProcessors.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}
      </div>
    </div>
  );
}
