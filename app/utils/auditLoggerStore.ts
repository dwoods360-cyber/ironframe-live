"use client";

import { useSyncExternalStore } from "react";
import { getAuditLogSnapshot, subscribeAuditLogger } from "@/app/utils/auditLogger";

export function useAuditLoggerStore() {
  return useSyncExternalStore(subscribeAuditLogger, getAuditLogSnapshot, getAuditLogSnapshot);
}
