"use client";

import { useCallback, useEffect } from "react";
import type { BoardReportPayload } from "@/lib/reporting/boardReportQueries";
import { useBoardReadinessStatusStore } from "@/app/store/boardReadinessStatusStore";
import { approveBoardCommentary } from "@/app/actions/dailySnapshotActions";
import ReadinessGauge from "./ReadinessGauge";
import FinancialDeltaBars from "./FinancialDeltaBars";
import SyntheticHeatmap from "./SyntheticHeatmap";
import GovernanceAuditList from "./GovernanceAuditList";
import BoardReadinessTargetPanel from "./BoardReadinessTargetPanel";
import ImpactProjectionWidget from "./ImpactProjectionWidget";
import ReadinessTrendChart from "./ReadinessTrendChart";
import BoardReportDevSnapshotTools from "./BoardReportDevSnapshotTools";
import CyberInsuranceProjectionCard from "./CyberInsuranceProjectionCard";
import ResilienceCertificateBadge from "./ResilienceCertificateBadge";
import ExecutiveCommentaryEditor from "./ExecutiveCommentaryEditor";
import ResilienceStreakCard from "./ResilienceStreakCard";
import FailureAnalysisCard from "./FailureAnalysisCard";

type Props = {
  data: BoardReportPayload;
  isDevelopment: boolean;
  tenantName: string;
  canApproveCommentary: boolean;
};

