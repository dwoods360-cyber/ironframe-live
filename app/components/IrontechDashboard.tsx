"use client";

import { useMemo, useState } from "react";
import { maskSensitiveData } from "@/app/utils/retentionPolicy";
import { getSystemDataSnapshot, SYSTEM_DATA_TTL_DAYS } from "@/app/utils/retentionSchedules";

type RouteCheck = {
  route: "/medshield" | "/vaultbank" | "/gridcore";
  status: "PENDING" | "OK" | "BROKEN";
  code: number | null;
};

type DiagnosticState = {
  port3000: "ONLINE" | "OFFLINE";
  middlewareLatencyMs: number | null;
  evidenceHash: string | null;
  evidenceIntegrity: "VERIFIED" | "UNVERIFIED";
  routeChecks: RouteCheck[];
};

const DIAGNOSTIC_ROUTES: Array<RouteCheck["route"]> = ["/medshield", "/vaultbank", "/gridcore"];

type IrontechDashboardProps = {
  orchestrationLogs?: string[];
  heuristicEnabled: boolean;
  onToggleHeuristic: () => void;
};

export default function IrontechDashboard({
  orchestrationLogs = [],
  heuristicEnabled,
  onToggleHeuristic,
}: IrontechDashboardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [diagnosticQuery, setDiagnosticQuery] = useState("");
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticState>({
    port3000: "OFFLINE",
    middlewareLatencyMs: null,
    evidenceHash: null,
    evidenceIntegrity: "UNVERIFIED",
    routeChecks: DIAGNOSTIC_ROUTES.map((route) => ({ route, status: "PENDING", code: null })),
  });

  const brokenCount = useMemo(
    () => diagnostic.routeChecks.filter((check) => check.status === "BROKEN").length,
    [diagnostic.routeChecks],
  );

  const pushLog = (line: string) => {
    const timestamp = new Date().toISOString();
    const sanitized = maskSensitiveData(`${timestamp} ${line}`);
    setLogs((current) => [sanitized, ...current].slice(0, 12));
  };

  const computeSha256 = async (value: string) => {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((item) => item.toString(16).padStart(2, "0"))
      .join("");
  };

  const runDiagnostic = async () => {
    setIsRunning(true);
    pushLog("RUN SYSTEM DIAGNOSTIC requested by ops.engineer@ironframe.local");

    try {
      const portOnline = window.location.port === "3000";

      const middlewareStart = performance.now();
      const middlewareResponse = await fetch("/api/health", { cache: "no-store" });
      const middlewareLatencyMs = Math.round(performance.now() - middlewareStart);

      const exportResponse = await fetch("/api/audit/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entityId: "medshield",
          dateRange: {
            from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            to: new Date().toISOString().slice(0, 10),
          },
        }),
      });

      const evidencePayload = exportResponse.ok ? await exportResponse.text() : "";
      const evidenceHash = evidencePayload ? await computeSha256(evidencePayload) : null;

      const routeChecks = await Promise.all(
        DIAGNOSTIC_ROUTES.map(async (route) => {
          try {
            const response = await fetch(route, { cache: "no-store" });
            return {
              route,
              status: response.ok ? ("OK" as const) : ("BROKEN" as const),
              code: response.status,
            };
          } catch (_error) {
            return {
              route,
              status: "BROKEN" as const,
              code: null,
            };
          }
        }),
      );

      setDiagnostic({
        port3000: portOnline ? "ONLINE" : "OFFLINE",
        middlewareLatencyMs,
        evidenceHash,
        evidenceIntegrity: evidenceHash && exportResponse.ok ? "VERIFIED" : "UNVERIFIED",
        routeChecks,
      });

      pushLog(`Middleware heartbeat ${middlewareResponse.status}; latency ${middlewareLatencyMs}ms; sample SSN 123-45-6789 masked.`);
      pushLog(`Evidence locker hash ${evidenceHash ? `${evidenceHash.slice(0, 16)}...` : "UNAVAILABLE"}.`);
      pushLog(
        routeChecks.some((check) => check.status === "BROKEN")
          ? "Route scan completed with broken links detected."
          : "Route scan completed: all entity routes responded without 404.",
      );
    } catch (error) {
      pushLog(`Diagnostic failed: ${(error as Error).message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runDiagnosticQuery = () => {
    const normalized = diagnosticQuery.trim();

    if (normalized !== "irontech.getSystemHealth()") {
      setQueryResult(null);
      pushLog(`Unsupported diagnostic query: ${normalized || "(empty)"}`);
      return;
    }

    const systemData = getSystemDataSnapshot();
    const payload = {
      command: "irontech.getSystemHealth",
      ttlDays: SYSTEM_DATA_TTL_DAYS,
      lastPurgeAt: systemData.lastSystemPurgeAt,
      remainingRecords: systemData.records.length,
      staleSystemLogs: systemData.records.filter((entry) => {
        if (entry.tag !== "system_log") {
          return false;
        }

        const ageMs = Date.now() - new Date(entry.timestamp).getTime();
        return ageMs > SYSTEM_DATA_TTL_DAYS * 24 * 60 * 60 * 1000;
      }).length,
    };

    setQueryResult(JSON.stringify(payload, null, 2));
    pushLog("irontech.getSystemHealth() executed.");
  };

  return (
    <div className="border-t border-slate-800 p-4">
      <h2 className="text-[10px] font-bold uppercase tracking-wide text-cyan-300">IRONTECH DIAGNOSTIC AGENT</h2>

      <div className="mt-3 space-y-2 rounded border border-slate-800 bg-slate-900/40 p-3 text-[10px]">
        <p className="font-bold uppercase text-slate-300">System Health Audit</p>
        <p className="text-slate-200">Port 3000: <span className={diagnostic.port3000 === "ONLINE" ? "text-emerald-300" : "text-red-300"}>{diagnostic.port3000}</span></p>
        <p className="text-slate-200">Middleware Latency: <span className="text-blue-300">{diagnostic.middlewareLatencyMs === null ? "--" : `${diagnostic.middlewareLatencyMs}ms`}</span></p>
        <p className="text-slate-200">Evidence Locker Hash Integrity: <span className={diagnostic.evidenceIntegrity === "VERIFIED" ? "text-emerald-300" : "text-amber-300"}>{diagnostic.evidenceIntegrity}</span></p>
        {diagnostic.evidenceHash && (
          <p className="font-mono text-[9px] text-slate-400">HASH: {diagnostic.evidenceHash.slice(0, 28)}...</p>
        )}
      </div>

      <button
        type="button"
        onClick={runDiagnostic}
        disabled={isRunning}
        className="mt-3 w-full rounded border border-cyan-500/70 bg-cyan-500/15 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-cyan-200 disabled:opacity-60"
      >
        {isRunning ? "RUNNING DIAGNOSTIC..." : "RUN SYSTEM DIAGNOSTIC"}
      </button>

      <div className="mt-3 rounded border border-slate-800 bg-slate-900/30 p-3 text-[10px]">
        <p className="mb-2 font-bold uppercase tracking-wide text-slate-300">Internal Diagnostic Query</p>
        <div className="flex items-center gap-2">
          <input
            value={diagnosticQuery}
            onChange={(event) => setDiagnosticQuery(event.target.value)}
            placeholder="irontech.getSystemHealth()"
            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200 outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={runDiagnosticQuery}
            className="rounded border border-cyan-500/70 bg-cyan-500/15 px-2 py-1 text-[9px] font-bold uppercase text-cyan-200"
          >
            Run Query
          </button>
        </div>
        {queryResult && (
          <pre className="mt-2 max-h-32 overflow-y-auto rounded border border-slate-800 bg-black/50 p-2 font-mono text-[9px] text-cyan-200">
            {queryResult}
          </pre>
        )}
      </div>

      <div className="mt-3 rounded border border-slate-800 bg-slate-900/30 p-3 text-[10px]">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold uppercase tracking-wide text-slate-300">HEURISTIC ANOMALY DETECTION</p>
          <button
            type="button"
            onClick={onToggleHeuristic}
            className={`rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${
              heuristicEnabled
                ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-300"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            {heuristicEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>
      </div>

      <div className="mt-3 rounded border border-slate-800 bg-slate-900/30 p-3 text-[10px]">
        <p className="mb-2 font-bold uppercase text-slate-300">Route Validation</p>
        <div className="space-y-1">
          {diagnostic.routeChecks.map((check) => (
            <p key={check.route} className="flex items-center justify-between text-slate-200">
              <span>{check.route}</span>
              <span className={check.status === "OK" ? "text-emerald-300" : check.status === "BROKEN" ? "text-red-300" : "text-slate-400"}>
                {check.status}{check.code ? ` (${check.code})` : ""}
              </span>
            </p>
          ))}
        </div>
        <p className="mt-2 text-[9px] uppercase tracking-wide text-amber-300">Broken Links: {brokenCount}</p>
      </div>

      <div className="mt-3 rounded border border-slate-800 bg-black/50 p-2">
        <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Irontech Log Stream</p>
        <div className="max-h-28 overflow-y-auto space-y-1 font-mono text-[9px] text-emerald-300">
          {[...orchestrationLogs, ...logs].length === 0 ? (
            <p className="text-slate-500">No diagnostics run yet.</p>
          ) : (
            [...orchestrationLogs, ...logs].map((line, index) => <p key={`${line}-${index}`}>{line}</p>)
          )}
        </div>
      </div>
    </div>
  );
}
