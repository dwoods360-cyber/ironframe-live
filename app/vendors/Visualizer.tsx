"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { RiskTier } from "@/app/vendors/schema";
import { VendorLetterGrade } from "@/utils/scoringEngine";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d").then((module) => module.default), {
  ssr: false,
});

type VisualizerVendor = {
  vendorId: string;
  vendorName: string;
  industry: string;
  associatedEntity: string;
  cascadedRiskTier: RiskTier;
  healthScore: {
    grade: VendorLetterGrade;
    score: number;
  };
};

type VisualizerProps = {
  vendors: VisualizerVendor[];
  selectedVendorId: string | null;
  activeVendorIds: string[];
  onSelectVendor: (vendorId: string) => void;
};

type GraphNode = {
  id: string;
  label: string;
  type: "service" | "vendor";
  riskTier?: RiskTier;
  grade?: VendorLetterGrade;
  fx?: number;
  fy?: number;
  x?: number;
  y?: number;
};

type GraphLink = {
  source: string;
  target: string;
  riskTier: RiskTier;
};

const SERVICE_COORDS: Record<string, { x: number; y: number }> = {
  finance: { x: -40, y: -15 },
  it: { x: 40, y: 15 },
};

function mapVendorToService(vendor: VisualizerVendor) {
  if (vendor.industry === "Finance" || vendor.associatedEntity === "VAULTBANK") {
    return "service-finance";
  }

  return "service-it";
}

function getLinkColor(riskTier: RiskTier) {
  if (riskTier === "LOW") {
    return "rgba(52, 211, 153, 0.85)";
  }

  return riskTier === "CRITICAL" ? "rgba(239, 68, 68, 0.95)" : "rgba(248, 113, 113, 0.9)";
}

function getNodeRadiusByGrade(grade: VendorLetterGrade | undefined) {
  if (!grade) {
    return 8;
  }

  if (grade === "A") return 7;
  if (grade === "B") return 8;
  if (grade === "C") return 9;
  if (grade === "D") return 11;
  return 13;
}

