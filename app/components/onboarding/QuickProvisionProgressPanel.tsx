"use client";

import { useEffect } from "react";

export type QuickProvisionStageId = "tenant" | "invitation" | "finalize";

export type QuickProvisionStage = {
  id: QuickProvisionStageId;
  label: string;
  weight: number;
  estimateSec: number;
};

export const QUICK_PROVISION_STAGES: QuickProvisionStage[] = [
  {
    id: "tenant",
    label: "Creating isolated tenant workspace",
    weight: 48,
    estimateSec: 30,
  },
  {
    id: "invitation",
    label: "Minting activation token & sending welcome email",
    weight: 44,
    estimateSec: 12,
  },
  {
    id: "finalize",
    label: "Finalizing provisioning",
    weight: 8,
    estimateSec: 2,
  },
];

export type QuickProvisionProgressState = {
  stageIndex: number;
  stageId: QuickProvisionStageId;
  stageLabel: string;
  basePercent: number;
  targetPercent: number;
  percent: number;
  remainingSec: number;
  stageStartedAt: number;
  stageEstimateSec: number;
};

export function buildInitialQuickProvisionProgress(): QuickProvisionProgressState {
  const stage = QUICK_PROVISION_STAGES[0]!;
  const totalEstimateSec = QUICK_PROVISION_STAGES.reduce((sum, item) => sum + item.estimateSec, 0);
  return {
    stageIndex: 0,
    stageId: stage.id,
    stageLabel: stage.label,
    basePercent: 0,
    targetPercent: stage.weight,
    percent: 0,
    remainingSec: totalEstimateSec,
    stageStartedAt: Date.now(),
    stageEstimateSec: stage.estimateSec,
  };
}

export function advanceQuickProvisionProgress(
  current: QuickProvisionProgressState,
  nextStageIndex: number,
): QuickProvisionProgressState {
  const stage = QUICK_PROVISION_STAGES[nextStageIndex];
  if (!stage) {
    return {
      ...current,
      stageIndex: QUICK_PROVISION_STAGES.length,
      stageId: "finalize",
      stageLabel: "Complete",
      basePercent: 100,
      targetPercent: 100,
      percent: 100,
      remainingSec: 0,
      stageStartedAt: Date.now(),
      stageEstimateSec: 0,
    };
  }

  const basePercent = QUICK_PROVISION_STAGES.slice(0, nextStageIndex).reduce(
    (sum, item) => sum + item.weight,
    0,
  );
  const remainingSec = QUICK_PROVISION_STAGES.slice(nextStageIndex).reduce(
    (sum, item) => sum + item.estimateSec,
    0,
  );

  return {
    stageIndex: nextStageIndex,
    stageId: stage.id,
    stageLabel: stage.label,
    basePercent,
    targetPercent: basePercent + stage.weight,
    percent: basePercent,
    remainingSec,
    stageStartedAt: Date.now(),
    stageEstimateSec: stage.estimateSec,
  };
}

function formatCountdown(remainingSec: number): string {
  if (remainingSec <= 0) return "Completing…";
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  if (minutes > 0) {
    return `~${minutes}:${String(seconds).padStart(2, "0")} remaining`;
  }
  return `~${remainingSec}s remaining`;
}

type QuickProvisionProgressPanelProps = {
  progress: QuickProvisionProgressState;
  onTick: (updater: (current: QuickProvisionProgressState) => QuickProvisionProgressState) => void;
};

export function QuickProvisionProgressPanel({
  progress,
  onTick,
}: QuickProvisionProgressPanelProps) {
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      onTick((current) => {
        const elapsedSec = (Date.now() - current.stageStartedAt) / 1000;
        const stageSpan = current.targetPercent - current.basePercent;
        const intraRatio =
          current.stageEstimateSec > 0
            ? Math.min(1, elapsedSec / current.stageEstimateSec)
            : 1;
        const animatedPercent =
          current.targetPercent >= 100
            ? 100
            : Math.min(
                current.targetPercent - 0.5,
                current.basePercent + stageSpan * intraRatio,
              );
        const remainingSec = Math.max(0, current.remainingSec - 1);

        return {
          ...current,
          percent: animatedPercent,
          remainingSec,
        };
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [onTick, progress.stageIndex]);

  const stageNumber = Math.min(progress.stageIndex + 1, QUICK_PROVISION_STAGES.length);

  return (
    <div
      className="rounded border border-cyan-700/50 bg-cyan-950/25 p-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-cyan-200">
          Provisioning in progress
        </p>
        <p className="font-mono text-[10px] text-indigo-200">{formatCountdown(progress.remainingSec)}</p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-indigo-500 transition-[width] duration-700 ease-out"
          style={{ width: `${Math.round(progress.percent)}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress.percent)}
          aria-valuetext={`${Math.round(progress.percent)}% — ${progress.stageLabel}`}
        />
      </div>

      <p className="mt-3 font-mono text-[11px] text-slate-100">{progress.stageLabel}</p>
      <p className="mt-1 text-[10px] text-slate-500">
        Stage {stageNumber} of {QUICK_PROVISION_STAGES.length}
        {progress.stageId === "tenant"
          ? " — first local dev run may compile server routes (up to ~60s)."
          : null}
      </p>
    </div>
  );
}
