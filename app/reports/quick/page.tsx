import Link from "next/link";
import { FileText } from "lucide-react";
import { MASTER_VENDORS } from "@/app/vendors/schema";

type CoreRiskData = {
  probability: number;
  impact: number;
  controls: number;
  cost: number;
};

type RoleCard = {
  role: string;
  metrics: Array<{ label: string; value: string }>;
};

function createCoreRiskData(): CoreRiskData {
  const vendorCount = MASTER_VENDORS.length;
  const criticalCount = MASTER_VENDORS.filter((vendor) => vendor.riskTier === "CRITICAL").length;
  const highCount = MASTER_VENDORS.filter((vendor) => vendor.riskTier === "HIGH").length;
  const lowCount = MASTER_VENDORS.filter((vendor) => vendor.riskTier === "LOW").length;

  const probability = Number(((criticalCount * 0.22 + highCount * 0.14 + lowCount * 0.06) / vendorCount).toFixed(2));
  const impact = Number((criticalCount * 1400000 + highCount * 760000 + lowCount * 280000).toFixed(0));
  const controls = Number((84 + (lowCount - criticalCount) * 2.2).toFixed(1));
  const cost = Number((vendorCount * 185000 + criticalCount * 320000 + highCount * 170000).toFixed(0));

  return { probability, impact, controls, cost };
}

function toCurrency(value: number) {
  return `$${value.toLocaleString()}`;
}

function toPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function buildRoleCards(core: CoreRiskData): RoleCard[] {
  const annualLossExposure = Math.round(core.probability * core.impact);
  const probableLoss = Math.round(core.impact * 0.62);
  const roi = ((core.impact - core.cost) / core.cost) * 100;
  const residualRisk = Math.max(8, 100 - core.controls);
  const mttrHours = Math.max(6, Math.round(28 - core.controls / 7));

  return [
    {
      role: "CISO",
      metrics: [
        { label: "Threat Exposure", value: toPercent(core.probability) },
        { label: "Control Coverage", value: `${core.controls.toFixed(1)}%` },
        { label: "Residual Risk", value: `${residualRisk.toFixed(1)}%` },
      ],
    },
    {
      role: "CRO",
      metrics: [
        { label: "Risk Velocity", value: toPercent(core.probability * 0.92) },
        { label: "Portfolio Impact", value: toCurrency(core.impact) },
        { label: "Residual Risk", value: `${residualRisk.toFixed(1)}%` },
      ],
    },
    {
      role: "Board",
      metrics: [
        { label: "Enterprise Risk Index", value: `${(core.probability * 100 + residualRisk).toFixed(1)}` },
        { label: "Governance Coverage", value: `${core.controls.toFixed(1)}%` },
        { label: "Budgeted Mitigation", value: toCurrency(core.cost) },
      ],
    },
    {
      role: "Legal",
      metrics: [
        { label: "Regulatory Exposure", value: toCurrency(Math.round(core.impact * 0.38)) },
        { label: "Control Deficiency", value: `${residualRisk.toFixed(1)}%` },
        { label: "Litigation Reserve", value: toCurrency(Math.round(core.cost * 0.31)) },
      ],
    },
    {
      role: "CFO",
      metrics: [
        { label: "Expected Loss", value: toCurrency(annualLossExposure) },
        { label: "ROI", value: `${roi.toFixed(1)}%` },
      ],
    },
    {
      role: "Audit",
      metrics: [
        { label: "Control Effectiveness", value: `${core.controls.toFixed(1)}%` },
        { label: "Evidence Completeness", value: `${Math.max(75, core.controls - 3.4).toFixed(1)}%` },
        { label: "Audit Exception Rate", value: `${Math.max(2.1, residualRisk / 8).toFixed(1)}%` },
      ],
    },
    {
      role: "Product",
      metrics: [
        { label: "Release Risk", value: toPercent(core.probability * 0.74) },
        { label: "Feature Control Debt", value: `${Math.max(4, residualRisk / 2).toFixed(1)}%` },
        { label: "Remediation Cost", value: toCurrency(Math.round(core.cost * 0.42)) },
      ],
    },
    {
      role: "Insurance",
      metrics: [
        { label: "ALE", value: toCurrency(annualLossExposure) },
        { label: "Probable Loss", value: toCurrency(probableLoss) },
      ],
    },
    {
      role: "Ops",
      metrics: [
        { label: "Operational Disruption", value: `${Math.round(core.probability * 84)} pts` },
        { label: "Control Uptime", value: `${Math.max(87, core.controls + 2.5).toFixed(1)}%` },
        { label: "Recovery Cost", value: toCurrency(Math.round(core.cost * 0.27)) },
      ],
    },
    {
      role: "ITSM",
      metrics: [
        { label: "MTTR", value: `${mttrHours}h` },
        { label: "Incident Load", value: `${Math.round(core.probability * 56)} tickets` },
        { label: "Service Stability", value: `${Math.max(86, core.controls + 1.1).toFixed(1)}%` },
      ],
    },
  ];
}

export default function QuickReportsHubPage() {
  const coreRiskData = createCoreRiskData();
  const roleCards = buildRoleCards(coreRiskData);

  return (
    <div className="min-h-full bg-slate-950 p-6">
      <section className="rounded border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <h1 className="text-[12px] font-bold uppercase tracking-wide text-white">GRC Intelligence Hub</h1>
          <Link
            href="/reports/audit-trail"
            className="inline-flex items-center gap-2 rounded-full border border-blue-500/70 bg-blue-500/10 px-3 py-1.5 text-[10px] font-bold uppercase text-blue-200"
          >
            <FileText className="h-3 w-3" />
            Open Full Audit Trail
          </Link>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded border border-slate-800 bg-slate-950/40 p-3 text-[10px] text-slate-300 md:grid-cols-4">
          <div>
            <p className="uppercase text-slate-500">Core Probability</p>
            <p className="font-bold text-white">{toPercent(coreRiskData.probability)}</p>
          </div>
          <div>
            <p className="uppercase text-slate-500">Core Impact</p>
            <p className="font-bold text-white">{toCurrency(coreRiskData.impact)}</p>
          </div>
          <div>
            <p className="uppercase text-slate-500">Core Controls</p>
            <p className="font-bold text-white">{coreRiskData.controls.toFixed(1)}%</p>
          </div>
          <div>
            <p className="uppercase text-slate-500">Core Cost</p>
            <p className="font-bold text-white">{toCurrency(coreRiskData.cost)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {roleCards.map((card) => (
            <article key={card.role} data-testid={`role-card-${card.role.toLowerCase()}`} className="rounded border border-slate-800 bg-slate-950/50 p-3">
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white">{card.role}</h2>
              <div className="space-y-1">
                {card.metrics.map((metric) => (
                  <div key={`${card.role}-${metric.label}`} className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/50 px-2 py-1 text-[10px]">
                    <span className="uppercase text-slate-400">{metric.label}</span>
                    <span className="font-bold text-white">{metric.value}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
