"use client";



import { useCallback, useEffect, useState } from "react";

import { Shield, Crosshair } from "lucide-react";

import { useTenantContext } from "@/app/context/TenantProvider";

import { useRiskStore } from "@/app/store/riskStore";

import GovernanceHealthModal from "@/app/components/GovernanceHealthModal";

import type { GovernanceMaturitySnapshot, MaturityTrendPoint } from "@/app/types/governanceMaturity";

import type { IrontallyFrameworkSnapshot } from "@/app/services/irontallyMapper";
import type { CostOfNonComplianceResult } from "@/app/utils/financialRisk";
import { formatCoNCExecutiveUsd } from "@/app/utils/financialRisk";



type MaturityApiResponse = {

  ok: boolean;

  score: number;

  governanceDegradationActive: boolean;

  neutralizeMinChars: number;

  apiOutagePenaltyActive?: boolean;

  isUnderTargetedSiege?: boolean;

  targetedAdversarialMaturityPenalty?: number;

  current: GovernanceMaturitySnapshot;

  trend: MaturityTrendPoint[];

  financialImpact?: CostOfNonComplianceResult;
  irontally?: IrontallyFrameworkSnapshot;
};



function scoreColor(score: number): string {

  if (score >= 8) return "text-emerald-300";

  if (score >= 5) return "text-cyan-200";

  return "text-rose-300";

}



function ringColor(score: number): string {

  if (score >= 8) return "stroke-emerald-400";

  if (score >= 5) return "stroke-cyan-400";

  return "stroke-rose-500 animate-pulse";

}



