"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import AuditLedger from "@/app/components/AuditLedger";
import BotAuditAnalysisModal from "@/app/components/BotAuditAnalysisModal";
import { ExecutiveSummaryAudit } from "@/app/components/ExecutiveSummary";
import {
  getRecentBotAuditLogs,
  voidReceiptAndReopen,
  type BotAuditLogRow,
} from "@/app/actions/auditActions";
import { useRiskStore } from "@/app/store/riskStore";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@tremor/react";
import type { OpSupportWorkspaceTab } from "@/app/lib/opsupportDashTypes";
import { OpSupportTabStrip } from "./OpSupportTabStrip";
import OpSupportClient from "./OpSupportClient";

export default function OpSupportWorkspace() {
  const [hasMounted, setHasMounted] = useState(false);
  const [mainTab, setMainTab] = useState<OpSupportWorkspaceTab>("ingestion");
  const pulseThreatBoardsFromDb = useRiskStore((s) => s.pulseThreatBoardsFromDb);

  const [botAuditRows, setBotAuditRows] = useState<BotAuditLogRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [isVoidingReceiptId, setIsVoidingReceiptId] = useState<string | null>(null);
  const [analysisRow, setAnalysisRow] = useState<BotAuditLogRow | null>(null);
  const [isAuditRefreshPending, startAuditRefreshTransition] = useTransition();
  const [forensicStatus, setForensicStatus] = useState<string | null>(null);
  const [forensicTabIndex, setForensicTabIndex] = useState(0);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const rows = await getRecentBotAuditLogs(20);
      startAuditRefreshTransition(() => {
        setBotAuditRows(rows);
      });
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : "Failed to load test history.");
    } finally {
      setAuditLoading(false);
    }
  }, [startAuditRefreshTransition]);

  useEffect(() => {
    let cancelled = false;
    void loadAudit();
    const handleAuditCreated = () => {
      if (cancelled) return;
      void loadAudit();
    };
    window.addEventListener("ironframe:bot-audit-log-created", handleAuditCreated as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener("ironframe:bot-audit-log-created", handleAuditCreated as EventListener);
    };
  }, [loadAudit]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleVoidAndReopen = useCallback(
    async (row: BotAuditLogRow) => {
      const metadata =
        row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : null;
      const threatId = typeof metadata?.threatId === "string" ? metadata.threatId.trim() : "";
      if (!threatId) {
        setForensicStatus("Cannot void receipt: missing threatId in receipt metadata.");
        return;
      }
      const reasonInput = window.prompt(
        `Administrative Void for receipt ${row.id}\nProvide a mandatory void reason:`,
        "",
      );
      if (reasonInput == null) return;
      const reason = reasonInput.trim();
      if (reason.length < 10) {
        setForensicStatus("Void reason must be at least 10 characters.");
        return;
      }
      const confirmed = window.confirm(
        "VOID & REOPEN will keep historical records, mark this receipt voided, and return the threat to ACTIVE. Continue?",
      );
      if (!confirmed) return;

      const operator =
        typeof window !== "undefined"
          ? localStorage.getItem("operatorId") ?? localStorage.getItem("user:id") ?? "admin-user-01"
          : "admin-user-01";
      setIsVoidingReceiptId(row.id);
      try {
        const result = await voidReceiptAndReopen(row.id, threatId, reason, operator);
        if (!result.ok) {
          setForensicStatus(`Void failed: ${result.error}`);
          return;
        }
        setForensicStatus(`Receipt voided and threat ${threatId} reopened to ACTIVE.`);
        if (analysisRow?.id === row.id) {
          setAnalysisRow(null);
        }
        await pulseThreatBoardsFromDb();
        await loadAudit();
      } finally {
        setIsVoidingReceiptId(null);
      }
    },
    [analysisRow?.id, loadAudit, pulseThreatBoardsFromDb],
  );

  if (!hasMounted) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-[#000000] text-zinc-400">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-zinc-500">Hydrating…</p>
          <p className="max-w-sm text-center font-mono text-[10px] leading-relaxed text-zinc-600">
            Operational support workspace
          </p>
        </div>
      </div>
    );
  }

  const forensicDeck = (
    <>
      {forensicStatus ? (
        <p className="mb-3 font-mono text-[10px] text-amber-200/90">{forensicStatus}</p>
      ) : null}
      <section className="rounded-md border border-zinc-800/90 bg-[#08080c]/50 p-3 ring-1 ring-white/[0.04]">
        <div className="mb-3 border-b border-zinc-800/80 pb-2">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-zinc-400">
            Forensic analysis // Bot audit ledger
          </p>
        </div>
        <TabGroup index={forensicTabIndex} onIndexChange={setForensicTabIndex}>
          <TabList variant="line" className="border-zinc-800">
            <Tab>Executive Briefing</Tab>
            <Tab>Operational Telemetry</Tab>
          </TabList>
          <TabPanels className="mt-3">
            <TabPanel>
              <ExecutiveSummaryAudit logs={botAuditRows} />
            </TabPanel>
            <TabPanel>
              <AuditLedger
                logs={botAuditRows}
                loading={auditLoading}
                error={auditError}
                isRefreshing={isAuditRefreshPending}
                isVoidingReceiptId={isVoidingReceiptId}
                onRefresh={() => {
                  void loadAudit();
                }}
                onViewAnalysis={(row) => {
                  setAnalysisRow(row);
                }}
                onVoidAndReopen={(row) => {
                  void handleVoidAndReopen(row);
                }}
              />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </section>
    </>
  );

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[#000000] text-zinc-200">
      <OpSupportTabStrip value={mainTab} onChange={setMainTab} />

      <div className="min-h-0 w-full flex-1 overflow-y-auto">
        <div className="w-full min-h-0 flex-1 border-y border-amber-900/35 bg-black shadow-[inset_0_0_120px_rgba(0,0,0,0.85)]">
          <OpSupportClient mainTab={mainTab} />
        </div>

        <div className="border-t border-zinc-800/90 bg-[#050509] px-3 py-4 sm:px-5">{forensicDeck}</div>
      </div>

      {analysisRow ? (
        <BotAuditAnalysisModal analysisRow={analysisRow} onClose={() => setAnalysisRow(null)} />
      ) : null}
    </div>
  );
}
