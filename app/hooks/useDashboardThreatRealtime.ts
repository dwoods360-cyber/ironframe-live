"use client";

import { useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { syncThreatBoardsClient } from "@/app/utils/syncThreatBoardsClient";
import type { PipelineThreat } from "@/app/store/riskStore";
import { useAgentStore } from "@/app/store/agentStore";
import {
  IRONTECH_ESCALATION_TERMINAL_LINE,
  maybePlayIronlockForThreatRow,
  terminalLineForThreatInsert,
} from "@/app/utils/dmzIngressRealtime";
import { parseIrontechLiveFromIngestion } from "@/app/utils/irontechLiveStream";

const UPDATE_DEBOUNCE_MS = 100;

function readIngestionDetailsString(row: Record<string, unknown>): string | null {
  const a = row.ingestionDetails ?? row.ingestion_details;
  if (typeof a === "string" && a.trim()) return a;
  return null;
}

/**
 * Supabase Realtime only receives writes that land in **this** Supabase project's Postgres.
 * If `DATABASE_URL` points elsewhere, `postgres_changes` will never fire (use client refetch paths).
 *
 * Enable publication (run in Supabase SQL editor against the same DB Realtime uses):
 *
 * ```sql
 * alter publication supabase_realtime add table "ThreatEvent";
 * -- select * from pg_publication_tables where pubname = 'supabase_realtime';
 * ```
 */

function normStatus(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function extractTenantCompanyId(row: Record<string, unknown>): string | undefined {
  const v = row.tenantCompanyId ?? row.tenant_company_id;
  if (v === null || v === undefined) return undefined;
  return String(v);
}

function rowAllowedForTenant(
  row: Record<string, unknown>,
  allowedCompanyIds: Set<string>,
): boolean {
  if (allowedCompanyIds.size === 0) return true;
  const tid = extractTenantCompanyId(row);
  if (tid === undefined) return false;
  return allowedCompanyIds.has(tid);
}

function playNewThreatChime(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
    ctx.resume?.().catch(() => {});
  } catch {
    /* autoplay / unsupported */
  }
}

type Params = {
  enabled: boolean;
  /** Company PKs (`companies.id`) for the active tenant; empty = no tenant filter (receive all). */
  tenantCompanyIds: string[];
  replacePipelineThreats: (threats: PipelineThreat[]) => void;
  replaceActiveThreats: (threats: PipelineThreat[]) => void;
  onNewThreatDetected?: (title: string) => void;
  onThreatInserted?: (threatId: string) => void;
};

/**
 * Supabase Realtime on `ThreatEvent`: INSERT syncs immediately (&lt;500ms target); UPDATE debounced.
 * Rows are filtered to `tenantCompanyIds` when the set is non-empty.
 */
export function useDashboardThreatRealtime({
  enabled,
  tenantCompanyIds,
  replacePipelineThreats,
  replaceActiveThreats,
  onNewThreatDetected,
  onThreatInserted,
}: Params) {
  const replacePipeRef = useRef(replacePipelineThreats);
  const replaceActiveRef = useRef(replaceActiveThreats);
  const onNewRef = useRef(onNewThreatDetected);
  const onInsertRef = useRef(onThreatInserted);
  replacePipeRef.current = replacePipelineThreats;
  replaceActiveRef.current = replaceActiveThreats;
  onNewRef.current = onNewThreatDetected;
  onInsertRef.current = onThreatInserted;

  useEffect(() => {
    if (!enabled) return;

    const supabase = supabaseBrowser();
    const allowed = new Set(tenantCompanyIds.filter(Boolean));
    let updateTimer: ReturnType<typeof setTimeout> | undefined;

    const runSync = () =>
      void syncThreatBoardsClient(
        replacePipeRef.current,
        (incomingArray) => {
          const safeArray = useAgentStore
            .getState()
            .mergeActiveThreatsWithPersistence(incomingArray);
          replaceActiveRef.current(safeArray);
        },
      );

    const scheduleUpdateSync = () => {
      if (updateTimer) clearTimeout(updateTimer);
      updateTimer = setTimeout(() => {
        updateTimer = undefined;
        runSync();
      }, UPDATE_DEBOUNCE_MS);
    };

    const appendTerminal = (line: string) => {
      useAgentStore.getState().appendRiskIngestionTerminalLine(line);
    };

    /** `old` often omits `status` (replica identity); dedupe so we do not spam the terminal. */
    const loggedEscalationTerminalForThreatId = new Set<string>();
    const lastIrontechStreamSeqByThreatId = new Map<string, number>();

    const handleInsert = (row: Record<string, unknown>) => {
      if (!rowAllowedForTenant(row, allowed)) return;
      if (typeof row.id === "string" && row.id.trim()) {
        const id = row.id.trim();
        useAgentStore.getState().markActiveThreatConfirmed(id);
        onInsertRef.current?.(id);
      }
      runSync();
      appendTerminal(terminalLineForThreatInsert(row));
      maybePlayIronlockForThreatRow(row);
      const title = typeof row.title === "string" && row.title.trim() ? row.title.trim() : "New threat";
      onNewRef.current?.(title);
      playNewThreatChime();
    };

    const handleUpdate = (payload: {
      new: Record<string, unknown>;
      old?: Record<string, unknown>;
    }) => {
      const row = payload.new;
      if (!row || typeof row !== "object") return;
      if (!rowAllowedForTenant(row, allowed)) return;

      const newSt = normStatus(row.status);
      const oldSt = normStatus(payload.old?.status);
      const id = typeof row.id === "string" ? row.id : "";

      const ingRaw = readIngestionDetailsString(row);
      const irLive = parseIrontechLiveFromIngestion(ingRaw);
      let streamSyncRan = false;
      if (id && irLive) {
        const prevSeq = lastIrontechStreamSeqByThreatId.get(id) ?? 0;
        if (irLive.streamSeq > prevSeq) {
          lastIrontechStreamSeqByThreatId.set(id, irLive.streamSeq);
          const line = irLive.lastTerminalLine.trim();
          if (line) {
            appendTerminal(line);
            useAgentStore.getState().addStreamMessage(line);
          }
          if (updateTimer) clearTimeout(updateTimer);
          updateTimer = undefined;
          runSync();
          streamSyncRan = true;
        }
      }

      if (id && newSt !== "ESCALATED") {
        loggedEscalationTerminalForThreatId.delete(id);
      }

      if (newSt === "ESCALATED" && id) {
        if (loggedEscalationTerminalForThreatId.has(id)) {
          scheduleUpdateSync();
          return;
        }
        const oldHadStatus = oldSt !== "";
        const transitionFromOld = oldHadStatus && oldSt !== "ESCALATED";
        const firstEscalatedSeenHere = !oldHadStatus;
        if (transitionFromOld || firstEscalatedSeenHere) {
          loggedEscalationTerminalForThreatId.add(id);
          if (updateTimer) clearTimeout(updateTimer);
          updateTimer = undefined;
          runSync();
          appendTerminal(IRONTECH_ESCALATION_TERMINAL_LINE);
          return;
        }
      }

      if (!streamSyncRan) {
        scheduleUpdateSync();
      }
    };

    const channel = supabase
      .channel(`dashboard-threat-event-${tenantCompanyIds.join(",") || "all"}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ThreatEvent" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row && typeof row === "object") handleInsert(row);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ThreatEvent" },
        (payload) => {
          handleUpdate({
            new: payload.new as Record<string, unknown>,
            old: payload.old as Record<string, unknown> | undefined,
          });
        },
      )
      .subscribe((status, err) => {
        if (process.env.NODE_ENV === "development") {
          console.info("[Realtime] ThreatEvent channel:", status, err ?? "");
        }
        if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
          console.warn("[Realtime] ThreatEvent dashboard channel:", status, err ?? "");
        }
      });

    return () => {
      if (updateTimer) clearTimeout(updateTimer);
      void supabase.removeChannel(channel);
    };
  }, [enabled, tenantCompanyIds.join("|")]);
}