export default function MaturityBadge() {

  const { tenantFetch } = useTenantContext();

  const executiveView = useRiskStore((s) => s.grcDashboardViewMode === "executive");

  const [data, setData] = useState<MaturityApiResponse | null>(null);

  const [open, setOpen] = useState(false);



  const refresh = useCallback(async () => {

    try {

      const res = await tenantFetch("/api/grc/governance-maturity?recalc=1");

      if (!res.ok) return;

      const j = (await res.json()) as MaturityApiResponse;

      if (j.ok) {

        setData(j);

        const s = useRiskStore.getState();

        const degraded =
          Boolean(j.apiOutagePenaltyActive) || Boolean(j.current?.apiOutagePenaltyActive);

        const staleBlocking = j.current?.sustainabilityStaleLockdownFrozen === true;

        if (
          j.neutralizeMinChars !== s.requiredForensicAttestationMin ||
          degraded !== s.isSustainabilityApiDegraded ||
          staleBlocking !== s.isSustainabilityStaleLockdownBlocking
        ) {

          s.setConstitutionalIntegrityState({

            isConstitutionalEmergency: s.isConstitutionalEmergency,

            constitutionalRebaselinePending: s.constitutionalRebaselinePending,

            constitutionalDegradedMode: s.constitutionalDegradedMode,

            requiredForensicAttestationMin: j.neutralizeMinChars,

            isSustainabilityApiDegraded: degraded,

            isSustainabilityStaleLockdownBlocking: staleBlocking,

            isOverrideSpent: s.isOverrideSpent,

            sha256: s.constitutionalSha256,

            sha256Short: s.constitutionalSha256Short,

            failureReason: s.constitutionalFailureReason,

            failureMessage: s.constitutionalFailureMessage,

          });

        }

      }

    } catch {

      /* ignore */

    }

  }, [tenantFetch]);



  useEffect(() => {

    void refresh();

    const id = setInterval(() => void refresh(), 60_000);

    return () => clearInterval(id);

  }, [refresh]);



  const score = data?.score ?? 7;

  const criticalFrozen = data?.current?.sustainabilityStaleLockdownFrozen === true;

  const adversarialSiege =
    Boolean(data?.isUnderTargetedSiege) || (data?.targetedAdversarialMaturityPenalty ?? 0) > 0;
  const adversarialPenaltyDisplay = (data?.targetedAdversarialMaturityPenalty ?? 0).toFixed(1);

  const pct = Math.min(100, Math.max(0, (score / 10) * 100));

  const degraded = data?.governanceDegradationActive ?? false;

  const financial = data?.financialImpact;

  const dividendLabel = financial

    ? formatCoNCExecutiveUsd(financial.governanceDividendUsd)

    : "—";



  return (

    <>

      <button

        type="button"

        onClick={() => setOpen(true)}

        className={`group inline-flex items-center gap-2 rounded-full border px-2 py-1 transition-colors ${

          criticalFrozen

            ? "border-violet-600/90 bg-violet-950/55 hover:bg-violet-900/45"

            : degraded

            ? "border-rose-600/80 bg-rose-950/50 hover:bg-rose-900/40"

            : "border-cyan-700/60 bg-slate-950/80 hover:border-cyan-500/70"

        }`}

        title={
          executiveView
            ? "Governance dividend (Cost of Non-Compliance)"
            : adversarialSiege
              ? `Score reduced by ${adversarialPenaltyDisplay} due to persistent targeted activity from Hard-Banned identifiers.`
              : "System Maturity Score — Governance Health"
        }

        aria-label={

          executiveView

            ? `Governance dividend ${dividendLabel}`

            : `System maturity score ${score.toFixed(1)} out of 10`

        }

      >

        <span className="flex shrink-0 items-center gap-1">
          <span className="relative flex h-9 w-9 items-center justify-center">

          <svg className="absolute inset-0 h-9 w-9 -rotate-90" viewBox="0 0 36 36" aria-hidden>

            <circle

              cx="18"

              cy="18"

              r="15"

              fill="none"

              className="stroke-slate-800"

              strokeWidth="3"

            />

            <circle

              cx="18"

              cy="18"

              r="15"

              fill="none"

              className={criticalFrozen ? "stroke-violet-400 animate-pulse" : ringColor(score)}

              strokeWidth="3"

              strokeDasharray={`${(pct / 100) * 94} 94`}

              strokeLinecap="round"

            />

          </svg>

          <Shield className={`relative h-3.5 w-3.5 ${criticalFrozen ? "text-violet-300" : scoreColor(score)}`} aria-hidden />

        </span>

          {!executiveView && adversarialSiege ? (
            <span
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-500/50 bg-gradient-to-b from-amber-950/80 to-slate-950/90 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
              title={`Score reduced by ${adversarialPenaltyDisplay} due to persistent targeted activity from Hard-Banned identifiers.`}
            >
              <Crosshair
                className="h-4 w-4 text-amber-300"
                strokeWidth={2.25}
                aria-hidden
              />
            </span>
          ) : null}
        </span>

        <span className="text-left">

          <span className="block text-[7px] font-bold uppercase tracking-widest text-slate-500">

            {executiveView ? "Gov. dividend" : "Maturity"}

          </span>

          <span className={`block font-mono text-[11px] font-black tabular-nums ${criticalFrozen ? "text-violet-200" : scoreColor(score)}`}>

            {executiveView ? (

              dividendLabel

            ) : (

              <>

                {score.toFixed(1)}

                <span className="text-[8px] font-normal text-slate-500"> /10</span>

              </>

            )}

          </span>

          {!executiveView && criticalFrozen ? (
            <span className="block text-[6px] font-black uppercase tracking-wide text-rose-400">
              CRITICAL: FROZEN
            </span>
          ) : !executiveView && data?.current?.apiOutagePenaltyActive ? (
            <span className="block text-[6px] font-bold uppercase tracking-wide text-amber-300/95">
              Degraded (API Outage)
            </span>
          ) : null}

        </span>

      </button>



      {open && data ? (

        <GovernanceHealthModal

          snapshot={data.current}

          trend={data.trend}

          financialImpact={data.financialImpact}
          irontally={data.irontally}
          onClose={() => setOpen(false)}

          onRefresh={() => void refresh()}

        />

      ) : null}

    </>

  );

}

