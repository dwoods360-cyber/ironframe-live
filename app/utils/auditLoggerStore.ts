"use client";

/**
 * useAuditLoggerStore — syncs with auditLogger (getAuditLogSnapshot, subscribeAuditLogger).
 * Naming convention (do not rename in refactors):
 * - auditLogs: array of log entries returned by the store (used in AuditIntelligence, etc.).
 * - analystNotes: notes text passed to/from drawer/panel; persisted via addWorkNoteAction + appendAuditLog(NOTE_ADDED).
 * - searchTerm/searchQuery: sidebar filter = searchQuery; drawer filter = drawerSearchQuery.
 */
import { useSyncExternalStore } from "react";
import { getAuditLogSnapshot, subscribeAuditLogger } from "@/app/utils/auditLogger";

export function useAuditLoggerStore() {
  return useSyncExternalStore(subscribeAuditLogger, getAuditLogSnapshot, getAuditLogSnapshot);
}
