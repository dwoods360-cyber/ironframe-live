"use client";

import { TenantKey } from "@/app/utils/tenantIsolation";
import { useRemediationStore, setRemediationPending, applyRemediationSuccess } from "@/app/store/remediationStore";

type RemediationSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  entityLabel: string;
  entityKey: TenantKey;
};

type RemediationTask = {
  id: string;
  assetId: string;
  remediationType: string;
  title: string;
  savings: number;
};

const REMEDIATION_TASKS_BY_ENTITY: Record<TenantKey, RemediationTask[]> = {
  medshield: [
    {
      id: "medshield-task-tech",
      assetId: "ms-telehealth-v3",
      remediationType: "TECHNICAL_FIX",
      title: "Enforce FIPS-140-3 on Medshield Edge Nodes",
      savings: 1800000,
    },
    {
      id: "medshield-task-policy",
      assetId: "ms-telehealth-v3",
      remediationType: "POLICY_FIX",
      title: "Update Vendor SLA to mandate 24hr patching",
      savings: 1600000,
    },
    {
      id: "medshield-task-financial",
      assetId: "ms-telehealth-v3",
      remediationType: "FINANCIAL_FIX",
      title: "Re-allocate $50k budget to Identity Access Management",
      savings: 800000,
    },
  ],
  vaultbank: [
    {
      id: "vaultbank-task-tech",
      assetId: "vb-swift-core",
      remediationType: "TECHNICAL_FIX",
      title: "Rotate SWIFT Core credentials and enforce hardware-backed keys",
      savings: 1200000,
    },
    {
      id: "vaultbank-task-policy",
      assetId: "vb-swift-core",
      remediationType: "POLICY_FIX",
      title: "Update Vendor SLA to mandate 24hr patching",
      savings: 900000,
    },
    {
      id: "vaultbank-task-financial",
      assetId: "vb-swift-core",
      remediationType: "FINANCIAL_FIX",
      title: "Re-allocate $50k budget to Identity Access Management",
      savings: 700000,
    },
  ],
  gridcore: [
    {
      id: "gridcore-task-tech",
      assetId: "gc-scada-terminal",
      remediationType: "TECHNICAL_FIX",
      title: "Harden SCADA terminal segmentation policies",
      savings: 950000,
    },
    {
      id: "gridcore-task-policy",
      assetId: "gc-scada-terminal",
      remediationType: "POLICY_FIX",
      title: "Update Vendor SLA to mandate 24hr patching",
      savings: 650000,
    },
    {
      id: "gridcore-task-financial",
      assetId: "gc-scada-terminal",
      remediationType: "FINANCIAL_FIX",
      title: "Re-allocate $50k budget to Identity Access Management",
      savings: 500000,
    },
  ],
};

export default function RemediationSidebar({ isOpen, onClose, entityLabel, entityKey }: RemediationSidebarProps) {
  const { executionStatus } = useRemediationStore();
  const remediationTasks = REMEDIATION_TASKS_BY_ENTITY[entityKey];
  const estimatedSavings = remediationTasks.reduce((total, task) => total + task.savings, 0);
  const estimatedSavingsLabel = `$${(estimatedSavings / 1000000).toFixed(1)}M`;

  const executeFix = async (task: RemediationTask) => {
    setRemediationPending(task.id);

    const response = await fetch("/api/remediate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        assetId: task.assetId,
        remediationType: task.remediationType,
        user: "AI_AUTOMATION_AGENT",
      }),
    });

    if (!response.ok) {
      return;
    }

    const payload = await response.json();

    applyRemediationSuccess({
      taskId: task.id,
      entityKey,
      assetId: task.assetId,
      riskReduction: Number(payload.riskReduction ?? 0),
      auditRecord: String(payload.auditRecord ?? "Remediation applied."),
    });
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-[58] bg-slate-950/60" onClick={onClose} />}

      <aside
        className={`fixed right-0 top-[108px] z-[59] h-[calc(100vh-108px)] w-[420px] border-l border-slate-800 bg-slate-950 shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-white">
            AI REMEDIATION PLAN // ESTIMATED SAVINGS: {estimatedSavingsLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase text-slate-300 hover:border-blue-500 hover:text-blue-300"
          >
            Close
          </button>
        </div>

        <div className="space-y-3 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Entity: {entityLabel}</p>

          {remediationTasks.map((task, index) => {
            const status = executionStatus[task.id] ?? "idle";

            return (
            <div key={task.title} className="rounded border border-slate-800 bg-slate-900/40 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-300">Task {index + 1}</p>
              <p className="mt-1 text-[11px] text-white">{task.title}</p>
              <p className="mt-2 text-[10px] text-emerald-300">Potential Savings: ${task.savings.toLocaleString()}</p>

              {status === "applied" ? (
                <div className="mt-2 inline-flex items-center rounded border border-emerald-500/70 bg-emerald-500/15 px-2 py-1 text-[9px] font-bold uppercase text-emerald-300">
                  ✓ FIX APPLIED
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => executeFix(task)}
                  disabled={status === "pending"}
                  className="mt-2 inline-flex items-center gap-1.5 rounded border border-blue-500/70 bg-blue-500/10 px-2 py-1 text-[9px] font-bold uppercase text-blue-300 disabled:opacity-60"
                >
                  {status === "pending" ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border border-blue-300 border-t-transparent" />
                      Deploying Configuration...
                    </>
                  ) : (
                    "CONFIRM & EXECUTE FIX"
                  )}
                </button>
              )}
            </div>
          );})}
        </div>
      </aside>
    </>
  );
}