export default function Visualizer({ vendors, selectedVendorId, activeVendorIds, onSelectVendor }: VisualizerProps) {
  const graph = useMemo(() => {
    const serviceNodes: GraphNode[] = [
      {
        id: "service-finance",
        label: "Finance Service",
        type: "service",
        fx: SERVICE_COORDS.finance.x,
        fy: SERVICE_COORDS.finance.y,
      },
      {
        id: "service-it",
        label: "IT Service",
        type: "service",
        fx: SERVICE_COORDS.it.x,
        fy: SERVICE_COORDS.it.y,
      },
    ];

    const vendorNodes: GraphNode[] = vendors.map((vendor, index) => {
      const angle = (2 * Math.PI * index) / Math.max(vendors.length, 1);
      const radius = 220;

      return {
        id: `vendor-${vendor.vendorId}`,
        label: vendor.vendorName,
        type: "vendor",
        riskTier: vendor.cascadedRiskTier,
        grade: vendor.healthScore.grade,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    });

    const links: GraphLink[] = vendors.map((vendor) => ({
      source: `vendor-${vendor.vendorId}`,
      target: mapVendorToService(vendor),
      riskTier: vendor.cascadedRiskTier,
    }));

    return {
      nodes: [...serviceNodes, ...vendorNodes],
      links,
    };
  }, [vendors]);

  const highRiskRoutes = useMemo(
    () =>
      vendors
        .filter((vendor) => vendor.cascadedRiskTier !== "LOW")
        .map((vendor) => ({
          vendorName: vendor.vendorName,
          serviceName: mapVendorToService(vendor) === "service-finance" ? "Finance Service" : "IT Service",
        })),
    [vendors],
  );

  return (
    <div className="rounded border border-slate-800 bg-slate-950/50 p-3 pt-10">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-300">Blast Radius // Vendor to Internal Service Map</p>
      <p className="mb-3 text-[9px] uppercase tracking-wide text-slate-400">High/Critical links pulse red • Low links stay green • Click vendor node for history/actions</p>
      <div className="h-[480px] overflow-hidden rounded border border-slate-800 bg-slate-950">
        <ForceGraph2D
          graphData={graph}
          width={920}
          height={480}
          cooldownTicks={120}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const graphNode = node as GraphNode;
            const label = graphNode.label;
            const fontSize = 11 / globalScale;
            const isService = graphNode.type === "service";
            const isSelected = graphNode.id === `vendor-${selectedVendorId}`;
            const vendorId = graphNode.id.replace("vendor-", "");
            const isActiveNotification = graphNode.type === "vendor" && activeVendorIds.includes(vendorId);
            const nodeRadius = isService ? 12 : getNodeRadiusByGrade(graphNode.grade);
            const isLowGrade = graphNode.grade === "D" || graphNode.grade === "F";

            const pulseRadius = graphNode.riskTier && graphNode.riskTier !== "LOW"
              ? 14 + Math.abs(Math.sin(Date.now() / 260)) * 6
              : 0;

            if (pulseRadius > 0 && graphNode.x && graphNode.y) {
              ctx.beginPath();
              ctx.arc(graphNode.x, graphNode.y, pulseRadius, 0, 2 * Math.PI, false);
              ctx.fillStyle = "rgba(248, 113, 113, 0.16)";
              ctx.fill();
            }

            if (isActiveNotification && graphNode.x && graphNode.y) {
              const activePulseRadius = 16 + Math.abs(Math.sin(Date.now() / 230)) * 7;
              ctx.beginPath();
              ctx.arc(graphNode.x, graphNode.y, activePulseRadius, 0, 2 * Math.PI, false);
              ctx.fillStyle = "rgba(248, 113, 113, 0.22)";
              ctx.fill();
            }

            if (isLowGrade && graphNode.x && graphNode.y) {
              const lowGradePulse = nodeRadius + 9 + Math.abs(Math.sin(Date.now() / 200)) * 7;
              ctx.beginPath();
              ctx.arc(graphNode.x, graphNode.y, lowGradePulse, 0, 2 * Math.PI, false);
              ctx.fillStyle = "rgba(248, 113, 113, 0.2)";
              ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, nodeRadius, 0, 2 * Math.PI, false);
            ctx.fillStyle = isService
              ? "rgba(59, 130, 246, 0.85)"
              : graphNode.riskTier === "LOW"
                ? "rgba(52, 211, 153, 0.95)"
                : "rgba(248, 113, 113, 0.95)";
            ctx.fill();

            if (isSelected || isActiveNotification) {
              ctx.lineWidth = 2;
              ctx.strokeStyle = isActiveNotification ? "rgba(248, 113, 113, 0.95)" : "rgba(191, 219, 254, 0.95)";
              ctx.stroke();
            }

            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = "#e2e8f0";
            ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + 12);
          }}
          linkColor={(link) => getLinkColor((link as GraphLink).riskTier)}
          linkWidth={(link) => ((link as GraphLink).riskTier === "LOW" ? 1.8 : 2.8)}
          linkDirectionalParticles={(link) => ((link as GraphLink).riskTier === "LOW" ? 0 : 4)}
          linkDirectionalParticleWidth={(link) => ((link as GraphLink).riskTier === "CRITICAL" ? 3 : 2)}
          linkDirectionalParticleSpeed={(link) => ((link as GraphLink).riskTier === "CRITICAL" ? 0.014 : 0.009)}
          onNodeClick={(node) => {
            const graphNode = node as GraphNode;
            if (graphNode.type !== "vendor") {
              return;
            }

            onSelectVendor(graphNode.id.replace("vendor-", ""));
          }}
        />
      </div>

      <div className="mt-2 rounded border border-slate-800 bg-slate-900/40 px-2 py-2">
        <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">High Risk Pulse Routes</p>
        <div className="flex flex-wrap gap-1">
          {highRiskRoutes.map((route) => (
            <span key={`${route.vendorName}-${route.serviceName}`} className="rounded border border-red-500/50 bg-red-500/10 px-2 py-1 text-[9px] uppercase tracking-wide text-red-200">
              {route.vendorName} → {route.serviceName}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
