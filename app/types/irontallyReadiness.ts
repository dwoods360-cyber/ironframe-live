import type {
  FrameworkReadinessSummary,
  VerifiedEvidenceLog,
} from "@/src/services/compliance/irontallyEngine";

export type { FrameworkReadinessSummary, VerifiedEvidenceLog };

export type FrameworkReadinessLabel = FrameworkReadinessSummary["framework"];

export type IrontallyReadinessApiResponse = {
  ok: boolean;
  readiness?: FrameworkReadinessSummary[];
  error?: string;
};
