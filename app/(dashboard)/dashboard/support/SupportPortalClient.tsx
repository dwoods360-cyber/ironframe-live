"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import InTenantSupportModal from "@/app/components/support/InTenantSupportModal";
import { REQUEST_ENGINEERING_HELP_LABEL } from "@/app/components/support/RequestEngineeringHelpTrigger";
import { useTenantContext } from "@/app/context/TenantProvider";
import type { SupportPortalTicket, SupportTicketStatus } from "@/app/lib/server/supportPortalCore";

type TicketFilter = SupportTicketStatus | "ALL";

const STATUS_LABELS: Record<SupportTicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  AWAITING_APPROVAL: "Awaiting approval",
  DISPATCHED: "Dispatched",
  PURGED: "Closed",
};

const STATUS_TONE: Record<SupportTicketStatus, string> = {
  OPEN: "border-cyan-500/40 bg-cyan-950/30 text-cyan-200",
  IN_PROGRESS: "border-amber-500/40 bg-amber-950/30 text-amber-200",
  AWAITING_APPROVAL: "border-violet-500/40 bg-violet-950/30 text-violet-200",
  DISPATCHED: "border-emerald-500/40 bg-emerald-950/30 text-emerald-200",
  PURGED: "border-slate-600/40 bg-slate-900/50 text-slate-400",
};

const URGENCY_TONE: Record<string, string> = {
  ROUTINE: "text-slate-400",
  AUDIT_BLOCKER: "text-rose-300",
  DATA_INTEGRITY: "text-orange-300",
};

export default function SupportPortalClient() {
  const { tenantFetch } = useTenantContext();
  const [filter, setFilter] = useState<TicketFilter>("ALL");
  const [tickets, setTickets] = useState<SupportPortalTicket[]>([]);
  const [counts, setCounts] = useState<Partial<Record<SupportTicketStatus, number>>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (filter !== "ALL") query.set("status", filter);
      const response = await tenantFetch(`/api/support/tickets?${query.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        tickets?: SupportPortalTicket[];
        counts?: Partial<Record<SupportTicketStatus, number>>;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Failed to load support tickets.");
      setTickets(data.tickets ?? []);
      setCounts(data.counts ?? {});
      setSelectedId((current) => {
        const rows = data.tickets ?? [];
        if (current && rows.some((row) => row.id === current)) return current;
        return rows[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failure.");
      setTickets([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }, [filter, tenantFetch]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  const filters: Array<{ id: TicketFilter; label: string }> = [
    { id: "ALL", label: "All" },
    { id: "OPEN", label: "Open" },
    { id: "IN_PROGRESS", label: "In progress" },
    { id: "AWAITING_APPROVAL", label: "Awaiting approval" },
    { id: "DISPATCHED", label: "Dispatched" },
  ];

  return (
    <div className="relative flex min-h-[calc(100vh-5rem)] flex-col bg-[#020617] p-4 text-slate-100 sm:p-6">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-slate-800/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
              IronSupportTeam · ticket ingestion portal
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
              {REQUEST_ENGINEERING_HELP_LABEL}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              View all support tickets for your workspace, track intake through IronSupportTeam, and
              submit new engineering requests.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadTickets()}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-600"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowNewTicket((open) => !open)}
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
            >
              {showNewTicket ? "Hide new ticket form" : "New ticket"}
            </button>
            <Link
              href="/dashboard/admin/approvals"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-cyan-200 hover:border-cyan-600"
            >
              Approval queue
            </Link>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-4">
          {(["OPEN", "IN_PROGRESS", "AWAITING_APPROVAL", "DISPATCHED"] as SupportTicketStatus[]).map(
            (status) => (
              <div
                key={status}
                className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3"
              >
                <div className="text-[10px] uppercase tracking-widest text-slate-500">
                  {STATUS_LABELS[status]}
                </div>
                <div className="mt-1 text-2xl font-bold text-white">{counts[status] ?? 0}</div>
              </div>
            ),
          )}
        </div>

        {showNewTicket ? (
          <section className="rounded-xl border border-cyan-800/40 bg-slate-900/50 p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-white">Submit new ticket</h2>
            <p className="mt-1 text-sm text-slate-400">
              Intake routes to IronSupportTeam for draft review before any outbound dispatch.
            </p>
            <div className="mt-4 max-w-xl">
              <InTenantSupportModal
                onSubmitted={() => {
                  setShowNewTicket(false);
                  void loadTickets();
                }}
              />
            </div>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                filter === item.id
                  ? "bg-cyan-900/50 text-cyan-100 ring-1 ring-cyan-700"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-900/50 bg-rose-950/30 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="border-b border-slate-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">All tickets</h2>
            </div>
            {loading ? (
              <p className="p-6 text-sm text-slate-400">Loading tickets…</p>
            ) : tickets.length === 0 ? (
              <div className="p-6 text-sm text-slate-400">
                No support tickets yet.{" "}
                <button
                  type="button"
                  onClick={() => setShowNewTicket(true)}
                  className="text-cyan-300 hover:underline"
                >
                  Submit your first ticket
                </button>
                .
              </div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(ticket.id)}
                      className={`flex w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-slate-950/50 ${
                        selectedId === ticket.id ? "bg-slate-950/70" : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-100">{ticket.subject}</span>
                        <span
                          className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_TONE[ticket.status]}`}
                        >
                          {STATUS_LABELS[ticket.status]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className={URGENCY_TONE[ticket.urgency] ?? "text-slate-400"}>
                          {ticket.urgency.replace("_", " ")}
                        </span>
                        <span>{ticket.objectiveLabel}</span>
                        <span>{new Date(ticket.occurredAt).toLocaleString()}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-white">Ticket detail</h2>
            {!selectedTicket ? (
              <p className="mt-4 text-sm text-slate-500">Select a ticket to view details.</p>
            ) : (
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">Subject</div>
                  <div className="mt-1 font-medium text-slate-100">{selectedTicket.subject}</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">Status</div>
                    <div className="mt-1">{STATUS_LABELS[selectedTicket.status]}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">Urgency</div>
                    <div className="mt-1">{selectedTicket.urgency.replace("_", " ")}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">Requester</div>
                    <div className="mt-1">
                      {selectedTicket.contactName}
                      <div className="text-xs text-slate-500">{selectedTicket.contactEmail}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">Opened</div>
                    <div className="mt-1">{new Date(selectedTicket.occurredAt).toLocaleString()}</div>
                  </div>
                </div>
                {selectedTicket.path ? (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">Route</div>
                    <div className="mt-1 font-mono text-xs text-cyan-300">{selectedTicket.path}</div>
                  </div>
                ) : null}
                {selectedTicket.userNotes ? (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">
                      Operator notes
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-slate-300">{selectedTicket.userNotes}</p>
                  </div>
                ) : null}
                {selectedTicket.proposedReply ? (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">
                      Proposed reply
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-slate-300">
                      {selectedTicket.proposedReply}
                    </p>
                  </div>
                ) : null}
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">Ticket ID</div>
                  <div className="mt-1 font-mono text-xs text-slate-500">{selectedTicket.id}</div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
