"use client";

import { useEffect, useState } from "react";

import { getSessionBillingGateSnapshot } from "@/app/actions/billing/getSessionBillingGateSnapshot";
import { useTenantContext } from "@/app/context/TenantProvider";
import { usePlatformAdminToolsAccess } from "@/app/hooks/usePlatformAdminToolsAccess";
import {
  PILOT_STUB_EXPORT_BLOCKED_MESSAGE,
  PILOT_STUB_WORKFLOW_BLOCKED_MESSAGE,
  shouldSuppressPilotStubExport,
} from "@/app/lib/pilotStubExportGate";

export function usePilotStubExportGate() {
  const { activeTenantUuid } = useTenantContext();
  const { canUsePlatformAdminTools } = usePlatformAdminToolsAccess();
  const [billingBlocked, setBillingBlocked] = useState(false);
  const [billingStatus, setBillingStatus] = useState("UNTRACKED");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getSessionBillingGateSnapshot()
      .then((snapshot) => {
        if (cancelled) return;
        setBillingBlocked(snapshot.billingBlocked);
        setBillingStatus(snapshot.billingStatus);
        setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTenantUuid]);

  const suppressed = shouldSuppressPilotStubExport({
    activeTenantUuid,
    billingBlocked,
    platformAdminBypass: canUsePlatformAdminTools,
  });

  return {
    suppressed,
    billingBlocked,
    billingStatus,
    hydrated,
    blockedMessage: PILOT_STUB_EXPORT_BLOCKED_MESSAGE,
    workflowBlockedMessage: PILOT_STUB_WORKFLOW_BLOCKED_MESSAGE,
  };
}
