"use client";

import { useSyncExternalStore } from "react";
import { TenantKey } from "@/app/utils/tenantIsolation";

type ExecutionStatus = "idle" | "pending" | "applied";

type RemediationState = {
  remediatedAssetIds: string[];
  executionStatus: Record<string, ExecutionStatus>;
  riskReductionByEntity: Record<TenantKey, number>;
  auditTrail: string[];
};

const listeners = new Set<() => void>();

let remediationState: RemediationState = {
  remediatedAssetIds: [],
  executionStatus: {},
  riskReductionByEntity: {
    medshield: 0,
    vaultbank: 0,
    gridcore: 0,
  },
  auditTrail: [],
};

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function subscribeRemediation(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRemediationSnapshot() {
  return remediationState;
}

export function setRemediationPending(taskId: string) {
  remediationState = {
    ...remediationState,
    executionStatus: {
      ...remediationState.executionStatus,
      [taskId]: "pending",
    },
  };
  emitChange();
}

export function applyRemediationSuccess(input: {
  taskId: string;
  entityKey: TenantKey;
  assetId: string;
  riskReduction: number;
  auditRecord: string;
}) {
  remediationState = {
    ...remediationState,
    remediatedAssetIds: remediationState.remediatedAssetIds.includes(input.assetId)
      ? remediationState.remediatedAssetIds
      : [input.assetId, ...remediationState.remediatedAssetIds],
    executionStatus: {
      ...remediationState.executionStatus,
      [input.taskId]: "applied",
    },
    riskReductionByEntity: {
      ...remediationState.riskReductionByEntity,
      [input.entityKey]: remediationState.riskReductionByEntity[input.entityKey] + input.riskReduction,
    },
    auditTrail: [input.auditRecord, ...remediationState.auditTrail],
  };

  emitChange();
}

export function useRemediationStore() {
  return useSyncExternalStore(subscribeRemediation, getRemediationSnapshot, getRemediationSnapshot);
}
