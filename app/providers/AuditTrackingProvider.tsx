"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useTenantContext } from "@/app/context/TenantProvider";
import { useRiskStore } from "@/app/store/riskStore";
import { useAgentStore } from "@/app/store/agentStore";
import { appendAuditLog } from "@/app/utils/auditLogger";
import {
  resolveClickTargetDescriptor,
  type UserInteractionClickPayload,
} from "@/app/lib/auditUserInteraction";

const DEDUPE_MS = 400;

type Props = {
  children: ReactNode;
};

/** Global capture-phase click interceptor → POST /api/audit/log → Ironscribe ledger + Ironcast stream. */
export default function AuditTrackingProvider({ children }: Props) {
  const { activeTenantUuid, activeTenantKey } = useTenantContext();
  const selectedTenantName = useRiskStore((state) => state.selectedTenantName);
  const lastSentRef = useRef<{ key: string; at: number }>({ key: "", at: 0 });

  useEffect(() => {
    const captureClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const descriptor = resolveClickTargetDescriptor(target);
      if (!descriptor) {
        return;
      }

      const dedupeKey = `${descriptor.componentContext}|${descriptor.targetId ?? ""}|${descriptor.targetLabel}`;
      const now = Date.now();
      if (lastSentRef.current.key === dedupeKey && now - lastSentRef.current.at < DEDUPE_MS) {
        return;
      }
      lastSentRef.current = { key: dedupeKey, at: now };

      const payload: UserInteractionClickPayload = {
        action: "USER_INTERACTION_CLICK",
        ...descriptor,
        tenantScope: {
          uuid: activeTenantUuid,
          key: activeTenantKey,
          label: selectedTenantName,
        },
        path: window.location.pathname,
      };

      void fetch("/api/audit/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      })
        .then(async (res) => {
          if (!res.ok) {
            return;
          }
          const json = (await res.json()) as {
            ledgerEntry?: Parameters<typeof appendAuditLog>[0];
            ironcastLine?: string;
          };
          if (json.ledgerEntry) {
            appendAuditLog(json.ledgerEntry);
          }
          if (json.ironcastLine) {
            useAgentStore.getState().addStreamMessage(json.ironcastLine);
          }
        })
        .catch(() => undefined);
    };

    window.addEventListener("click", captureClick, true);
    return () => window.removeEventListener("click", captureClick, true);
  }, [activeTenantUuid, activeTenantKey, selectedTenantName]);

  return children;
}
