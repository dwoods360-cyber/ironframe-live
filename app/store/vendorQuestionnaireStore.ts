"use client";

import { useSyncExternalStore } from "react";
import { TenantKey } from "@/app/utils/tenantIsolation";
import { calculateEntityScore, ENTITY_SCORING_DATA, VendorQuestionnaireResult } from "@/app/utils/scoring";

export type VendorAssessmentRecord = VendorQuestionnaireResult & {
  id: string;
  createdAt: string;
  auditor: string;
  previousScore: number;
  scoreChange: number;
};

const listeners = new Set<() => void>();

let vendorAssessmentState: VendorAssessmentRecord[] = [];

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function subscribeVendorAssessments(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getVendorAssessmentSnapshot() {
  return vendorAssessmentState;
}

export function addVendorAssessment(assessment: VendorQuestionnaireResult) {
  const previousSubmission = vendorAssessmentState.find((record) => record.entityKey === assessment.entityKey);
  const baselineScore = calculateEntityScore(ENTITY_SCORING_DATA[assessment.entityKey]).score;
  const previousScore = previousSubmission?.score ?? baselineScore;

  const record: VendorAssessmentRecord = {
    ...assessment,
    id: `vendor-assessment-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
    auditor: "AI AUDITOR",
    previousScore,
    scoreChange: assessment.score - previousScore,
  };

  vendorAssessmentState = [record, ...vendorAssessmentState];
  emitChange();
  return record;
}

export function setVendorAssessmentSyncStatus(id: string, syncStatus: VendorAssessmentRecord["syncStatus"]) {
  let updated: VendorAssessmentRecord | null = null;

  vendorAssessmentState = vendorAssessmentState.map((record) => {
    if (record.id !== id) {
      return record;
    }

    updated = {
      ...record,
      syncStatus,
    };

    return updated;
  });

  if (updated) {
    emitChange();
  }

  return updated;
}

export function getEntityAssessmentSummary(entity: TenantKey) {
  const entries = vendorAssessmentState.filter((record) => record.entityKey === entity);
  const mfaFailures = entries.filter((record) => !record.mfaEnabled).length;
  const additionalFinancialImpact = entries.reduce((sum, record) => sum + record.potentialFinancialImpact, 0);

  return {
    entries,
    mfaFailures,
    additionalFinancialImpact,
    latest: entries[0] ?? null,
  };
}

export function useVendorAssessmentStore() {
  return useSyncExternalStore(subscribeVendorAssessments, getVendorAssessmentSnapshot, getVendorAssessmentSnapshot);
}
