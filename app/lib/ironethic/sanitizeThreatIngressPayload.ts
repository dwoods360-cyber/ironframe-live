import type { Prisma } from "@prisma/client";
import {
  sanitizeIngressJsonString,
  sanitizeIngressPayload,
} from "@/app/lib/ironethic/ingressSanitizer";

/** Epic 14 — scrub PII fields on ThreatEvent / RiskEvent ingress writes. */
export function sanitizeThreatIngressPayload(
  payload: Prisma.ThreatEventUncheckedCreateInput,
): Prisma.ThreatEventUncheckedCreateInput {
  const base = sanitizeIngressPayload(payload) as Prisma.ThreatEventUncheckedCreateInput;
  const ingestionDetails =
    typeof base.ingestionDetails === "string"
      ? sanitizeIngressJsonString(base.ingestionDetails)
      : base.ingestionDetails;
  const aiReport =
    typeof base.aiReport === "string" ? sanitizeIngressJsonString(base.aiReport) ?? base.aiReport : base.aiReport;
  return {
    ...base,
    ...(ingestionDetails !== undefined ? { ingestionDetails } : {}),
    ...(aiReport !== undefined ? { aiReport } : {}),
  };
}

export function sanitizeThreatIngressUpdate(
  data: Prisma.ThreatEventUncheckedUpdateInput,
): Prisma.ThreatEventUncheckedUpdateInput {
  const base = sanitizeIngressPayload(data) as Prisma.ThreatEventUncheckedUpdateInput;
  const ingestionDetails =
    typeof base.ingestionDetails === "string"
      ? sanitizeIngressJsonString(base.ingestionDetails)
      : base.ingestionDetails;
  const aiReport =
    typeof base.aiReport === "string" ? sanitizeIngressJsonString(base.aiReport) ?? base.aiReport : base.aiReport;
  return {
    ...base,
    ...(ingestionDetails !== undefined ? { ingestionDetails } : {}),
    ...(aiReport !== undefined ? { aiReport } : {}),
  };
}
