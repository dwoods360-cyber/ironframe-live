"use client";

import { appendAuditLog } from "@/app/utils/auditLogger";
import { uuidToForensicTenantAuditLabel } from "@/app/utils/forensicTenantAuditLabel";

export type IsolationSentinelDetail = {
  reasonCode:
    | "NO_TENANT_CONTEXT"
    | "HEADER_CONFLICT"
    | "REQUESTED_TENANT_NO_EFFECTIVE"
    | "TENANT_MISMATCH"
    | "DEMO_MODE_ISOLATED";
  path: string;
  method: string;
  effectiveTenantUuid?: string | null;
  requestedTenantUuid?: string | null;
};

function buildEvidenceMessage(d: IsolationSentinelDetail): string {
  const req = uuidToForensicTenantAuditLabel(d.requestedTenantUuid);
  const eff = uuidToForensicTenantAuditLabel(d.effectiveTenantUuid);
  switch (d.reasonCode) {
    case "TENANT_MISMATCH":
      return `BLOCKED: UNAUTHORIZED FETCH TO TENANT_ID: ${req}. SESSION_TENANT: ${eff}. ${d.method} ${d.path}`;
    case "HEADER_CONFLICT":
      return `BLOCKED: HEADER_CONFLICT x-tenant-id vs x-target-tenant-id — ${d.method} ${d.path}`;
    case "REQUESTED_TENANT_NO_EFFECTIVE":
      return `BLOCKED: IRONGUARD SESSION ABSENT — REQUESTED_TENANT_ID: ${req}. ${d.method} ${d.path}`;
    case "NO_TENANT_CONTEXT":
      return `BLOCKED: NO_IRONGUARD_TENANT_CONTEXT — ${d.method} ${d.path}`;
    case "DEMO_MODE_ISOLATED":
      return `BLOCKED: DEMO_SANDBOX_ISOLATED — ${d.method} ${d.path}`;
    default:
      return `BLOCKED: ${d.reasonCode} — ${d.method} ${d.path}`;
  }
}

/** Permanent Audit Intelligence row when Ironguard blocks an out-of-scope client fetch (evidence-grade). */
export function logIsolationSentinelBlocked(detail: IsolationSentinelDetail): void {
  if (typeof window === "undefined") return;
  const msg = buildEvidenceMessage(detail);
  Promise.resolve().then(() => {
    appendAuditLog({
      action_type: "SYSTEM_WARNING",
      log_type: "GRC",
      user_id: "Ironguard-Sentinel",
      forensic: {
        sourceName: "IRONGUARD",
        eventLevel: "red_team",
        statusIcon: "🚨",
        message: `[ 🚨 SECURITY ALERT ] ${msg}`,
      },
      metadata_tag: `IRONGUARD|SENTINEL_BLOCK|${detail.reasonCode}|path:${detail.path}`,
    });
  });
}
