"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { fetchOpsPortalJson } from "@/app/utils/fetchOpsPortalJson";

type RedactedSalesTeamSnapshot = {
  generatedAt: string;
  crmScope: string;
  worker: { reachable: boolean; status: string | null };
  inboundLeads: Array<{
    id: string;
    orgName: string;
    slug: string;
    email: string;
    reportedAleCents: string;
    createdAt: string;
    opsStatus: string | null;
    priority: number;
    sourceRef: string;
  }>;
  prospects: Array<{
    dealId: string;
    contactId: string;
    stage: string;
    dealTitle: string;
    valueCents: string;
    company: string;
    fullName: string;
    email: string;
    phone: string | null;
    industrySector: string | null;
    detectedTrigger: string | null;
    priorityScore: number;
    updatedAt: string;
  }>;
  polledAt: string;
};

function formatAleCents(cents: string): string {
  try {
    const n = BigInt(cents);
    if (n <= 0n) return "—";
    return `$${(Number(n) / 100).toLocaleString("en-US")}`;
  } catch {
    return "—";
  }
}

export default function SalesteamPortalClient() {
  const [snapshot, setSnapshot] = useState<RedactedSalesTeamSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollBusy, setPollBusy] = useState(false);
  const [requeueBusy, setRequeueBusy] = useState(false);
  const [inboundBusySlug, setInboundBusySlug] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<RedactedSalesTeamSnapshot>(
        "/api/admin/operations-hub/salesteam",
        { cache: "no-store" },
        "Failed to load SalesTeam portal.",
      );
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failure.");
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const runPoll = async () => {
    if (pollBusy || requeueBusy || inboundBusySlug) return;
    setPollBusy(true);
    setMessage(null);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        snapshot?: RedactedSalesTeamSnapshot;
      }>(
        "/api/admin/operations-hub/salesteam",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "poll" }),
        },
        "Poll failed.",
      );
      if (data.snapshot) setSnapshot(data.snapshot);
      setMessage("Poll cycle completed. Review PROSPECT queue and SALES approval queue.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Poll failed.");
    } finally {
      setPollBusy(false);
    }
  };

  const runRequeueDrafts = async (opts?: {
    companyIncludes?: string;
    force?: boolean;
  }) => {
    if (pollBusy || requeueBusy || inboundBusySlug) return;
    setRequeueBusy(true);
    setMessage(null);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        requeue?: {
          prospectsSeen: number;
          queued: Array<{ company: string; channel: string; refreshed?: boolean }>;
          skipped: Array<{ company: string; reason: string }>;
          errors: Array<{ company: string; message: string }>;
        };
        snapshot?: RedactedSalesTeamSnapshot;
      }>(
        "/api/admin/operations-hub/salesteam",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "requeue-drafts",
            companyIncludes: opts?.companyIncludes,
            force: opts?.force === true,
          }),
        },
        "Re-queue failed.",
      );
      if (data.snapshot) setSnapshot(data.snapshot);
      const q = data.requeue;
      if (!q) {
        setMessage("Re-queue completed.");
        return;
      }
      const queuedLabel = q.queued.map((r) => `${r.company} (${r.channel})`).join(", ") || "none";
      const skipLabel =
        q.skipped.length > 0
          ? ` Skipped: ${q.skipped.map((s) => `${s.company} — ${s.reason}`).join("; ")}.`
          : "";
      const errLabel =
        q.errors.length > 0
          ? ` Errors: ${q.errors.map((e) => `${e.company} — ${e.message}`).join("; ")}.`
          : "";
      if (q.queued.length === 0) {
        setError(
          `No new drafts queued (saw ${q.prospectsSeen} PROSPECTS).${skipLabel}${errLabel} Open Sales outreach queue only after a draft is queued.`,
        );
      } else {
        const refreshed = q.queued.some((r) => r.refreshed);
        setMessage(
          `${refreshed ? "Refreshed" : "Queued"} ${q.queued.length} PENDING draft(s): ${queuedLabel}.${skipLabel}${errLabel} Open Sales outreach queue for C1.`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-queue failed.");
    } finally {
      setRequeueBusy(false);
    }
  };

  const queueInboundDraft = async (slug: string) => {
    if (pollBusy || requeueBusy || inboundBusySlug) return;
    setInboundBusySlug(slug);
    setMessage(null);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        queued?: {
          interactionId: string;
          created: boolean;
          company: string;
          email: string;
        };
        snapshot?: RedactedSalesTeamSnapshot;
      }>(
        "/api/admin/operations-hub/salesteam",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "queue-inbound-draft", slug }),
        },
        "Queue inbound draft failed.",
      );
      if (data.snapshot) setSnapshot(data.snapshot);
      const q = data.queued;
      if (!q) {
        setError("Queue succeeded but no draft payload returned.");
        return;
      }
      setMessage(
        q.created
          ? `P1 inbound draft queued for ${q.company} (${q.email}). Open Sales outreach queue — HITL DISPATCH only.`
          : `Pending draft already exists for ${q.company}. Open Sales outreach queue.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Queue inbound draft failed.");
    } finally {
      setInboundBusySlug(null);
    }
  };

  const inboundOpenCount =
    snapshot?.inboundLeads.filter((lead) => lead.opsStatus !== "DONE" && lead.opsStatus !== "CANCELLED")
      .length ?? 0;

  return (
    <div className="min-h-screen bg-[#020617] p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-rose-400">
              SalesTeam · P1 inbound first
            </p>
            <h1 className="text-2xl font-bold text-white">Sales interaction portal</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Public /register/contact hand-raisers are P1. Cold PROSPECT deals are secondary. Queue a
              reply draft into Approvals — never auto-send.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/operations"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-600"
            >
              ← Operations hub
            </Link>
            <Link
              href="/dashboard/operations/workflow-review"
              className="rounded-lg border border-cyan-700 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-950/40"
            >
              Workflow review call assist
            </Link>
            <Link
              href="/dashboard/admin/approvals?kind=SALES"
              className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-2 text-sm text-amber-200 hover:border-amber-600"
            >
              Sales outreach queue
            </Link>
            <Link
              href="/dashboard/operations/library/icp-shortlist#icp-touch-log"
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-cyan-600"
              title="C3 — log DISPATCH touch (controlled TOUCH1–3 panel)"
            >
              C3 · ICP touch log
            </Link>
            <Link
              href="/dashboard/operations/workflow-review#talk-track"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-teal-800/50 bg-teal-950/30 px-4 py-2 text-sm font-medium text-teal-100 hover:border-teal-500"
            >
              Workflow review talk track
            </Link>
            <button
              type="button"
              onClick={() => void loadSnapshot()}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-600"
            >
              Refresh
            </button>
            <button
              type="button"
              disabled={pollBusy || requeueBusy || Boolean(inboundBusySlug)}
              onClick={() => void runPoll()}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {pollBusy ? "Polling…" : "Run poll cycle"}
            </button>
            <button
              type="button"
              disabled={pollBusy || requeueBusy || Boolean(inboundBusySlug)}
              onClick={() => void runRequeueDrafts()}
              className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-4 py-2 text-sm font-medium text-emerald-100 hover:border-emerald-500 disabled:opacity-50"
              title="Create PENDING Approvals drafts for prospect-pool PROSPECTs (bypasses worker processedDeal after dry-run)"
            >
              {requeueBusy ? "Re-queuing…" : "Re-queue Approvals drafts"}
            </button>
            <button
              type="button"
              disabled={pollBusy || requeueBusy || Boolean(inboundBusySlug)}
              onClick={() =>
                void runRequeueDrafts({ companyIncludes: "BlueRadius", force: true })
              }
              className="rounded-lg border border-cyan-700 bg-cyan-950/40 px-4 py-2 text-sm font-medium text-cyan-100 hover:border-cyan-500 disabled:opacity-50"
              title="Overwrite BlueRadius PENDING draft with C1-locked copy (Option A opener, no Path B, Dereck sign-off)"
            >
              {requeueBusy ? "Refreshing…" : "Refresh BlueRadius C1 copy"}
            </button>
            <button
              type="button"
              disabled={pollBusy || requeueBusy || Boolean(inboundBusySlug)}
              onClick={() =>
                void runRequeueDrafts({ companyIncludes: "Pivot Point", force: true })
              }
              className="rounded-lg border border-violet-700 bg-violet-950/40 px-4 py-2 text-sm font-medium text-violet-100 hover:border-violet-500 disabled:opacity-50"
              title="Overwrite Pivot Point PENDING draft as SMS (ironleads.local → SMS channel)"
            >
              {requeueBusy ? "Refreshing…" : "Refresh Pivot Point SMS"}
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-xl border border-rose-900/50 bg-rose-950/30 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-4 text-sm text-emerald-200">
            {message}
          </div>
        ) : null}

        {loading && !snapshot ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
            Loading SalesTeam portal…
          </div>
        ) : null}

        {snapshot ? (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold text-white">Worker status</h2>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <p>
                  <span className="text-slate-500">Reachable:</span>{" "}
                  <span className={snapshot.worker.reachable ? "text-emerald-400" : "text-rose-400"}>
                    {snapshot.worker.reachable ? "Online" : "Offline"}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">CRM scope:</span>{" "}
                  <span className="font-mono text-cyan-300">{snapshot.crmScope}</span>
                </p>
                <p>
                  <span className="text-slate-500">Open P1 inbound:</span>{" "}
                  <span className={inboundOpenCount > 0 ? "font-semibold text-rose-300" : "text-slate-300"}>
                    {inboundOpenCount}
                  </span>
                </p>
              </div>
            </section>

            <section
              id="inbound-leads"
              className="scroll-mt-24 rounded-xl border border-rose-900/50 bg-rose-950/20 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-rose-400">
                    P1 · Public inbound
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    Workflow review requests
                  </h2>
                  <p className="mt-1 text-sm text-slate-300">
                    From /register/contact. Highest priority over cold outreach. Queue a scheduling
                    reply into Approvals — you still HITL DISPATCH.
                  </p>
                </div>
                <Link
                  href="/dashboard/admin/approvals?kind=SALES"
                  className="rounded-lg border border-rose-700/70 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-950/50"
                >
                  Sales Approvals →
                </Link>
              </div>
              <ul className="mt-4 space-y-3">
                {(snapshot.inboundLeads ?? []).length === 0 ? (
                  <li className="text-sm text-slate-500">No public inbound leads recorded yet.</li>
                ) : (
                  (snapshot.inboundLeads ?? []).map((lead) => {
                    const closed = lead.opsStatus === "DONE" || lead.opsStatus === "CANCELLED";
                    return (
                      <li
                        key={lead.id}
                        className="rounded-lg border border-rose-900/40 bg-slate-950/50 p-4 text-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">
                              {lead.orgName}{" "}
                              <span className="ml-2 rounded border border-rose-700/60 px-1.5 py-0.5 font-mono text-[10px] uppercase text-rose-200">
                                P{lead.priority || 1}
                              </span>
                            </p>
                            <p className="mt-1 text-slate-300">{lead.email}</p>
                            <p className="mt-1 font-mono text-[11px] text-slate-500">
                              {new Date(lead.createdAt).toLocaleString()} · ALE{" "}
                              {formatAleCents(lead.reportedAleCents)} · {lead.slug}
                              {lead.opsStatus ? ` · ${lead.opsStatus}` : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={closed || Boolean(inboundBusySlug)}
                            onClick={() => void queueInboundDraft(lead.slug)}
                            className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-40"
                          >
                            {inboundBusySlug === lead.slug
                              ? "Queuing…"
                              : closed
                                ? "Closed"
                                : "Queue Approvals draft"}
                          </button>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold text-white">PROSPECT queue (secondary)</h2>
              <p className="mt-1 text-sm text-slate-400">
                Polled {new Date(snapshot.polledAt).toLocaleString()}
              </p>
              <ul className="mt-4 space-y-3">
                {snapshot.prospects.length === 0 ? (
                  <li className="text-sm text-slate-500">No PROSPECT deals in configured CRM scope.</li>
                ) : (
                  snapshot.prospects.map((prospect) => (
                    <li
                      key={prospect.dealId}
                      className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm"
                    >
                      <div className="font-medium text-slate-100">{prospect.company}</div>
                      <div className="text-xs text-slate-500">{prospect.dealTitle}</div>
                      <div className="mt-1 font-mono text-xs text-slate-400">
                        {prospect.fullName} · priority {prospect.priorityScore}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