function formatLessonRecordedAt(iso: string | null): string {
  if (!iso?.trim()) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function usdFromCentsString(cents: string): string {
  try {
    const n = Number(BigInt(cents)) / 100;
    return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  } catch {
    return "—";
  }
}

export default function BoardReportClient({
  data,
  isDevelopment,
  tenantName,
  canApproveCommentary,
}: Props) {
  const setFromBoardReport = useBoardReadinessStatusStore((s) => s.setFromBoardReport);

  const handlePrint = useCallback(() => {
    document.body.classList.add("board-report-print-mode");
    const cleanup = () => {
      document.body.classList.remove("board-report-print-mode");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    window.setTimeout(cleanup, 2_000);
  }, []);

  const {
    readiness,
    financial,
    synthetics,
    governance,
    targetReadinessScore,
    currentReadinessScore,
    statusState,
    criticalExposureCount,
    trendSnapshots,
    lessonLearned,
    insuranceProjection,
    isCertified,
    certifiedAtIso,
    certificateStatus,
    certificateExpiresInDays,
    certificateRenewalStreakDays,
    executiveSummary,
    isApproved,
    approvedBy,
    approvedAtIso,
    resilienceStreak,
    failureAnalysis,
  } = data;

  useEffect(() => {
    setFromBoardReport(currentReadinessScore, targetReadinessScore);
  }, [currentReadinessScore, targetReadinessScore, setFromBoardReport]);

  const handleApprove = useCallback(() => {
    void approveBoardCommentary().then(() => {
      window.location.reload();
    });
  }, []);

  return (
    <div
      id="board-report-print-root"
      className="board-report-surface relative mx-auto w-full max-w-[min(100%,96rem)] px-4 py-4 text-slate-100 md:px-8 print:bg-white print:text-black print:shadow-none"
    >
      {!isApproved ? (
        <div className="pointer-events-none hidden print:flex print:absolute print:inset-0 print:items-center print:justify-center">
          <div className="rotate-[-24deg] text-4xl font-black tracking-[0.2em] text-rose-600/20">
            DRAFT - NOT FOR DISTRIBUTION
          </div>
        </div>
      ) : null}
      <header className="mb-6 flex flex-col gap-3 border-b border-zinc-800 pb-4 print:border-zinc-300 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 print:text-zinc-600">
            Phase 2 · Executive
          </p>
          <h1 className="mt-1 text-xl font-black uppercase tracking-tight text-zinc-100 print:text-zinc-900 md:text-2xl">
            Board Report
          </h1>
          <p className="mt-1 max-w-xl text-[11px] text-zinc-500 print:text-zinc-700">
            Operational readiness, simulated financial posture, synthetic risk concentration, and governance
            configuration changes.
          </p>
          <div className="mt-2 flex items-center gap-2 text-[10px]">
            <span className="font-semibold text-zinc-300 print:text-zinc-900">Operator: Dereck</span>
            {resilienceStreak.isEliteOperator ? (
              <span
                title="ELITE RESILIENCE OPERATOR: Verified 5+ high-pressure system restorations."
                className="rounded border border-cyan-400/80 bg-gradient-to-r from-slate-200 via-cyan-100 to-zinc-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-900"
              >
                PLATINUM ELITE
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="h-10 shrink-0 rounded border border-zinc-600 bg-zinc-900 px-4 text-[9px] font-black uppercase tracking-widest text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 print:hidden"
        >
          [ Generate Executive PDF ]
        </button>
      </header>
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <span
          className={`rounded border px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${
            isApproved
              ? "border-emerald-500/60 bg-emerald-950/35 text-emerald-200"
              : "border-rose-500/60 bg-rose-950/30 text-rose-200"
          }`}
        >
          Approval Status: {isApproved ? "APPROVED" : "DRAFT"}
        </span>
        {isApproved && approvedBy ? (
          <span className="text-[9px] text-zinc-500">
            Signed by {approvedBy}
            {approvedAtIso ? ` at ${new Date(approvedAtIso).toLocaleString()}` : ""}
          </span>
        ) : null}
        {!isApproved && canApproveCommentary ? (
          <button
            type="button"
            onClick={handleApprove}
            className="rounded border border-emerald-500/60 bg-emerald-950/30 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-100 hover:border-emerald-400 hover:bg-emerald-900/40"
          >
            Sign Off
          </button>
        ) : null}
      </div>
      {isCertified || certificateStatus === "EXPIRED" || certificateStatus === "IN_PROGRESS" ? (
        <ResilienceCertificateBadge
          tenantName={tenantName}
          certifiedAtIso={certifiedAtIso}
          certificateStatus={certificateStatus}
          certificateExpiresInDays={certificateExpiresInDays}
          certificateRenewalStreakDays={certificateRenewalStreakDays}
        />
      ) : null}

      <div className="mb-6 grid gap-4 lg:grid-cols-2 print:hidden">
        <div className="space-y-4">
          <BoardReadinessTargetPanel initialTarget={targetReadinessScore} />
          <BoardReportDevSnapshotTools isDevelopment={isDevelopment} />
        </div>
        <ImpactProjectionWidget criticalExposureCount={criticalExposureCount} />
      </div>

      <div className="mb-6 hidden print:block">
        <ImpactProjectionWidget criticalExposureCount={criticalExposureCount} />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-zinc-800 bg-[#07070c] p-6 print:border-zinc-300 print:bg-white lg:col-span-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 print:text-zinc-600">
            Hero · Operational readiness
          </h2>
          <ReadinessGauge
            score={readiness.score}
            maxScore={readiness.maxScore}
            band={readiness.band}
            readinessRating={readiness.readinessRating}
            statusState={statusState}
            targetReadinessScore={targetReadinessScore}
            hasPriorityOneVipExposure={readiness.hasPriorityOneVipExposure}
          />
          <dl className="mt-4 space-y-1 border-t border-zinc-800/80 pt-3 text-[9px] text-zinc-500 print:border-zinc-200">
            <div className="flex justify-between gap-2">
              <dt>Connection penalties (stale / failed tests)</dt>
              <dd className="font-mono text-zinc-300 print:text-zinc-800">
                {readiness.breakdown.staleWebhookPenalty + readiness.breakdown.failedTestPenalty}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Attack surface (std / VIP weighted)</dt>
              <dd className="font-mono text-zinc-300 print:text-zinc-800">
                {readiness.breakdown.attackPenaltyStandard + readiness.breakdown.attackPenaltyVip}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>VIP exposure (persistent while L5 loss &gt; 0)</dt>
              <dd className="font-mono text-rose-300/90 print:text-rose-900">
                {readiness.breakdown.vipExposurePersistent}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Restoration bonus (applied)</dt>
              <dd className="font-mono text-emerald-400/90 print:text-emerald-800">
                +{readiness.breakdown.restorationBonus}
              </dd>
            </div>
            {readiness.breakdown.vipHardeningBonus > 0 ? (
              <div className="flex justify-between gap-2">
                <dt>VIP hardening bonus (per hardened L5)</dt>
                <dd className="font-mono text-cyan-400/90 print:text-cyan-800">
                  +{readiness.breakdown.vipHardeningBonus}
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-4 rounded-lg border border-zinc-700/70 bg-zinc-950/55 p-3 print:border-zinc-300 print:bg-zinc-50">
            <h3 className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500 print:text-zinc-600">
              Lesson learned
            </h3>
            <p className="mt-2 text-[11px] leading-snug text-zinc-100 print:text-zinc-900">
              Historical Low:{" "}
              <span className="font-mono font-bold tabular-nums">{lessonLearned.historicalLowestScore}%</span>{" "}
              <span className="text-zinc-500 print:text-zinc-600">
                (Recorded: {formatLessonRecordedAt(lessonLearned.historicalLowestRecordedAtIso)})
              </span>
            </p>
            <p className="mt-2 text-[9px] leading-snug text-zinc-500 print:text-zinc-700">
              Current improvement of{" "}
              <span className="font-mono font-semibold text-emerald-400/95 print:text-emerald-800">
                {lessonLearned.deltaSinceLow}
              </span>
              % since our most vulnerable state.
            </p>
          </div>
          <ExecutiveCommentaryEditor initialValue={executiveSummary} isApproved={isApproved} />
        </section>

        <section className="space-y-4 lg:col-span-8">
          <ResilienceStreakCard streak={resilienceStreak} />
          <FailureAnalysisCard analysis={failureAnalysis} />
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 print:border-zinc-300 print:bg-white">
            <h2 className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 print:text-zinc-600">
              Capital at risk (synthetic population)
            </h2>
            <p className="text-2xl font-black tabular-nums text-zinc-100 print:text-zinc-900">
              {usdFromCentsString(financial.totalCapitalAtRiskCents)}
            </p>
            <p className="mt-1 text-[9px] text-zinc-600 print:text-zinc-700">
              Sum of `SyntheticEmployee.monetaryValue` (USD cents). Bleed and recovery metrics below derive from
              simulation threat rows (`SIM_LOSS` ingestion / lab remediation tags).
            </p>
          </div>
          <CyberInsuranceProjectionCard projection={insuranceProjection} />
          <FinancialDeltaBars financial={financial} />
        </section>
      </div>

      <div className="mb-6">
        <ReadinessTrendChart data={trendSnapshots} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SyntheticHeatmap rows={synthetics} />
        <GovernanceAuditList rows={governance} />
      </div>
    </div>
  );
}
