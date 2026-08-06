"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { OperationsHubSnapshot, WorkforceServiceStatus } from "@/app/lib/server/operationsHubCore";
import { fetchOpsPortalJson } from "@/app/utils/fetchOpsPortalJson";

/** Client-only — speech / MediaRecorder must not crash SSR or take down the Ops shell. */
const OpsWorkerChatPanel = dynamic(
  () => import("@/app/components/operations/OpsWorkerChatPanel"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs text-slate-500">
        Loading workforce chat…
      </div>
    ),
  },
);

type HubTab =
  | "overview"
  | "calendar"
  | "workforce"
  | "crm"
  | "teams";

const HUB_TAB_IDS: HubTab[] = [
  "overview",
  "calendar",
  "workforce",
  "crm",
  "teams",
];

function parseHubTab(raw: string | null): HubTab {
  // Alias for older bookmarks / links.
  if (raw === "schedule") return "calendar";
  if (raw && HUB_TAB_IDS.includes(raw as HubTab)) return raw as HubTab;
  return "overview";
}

function operationsTabHref(tab: HubTab): string {
  return tab === "overview" ? "/dashboard/operations" : `/dashboard/operations?tab=${tab}`;
}

/** Human-readable calendar due date (UTC date portion of ISO). */
function formatOpsCalendarDate(iso: string): string {
  const day = iso.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return day || iso;
  const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function opsCalendarDueTone(args: {
  isClosed: boolean;
  daysUntilDue: number;
}): { badge: string; urgency: string } {
  if (args.isClosed) {
    return {
      badge: "border-slate-600 bg-slate-800/80 text-slate-100",
      urgency: "text-slate-400",
    };
  }
  if (args.daysUntilDue < 0) {
    return {
      badge: "border-rose-500 bg-rose-950/70 text-rose-50 ring-1 ring-rose-500/40",
      urgency: "font-semibold text-rose-300",
    };
  }
  if (args.daysUntilDue === 0) {
    return {
      badge: "border-amber-400 bg-amber-950/70 text-amber-50 ring-1 ring-amber-400/50",
      urgency: "font-semibold text-amber-200",
    };
  }
  if (args.daysUntilDue <= 3) {
    return {
      badge: "border-amber-600 bg-amber-950/50 text-amber-100 ring-1 ring-amber-700/40",
      urgency: "font-medium text-amber-200/90",
    };
  }
  return {
    badge: "border-cyan-500/70 bg-cyan-950/50 text-cyan-50 ring-1 ring-cyan-500/30",
    urgency: "text-cyan-200/90",
  };
}

const STAGE_LABELS: Record<string, string> = {
  SUSPECT: "Suspect",
  PROSPECT: "Prospect",
  QUALIFIED: "Qualified",
  DISCOVERY: "Discovery",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-emerald-400" : "bg-rose-500"}`}
      aria-hidden
    />
  );
}

function WorkforceFleetList({ workforce }: { workforce: WorkforceServiceStatus[] }) {
  return (
    <ul className="space-y-3 text-sm">
      {workforce.map((service) => (
        <li key={service.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-medium text-slate-100">
              <StatusDot ok={service.reachable} />
              {service.label}
            </span>
            <span
              className={`text-xs font-semibold ${service.reachable ? "text-emerald-400" : "text-rose-400"}`}
            >
              :{service.port} {service.reachable ? "● up" : "○ down"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{service.role}</p>
          {service.portalUrl ? (
            <Link href={service.portalUrl} className="mt-2 inline-block text-xs text-cyan-300 hover:underline">
              Open portal →
            </Link>
          ) : null}
        </li>
      ))}
      <li className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-slate-100">Ironframe Control Plane</span>
          <span className="text-xs font-semibold text-cyan-400">:3000 ingress host</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Signed /api/v1/ingress/* routes · approvals desk · tenant support intake API (not perimeter workers)
        </p>
      </li>
    </ul>
  );
}

function WorkforceCard({ service }: { service: WorkforceServiceStatus }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-cyan-300">
            <StatusDot ok={service.reachable} />
            {service.label}
          </div>
          <p className="mt-1 text-sm text-slate-400">{service.role}</p>
        </div>
        <div className="text-right font-mono text-[10px] text-slate-500">
          <div>:{service.port}</div>
          {service.latencyMs != null ? <div>{service.latencyMs}ms</div> : <div>offline</div>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {service.portalUrl ? (
          <Link
            href={service.portalUrl}
            className="rounded border border-cyan-700/60 px-2 py-1 text-xs text-cyan-200 hover:border-cyan-500"
          >
            Open portal
          </Link>
        ) : null}
      </div>
      <p className="mt-2 font-mono text-[10px] text-slate-500">
        {service.reachable ? service.status ?? "HEALTHY" : "Unreachable — start local worker"}
      </p>
    </div>
  );
}

export default function OperationsHubClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<HubTab>(() => parseHubTab(searchParams.get("tab")));
  const [snapshot, setSnapshot] = useState<OperationsHubSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [calendarSearch, setCalendarSearch] = useState("");
  /** YYYY-MM-DD inclusive bounds on activity dueAt (falls back to completedAt). */
  const [calendarDueFrom, setCalendarDueFrom] = useState("");
  const [calendarDueTo, setCalendarDueTo] = useState("");
  /** Per-card close-out notes — required before Done / Cancel (replaces window.prompt). */
  const [outcomeDrafts, setOutcomeDrafts] = useState<Record<string, string>>({});
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab === "briefings" || requestedTab === "newsletters") {
      const draft = searchParams.get("draft")?.trim();
      const query = new URLSearchParams({ desk: requestedTab });
      if (draft) query.set("draft", draft);
      router.replace(`/dashboard/operations/publishing?${query}`, { scroll: false });
      return;
    }
    setTab(parseHubTab(requestedTab));
  }, [router, searchParams]);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOpsPortalJson<OperationsHubSnapshot>(
        "/api/admin/operations-hub",
        { cache: "no-store" },
        "Failed to load operations hub.",
      );
      setSnapshot(data);
      setRefreshedAt(new Date().toLocaleTimeString());
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

  const approvalBadges = useMemo(() => {
    if (!snapshot) return [];
    return [
      { label: "Support", count: snapshot.approvals.byKind.SUPPORT, tone: "text-emerald-300" },
      { label: "Sales", count: snapshot.approvals.byKind.SALES, tone: "text-amber-300" },
      { label: "Customer Success", count: snapshot.approvals.byKind.CUSTOMER_SUCCESS, tone: "text-violet-300" },
    ];
  }, [snapshot]);

  const seedSummerSchedule = async () => {
    setScheduleBusy(true);
    setScheduleMessage(null);
    try {
      const response = await fetch("/api/admin/operations-hub/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed-all-projects" }),
        cache: "no-store",
      });
      const data = (await response.json()) as { ok?: boolean; message?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Seed failed.");
      setScheduleMessage(data.message || "Summer schedule seeded.");
      await loadSnapshot();
    } catch (err) {
      setScheduleMessage(err instanceof Error ? err.message : "Seed failed.");
    } finally {
      setScheduleBusy(false);
    }
  };

  const setChecklistItem = async (id: string, index: number, done: boolean) => {
    setScheduleBusy(true);
    setScheduleMessage(null);
    try {
      const response = await fetch("/api/admin/operations-hub/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-checklist-item", id, index, done }),
        cache: "no-store",
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error || "Checklist update failed.");
      await loadSnapshot();
    } catch (err) {
      setScheduleMessage(err instanceof Error ? err.message : "Checklist update failed.");
    } finally {
      setScheduleBusy(false);
    }
  };

  const setScheduleStatus = async (id: string, status: string) => {
    let outcome: string | undefined;
    if (status === "DONE" || status === "CANCELLED") {
      outcome = (outcomeDrafts[id] ?? "").trim();
      if (!outcome) {
        setScheduleMessage(
          status === "DONE"
            ? "Add close-out notes on the card before marking Done."
            : "Add a short reason on the card before cancelling.",
        );
        return;
      }
    }
    setScheduleBusy(true);
    setScheduleMessage(null);
    try {
      const response = await fetch("/api/admin/operations-hub/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-status", id, status, outcome }),
        cache: "no-store",
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error || "Status update failed.");
      setOutcomeDrafts((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await loadSnapshot();
    } catch (err) {
      setScheduleMessage(err instanceof Error ? err.message : "Status update failed.");
    } finally {
      setScheduleBusy(false);
    }
  };

  const tabs: Array<{ id: HubTab; label: string }> = [
    { id: "overview", label: "Today" },
    { id: "calendar", label: "Calendar" },
    { id: "workforce", label: "Workforce" },
    { id: "crm", label: "CRM" },
    { id: "teams", label: "Teams" },
  ];

  const calendarFilterActive = Boolean(
    calendarSearch.trim() || calendarDueFrom || calendarDueTo,
  );

  const scheduleByPriority = useMemo(() => {
    const activities = snapshot?.schedule?.activities ?? [];
    const q = calendarSearch.trim().toLowerCase();
    const from = calendarDueFrom.trim();
    const to = calendarDueTo.trim();
    /** P1 (highest) first — lower numeric rank wins. */
    const byPriority = (a: (typeof activities)[number], b: (typeof activities)[number]) => {
      const pa = typeof a.priority === "number" ? a.priority : 999;
      const pb = typeof b.priority === "number" ? b.priority : 999;
      if (pa !== pb) return pa - pb;
      return (a.dueAt ?? "").localeCompare(b.dueAt ?? "");
    };
    const inDueRange = (a: (typeof activities)[number]) => {
      if (!from && !to) return true;
      const day = (a.dueAt || a.completedAt || "").slice(0, 10);
      if (!day) return false;
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    };
    const matchesText = (a: (typeof activities)[number]) => {
      if (!q) return true;
      const haystack = [
        a.title,
        a.synopsis,
        a.notes,
        a.outcome,
        typeof a.priority === "number" ? `p${a.priority}` : "",
        ...(a.nextActions ?? []).map((item) =>
          typeof item === "string" ? item : `${item.text} ${item.done ? "done" : "todo"}`,
        ),
        a.kind,
        a.status,
        a.ownerLabel,
        a.sourceRef,
        a.href,
        a.dueAt?.slice(0, 10),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    };
    const matches = (a: (typeof activities)[number]) => inDueRange(a) && matchesText(a);
    const filtered = [...activities.filter(matches)].sort(byPriority);
    const open = filtered.filter((a) =>
      ["PLANNED", "IN_PROGRESS", "IN_REVIEW"].includes(a.status),
    );
    const done = filtered.filter((a) => a.status === "DONE" || a.status === "CANCELLED");
    const filterOn = Boolean(q || from || to);
    return {
      open,
      done: filterOn ? done : done.slice(0, 12),
      doneTotal: done.length,
      matchCount: filtered.length,
      totalCount: activities.length,
    };
  }, [snapshot, calendarSearch, calendarDueFrom, calendarDueTo]);

  const priorityCalendarActivities = useMemo(
    () =>
      [...(snapshot?.schedule?.activities ?? [])]
        .filter((activity) => ["PLANNED", "IN_PROGRESS", "IN_REVIEW"].includes(activity.status))
        .sort((a, b) => {
          const aPriority = typeof a.priority === "number" ? a.priority : 999;
          const bPriority = typeof b.priority === "number" ? b.priority : 999;
          return aPriority - bPriority || (a.dueAt ?? "").localeCompare(b.dueAt ?? "");
        })
        .slice(0, 5),
    [snapshot],
  );

  return (
    <div className="min-h-screen bg-[#020617] p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
              Ironframe internal · GLOBAL_ADMIN or BUSINESS_ADMIN · not tenant-facing
            </p>
            <h1 className="text-2xl font-bold text-white">Ops Today</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Today inbox for prioritized work. Process desks: Calendar, Publishing, GTM portals, Approvals.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <button
              type="button"
              disabled={loading}
              onClick={() => void loadSnapshot()}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-cyan-600 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? "Refreshing…" : "Refresh telemetry"}
            </button>
            {refreshedAt ? (
              <p className="font-mono text-[10px] text-slate-500">Updated {refreshedAt}</p>
            ) : null}
          </div>
        </header>

        <nav className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <Link
              key={item.id}
              href={operationsTabHref(item.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                tab === item.id
                  ? "bg-cyan-900/50 text-cyan-100 ring-1 ring-cyan-700"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/dashboard/operations/publishing"
            className="rounded-lg border border-violet-700/70 bg-violet-950/40 px-3 py-2 text-sm font-medium text-violet-200 hover:border-violet-500"
          >
            Publishing
          </Link>
        </nav>

        {tab !== "overview" ? (
          <div>
            <Link
              href="/dashboard/operations"
              className="inline-block rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-600"
            >
              ← Ops Today
            </Link>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-900/50 bg-rose-950/30 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <OpsWorkerChatPanel />

        {loading && !snapshot ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
            Loading operations snapshot…
          </div>
        ) : null}

        {snapshot && tab === "overview" ? (
          <>
          <section className="rounded-xl border border-rose-900/40 bg-rose-950/15 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-rose-400">
                  GTM pipeline · design partner
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Warm + P1 inbound first. Cold Scout is secondary. Path B only after AGREED +
                  counsel D0.
                </p>
              </div>
              <Link
                href="/dashboard/operations/library/icp-shortlist#section-a"
                className="text-xs text-cyan-300 hover:underline"
              >
                Warm intro kit →
              </Link>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href="/dashboard/operations/salesteam#inbound-leads"
                className="rounded-lg border border-rose-800/50 bg-slate-950/40 px-3 py-2 hover:border-rose-500"
              >
                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
                  P1 inbound open
                </p>
                <p className="mt-1 text-2xl font-bold text-rose-200">
                  {snapshot.gtmPipeline?.inboundOpen ?? 0}
                  <span className="ml-1 text-sm font-normal text-slate-500">
                    / {snapshot.gtmPipeline?.inboundTotal ?? 0}
                  </span>
                </p>
              </Link>
              <Link
                href="/dashboard/admin/approvals?kind=SALES"
                className="rounded-lg border border-amber-800/50 bg-slate-950/40 px-3 py-2 hover:border-amber-500"
              >
                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
                  SALES approvals
                </p>
                <p className="mt-1 text-2xl font-bold text-amber-100">
                  {snapshot.gtmPipeline?.salesApprovalsPending ??
                    snapshot.approvals.byKind.SALES}
                </p>
              </Link>
              <Link
                href="/dashboard/operations/workflow-review"
                className="rounded-lg border border-teal-800/50 bg-slate-950/40 px-3 py-2 hover:border-teal-500"
              >
                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
                  LIVE / inbound due ≤3d
                </p>
                <p className="mt-1 text-2xl font-bold text-teal-100">
                  {snapshot.gtmPipeline?.liveDueSoon ?? 0}
                </p>
              </Link>
              <Link
                href="/admin/onboarding"
                className="rounded-lg border border-emerald-800/50 bg-slate-950/40 px-3 py-2 hover:border-emerald-500"
              >
                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
                  Path B provision
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-100">Admin SoD only →</p>
              </Link>
            </div>
          </section>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            <Link
              href="/dashboard/admin/approvals"
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-cyan-600"
            >
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Approval queue</div>
              <div className="mt-2 text-3xl font-bold text-white">{snapshot.approvals.total}</div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {approvalBadges.map((badge) => (
                  <span key={badge.label} className={badge.tone}>
                    {badge.label}: {badge.count}
                  </span>
                ))}
              </div>
            </Link>
            <Link
              href="/dashboard/operations?tab=crm"
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-cyan-600"
            >
              <div className="text-[10px] uppercase tracking-widest text-slate-500">CRM deals</div>
              <div className="mt-2 text-3xl font-bold text-white">{snapshot.crm.totalDeals}</div>
              <div className="mt-1 text-xs text-slate-400">{snapshot.crm.totalContacts} contacts</div>
            </Link>
            <Link
              href="/dashboard/operations/publishing"
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-cyan-600"
            >
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Publishing quarantine</div>
              <div className="mt-2 text-3xl font-bold text-white">
                {snapshot.briefings.queueDrafts.length}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Quarantine only · {snapshot.briefings.published.length} published
              </div>
            </Link>
            <Link
              href="/dashboard/operations?tab=calendar"
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-cyan-600"
            >
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Calendar</div>
              <div className="mt-2 text-3xl font-bold text-white">
                {snapshot.schedule?.openCount ?? 0}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {snapshot.schedule?.dueSoonCount ?? 0} due ≤3d · {snapshot.schedule?.overdueCount ?? 0}{" "}
                overdue
              </div>
            </Link>
            <Link
              href="/dashboard/operations?tab=workforce"
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-cyan-600"
            >
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Workers online</div>
              <div className="mt-2 text-3xl font-bold text-white">
                {(snapshot.workforce ?? []).filter((w) => w.reachable).length}/
                {(snapshot.workforce ?? []).length}
              </div>
              <div className="mt-1 text-xs text-slate-400">Local fleet health probes</div>
            </Link>
          </div>
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-white">Priority calendar</h2>
            <div className="mt-3 space-y-2">
              {priorityCalendarActivities.length === 0 ? (
                <p className="text-sm text-slate-500">No open calendar activities.</p>
              ) : (
                priorityCalendarActivities.map((activity) => (
                  <Link
                    key={activity.id}
                    href={activity.href || "/dashboard/operations?tab=calendar"}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm hover:border-cyan-600"
                  >
                    <span className="rounded bg-rose-950/60 px-2 py-0.5 font-mono text-xs font-semibold text-rose-200">
                      P{activity.priority ?? "—"}
                    </span>
                    <span className="min-w-0 flex-1 font-medium text-slate-100">{activity.title}</span>
                    <span className="text-xs text-slate-400">
                      {activity.dueAt ? formatOpsCalendarDate(activity.dueAt) : "No due date"}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-white">Process lanes</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  title: "GTM",
                  links: [
                    ["SalesTeam P1", "/dashboard/operations/salesteam#inbound-leads"],
                    ["Approvals SALES", "/dashboard/admin/approvals?kind=SALES"],
                    ["Workflow review", "/dashboard/operations/workflow-review"],
                    ["ICP shortlist", "/dashboard/operations/library/icp-shortlist"],
                  ],
                },
                {
                  title: "Customer",
                  links: [
                    ["Support intake", "/dashboard/operations/support-intake"],
                    ["Support approvals", "/dashboard/admin/approvals?kind=SUPPORT"],
                    ["SuccessTeam", "/dashboard/operations/success-team"],
                    ["CS approvals", "/dashboard/admin/approvals?kind=CUSTOMER_SUCCESS"],
                  ],
                },
                {
                  title: "Publishing",
                  links: [
                    ["Publishing Desk", "/dashboard/operations/publishing?desk=briefings"],
                    ["Newsletters desk", "/dashboard/operations/publishing?desk=newsletters"],
                    ["Research papers desk", "/dashboard/operations/publishing?desk=research"],
                    ["Video desk", "/dashboard/operations/publishing?desk=video"],
                    ["LinkedIn drafts", "/dashboard/operations/publishing?desk=linkedin"],
                    ["GF public", "/governance-frame"],
                  ],
                },
                {
                  title: "System",
                  links: [
                    ["Workforce", "/dashboard/operations?tab=workforce"],
                    ["Ironboard", "/dashboard/operations/ironboard"],
                    ["Calendar", "/dashboard/operations?tab=calendar"],
                    ["Operator library", "/dashboard/operations/library"],
                  ],
                },
              ].map((lane) => (
                <div key={lane.title} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-cyan-300">
                    {lane.title}
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm">
                    {lane.links.map(([label, href]) => (
                      <li key={href}>
                        <Link href={href} className="text-slate-300 hover:text-cyan-200 hover:underline">
                          {label} →
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-slate-300">
              <StatusDot ok={(snapshot.workforce ?? []).every((service) => service.reachable)} />
              <span>
                {(snapshot.workforce ?? []).filter((service) => service.reachable).length}/
                {(snapshot.workforce ?? []).length} workers up
              </span>
              <Link href="/dashboard/operations?tab=workforce" className="text-cyan-300 hover:underline">
                Open Workforce →
              </Link>
            </div>
            {(snapshot.workforce ?? []).some((service) => !service.reachable) ? (
              <ul className="mt-3 flex flex-wrap gap-3 text-xs">
                {(snapshot.workforce ?? [])
                  .filter((service) => !service.reachable)
                  .map((service) => (
                    <li key={service.id} className="rounded border border-rose-900/60 bg-rose-950/20 px-2 py-1 text-rose-200">
                      {service.label} down
                      {service.portalUrl ? (
                        <Link href={service.portalUrl} className="ml-2 text-cyan-300 hover:underline">
                          Open portal
                        </Link>
                      ) : null}
                    </li>
                  ))}
              </ul>
            ) : null}
          </section>
          </>
        ) : null}

        {snapshot && tab === "workforce" ? (
          <div className="grid gap-4 md:grid-cols-2">
            {(snapshot.workforce ?? []).map((service) => (
              <WorkforceCard key={service.id} service={service} />
            ))}
          </div>
        ) : null}

        {snapshot && tab === "crm" ? (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold text-white">Pipeline by stage</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(snapshot.crm.byStage).map(([stage, count]) => (
                  <div key={stage} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">
                      {STAGE_LABELS[stage] ?? stage}
                    </div>
                    <div className="mt-1 text-2xl font-bold text-cyan-300">{count}</div>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">Recent SUSPECT queue (Ironleads)</h2>
                <Link
                  href="/dashboard/operations/ironleads"
                  className="text-xs text-cyan-300 hover:underline"
                >
                  Open Ironleads SUSPECT portal →
                </Link>
              </div>
              <ul className="mt-4 space-y-2">
                {snapshot.crm.recentSuspects.length === 0 ? (
                  <li className="text-sm text-slate-500">No SUSPECT contacts in CRM.</li>
                ) : (
                  snapshot.crm.recentSuspects.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-slate-100">{row.company}</span>
                        <div className="mt-0.5 font-mono text-xs text-slate-400">
                          score {row.priorityScore}
                          {row.detectedTrigger ? ` · ${row.detectedTrigger}` : ""}
                        </div>
                        <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                          <div>
                            Website:{" "}
                            {row.websiteUrl ? (
                              <a
                                href={row.websiteUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-300/90 hover:underline"
                              >
                                {row.websiteUrl}
                              </a>
                            ) : (
                              "—"
                            )}
                          </div>
                          <div>Address: {row.addressLine ?? "—"}</div>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/operations/ironleads/suspects/${row.id}`}
                        className="shrink-0 text-xs text-cyan-300 hover:underline"
                      >
                        Why SUSPECT →
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        ) : null}

        {snapshot && tab === "calendar" ? (
          <div className="space-y-6">
            <section className="rounded-xl border border-cyan-900/50 bg-slate-900/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Ops Calendar</h2>
                  <p className="mt-1 max-w-3xl text-sm text-slate-400">
                    Listed by priority, highest first (
                    <span className="text-slate-300">P1</span> → Pn). Daily cron sends T-3 / T-2 /
                    T-1 / T-0 nudges to enabled Notification endpoints (and optional{" "}
                    <span className="font-mono text-slate-300">OPS_SCHEDULE_NOTIFY_EMAIL</span>).
                  </p>
                </div>
                <button
                  type="button"
                  disabled={scheduleBusy}
                  onClick={() => void seedSummerSchedule()}
                  className="rounded-lg border border-cyan-700 bg-cyan-950/50 px-4 py-2 text-sm text-cyan-100 hover:border-cyan-500 disabled:opacity-50"
                >
                  {scheduleBusy ? "Working…" : "Seed all projects"}
                </button>
              </div>
              {scheduleMessage ? (
                <p className="mt-3 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
                  {scheduleMessage}
                </p>
              ) : null}
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">Open</div>
                  <div className="mt-1 text-2xl font-semibold text-white">
                    {snapshot.schedule?.openCount ?? 0}
                  </div>
                </div>
                <div className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-amber-400">
                    Due in ≤3 days
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-amber-100">
                    {snapshot.schedule?.dueSoonCount ?? 0}
                  </div>
                </div>
                <div className="rounded-lg border border-rose-900/60 bg-rose-950/20 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-rose-400">Overdue</div>
                  <div className="mt-1 text-2xl font-semibold text-rose-100">
                    {snapshot.schedule?.overdueCount ?? 0}
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
                  <div className="relative min-w-0 flex-1">
                    <label htmlFor="ops-calendar-search" className="sr-only">
                      Search calendar
                    </label>
                    <input
                      id="ops-calendar-search"
                      type="search"
                      value={calendarSearch}
                      onChange={(e) => setCalendarSearch(e.target.value)}
                      placeholder="Search title, synopsis, kind, owner, source… (try WF review)"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 pr-20 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                    />
                    {calendarSearch.trim() ? (
                      <button
                        type="button"
                        onClick={() => setCalendarSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200"
                      >
                        Clear text
                      </button>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label
                        htmlFor="ops-calendar-due-from"
                        className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500"
                      >
                        Due from
                      </label>
                      <input
                        id="ops-calendar-due-from"
                        type="date"
                        value={calendarDueFrom}
                        max={calendarDueTo || undefined}
                        onChange={(e) => setCalendarDueFrom(e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-slate-100 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="ops-calendar-due-to"
                        className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500"
                      >
                        Due to
                      </label>
                      <input
                        id="ops-calendar-due-to"
                        type="date"
                        value={calendarDueTo}
                        min={calendarDueFrom || undefined}
                        onChange={(e) => setCalendarDueTo(e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-slate-100 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 pb-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date().toISOString().slice(0, 10);
                          setCalendarDueFrom(today);
                          setCalendarDueTo(today);
                          setCalendarSearch("WF review");
                        }}
                        className="rounded border border-cyan-800/50 px-2 py-1.5 text-[10px] uppercase tracking-wide text-cyan-200 hover:border-cyan-600"
                      >
                        Today · WF review
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const start = new Date();
                          const end = new Date();
                          end.setDate(end.getDate() + 7);
                          setCalendarDueFrom(start.toISOString().slice(0, 10));
                          setCalendarDueTo(end.toISOString().slice(0, 10));
                        }}
                        className="rounded border border-slate-700 px-2 py-1.5 text-[10px] uppercase tracking-wide text-slate-300 hover:border-slate-500"
                      >
                        Next 7 days
                      </button>
                    </div>
                    {calendarFilterActive ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCalendarSearch("");
                          setCalendarDueFrom("");
                          setCalendarDueTo("");
                        }}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200"
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                </div>
                {calendarFilterActive ? (
                  <p className="text-xs text-slate-500">
                    Showing {scheduleByPriority.matchCount} of {scheduleByPriority.totalCount}{" "}
                    items
                    {calendarDueFrom || calendarDueTo
                      ? ` · due ${calendarDueFrom || "…"} → ${calendarDueTo || "…"}`
                      : ""}
                  </p>
                ) : null}
              </div>
            </section>

            <div className="space-y-4">
              {(
                [
                  [
                    "Open — by priority",
                    "Highest priority first (P1 → Pn). Status shown on each card.",
                    scheduleByPriority.open,
                  ],
                  [
                    "Done",
                    "Finished or closed — kept for history (not open work)",
                    scheduleByPriority.done,
                  ],
                ] as const
              ).map(([label, columnHint, items]) => (
                <section
                  key={label}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
                >
                  <h3 className="text-sm font-semibold text-slate-200">
                    {label}{" "}
                    <span className="font-normal text-slate-500">
                      (
                      {label === "Done" && !calendarFilterActive
                        ? `${items.length}${
                            scheduleByPriority.doneTotal > items.length
                              ? ` of ${scheduleByPriority.doneTotal}`
                              : ""
                          }`
                        : items.length}
                      )
                    </span>
                  </h3>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">{columnHint}</p>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {items.length === 0 ? (
                      <li className="text-xs text-slate-500">None</li>
                    ) : (
                      items.map((activity) => {
                        const isClosed =
                          activity.status === "DONE" || activity.status === "CANCELLED";
                        const statusLabel =
                          activity.status === "PLANNED"
                            ? "Planned"
                            : activity.status === "IN_PROGRESS"
                              ? "In progress"
                              : activity.status === "IN_REVIEW"
                                ? "In review"
                                : activity.status === "CANCELLED"
                                  ? "Cancelled"
                                  : "Completed";
                        const dueTone = opsCalendarDueTone({
                          isClosed,
                          daysUntilDue: activity.daysUntilDue,
                        });
                        const dueLabel = isClosed
                          ? formatOpsCalendarDate(activity.completedAt || activity.dueAt)
                          : formatOpsCalendarDate(activity.dueAt);
                        const urgencyLabel = isClosed
                          ? activity.completedAt
                            ? "Closed"
                            : "Was due"
                          : activity.daysUntilDue < 0
                            ? `${Math.abs(activity.daysUntilDue)}d overdue`
                            : activity.daysUntilDue === 0
                              ? "Due today"
                              : activity.daysUntilDue === 1
                                ? "Due tomorrow"
                                : `${activity.daysUntilDue}d left`;
                        return (
                        <li
                          key={activity.id}
                          className={`rounded-lg border p-3 ${
                            isClosed
                              ? "border-slate-800/80 bg-slate-950/40 opacity-90"
                              : "border-slate-800 bg-slate-950/70"
                          }`}
                        >
                          <div
                            className={`mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md border px-2.5 py-2 ${dueTone.badge}`}
                          >
                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">
                                {isClosed ? "Closed" : "Due date"}
                              </div>
                              <div className="mt-0.5 text-base font-bold leading-tight tracking-tight sm:text-lg">
                                {dueLabel}
                              </div>
                            </div>
                            <div
                              className={`shrink-0 rounded-md bg-black/25 px-2 py-1 text-xs font-semibold uppercase tracking-wide ${dueTone.urgency}`}
                            >
                              {urgencyLabel}
                            </div>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
                                  (activity.priority ?? 99) <= 3
                                    ? "border-rose-800 bg-rose-950/50 text-rose-200"
                                    : (activity.priority ?? 99) <= 10
                                      ? "border-amber-800 bg-amber-950/40 text-amber-200"
                                      : isClosed
                                        ? "border-slate-700 bg-slate-900 text-slate-400"
                                        : "border-cyan-800 bg-cyan-950/40 text-cyan-200"
                                }`}
                                title="Calendar priority order (P1 = highest)"
                              >
                                P{activity.priority ?? "—"}
                              </span>
                              <div className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
                                Title
                              </div>
                            </div>
                            <span
                              className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                                isClosed
                                  ? "border-emerald-900/60 bg-emerald-950/40 text-emerald-300"
                                  : activity.status === "IN_PROGRESS"
                                    ? "border-cyan-800 bg-cyan-950/40 text-cyan-200"
                                    : activity.status === "IN_REVIEW"
                                      ? "border-amber-800 bg-amber-950/40 text-amber-200"
                                      : "border-slate-700 bg-slate-900 text-slate-300"
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <div className="mt-0.5 text-sm font-medium text-white">{activity.title}</div>
                          <div className="mt-2 text-[10px] font-medium uppercase tracking-widest text-slate-500">
                            What this is
                          </div>
                          <p className="mt-0.5 text-xs leading-snug text-slate-300">
                            {activity.synopsis ||
                              activity.notes ||
                              "No synopsis — add a brief what/why."}
                          </p>
                          {!isClosed && (activity.nextActions?.length ?? 0) > 0 ? (
                            <>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <div className="text-[10px] font-medium uppercase tracking-widest text-amber-400/90">
                                  What needs to be done
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {activity.nextActionsRemaining ??
                                    activity.nextActions.filter((s) =>
                                      typeof s === "string" ? true : !s.done,
                                    ).length}
                                  /
                                  {activity.nextActions.length} left
                                </div>
                              </div>
                              <ul className="mt-1.5 space-y-1.5">
                                {activity.nextActions.map((step, index) => {
                                  const text = typeof step === "string" ? step : step.text;
                                  const done = typeof step === "string" ? false : step.done;
                                  const inputId = `ops-check-${activity.id}-${index}`;
                                  return (
                                    <li key={`${activity.id}-${index}-${text}`}>
                                      <label
                                        htmlFor={inputId}
                                        className={`flex cursor-pointer items-start gap-2 rounded border px-2 py-1.5 text-xs leading-snug ${
                                          done
                                            ? "border-emerald-900/50 bg-emerald-950/20 text-slate-400"
                                            : "border-amber-900/40 bg-amber-950/20 text-amber-50/90"
                                        }`}
                                      >
                                        <input
                                          id={inputId}
                                          type="checkbox"
                                          checked={done}
                                          disabled={scheduleBusy}
                                          onChange={(e) =>
                                            void setChecklistItem(
                                              activity.id,
                                              index,
                                              e.target.checked,
                                            )
                                          }
                                          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-600"
                                        />
                                        <span className={done ? "line-through" : undefined}>
                                          {text}
                                        </span>
                                      </label>
                                    </li>
                                  );
                                })}
                              </ul>
                            </>
                          ) : null}
                          {isClosed ? (
                            <>
                              <div className="mt-2 text-[10px] font-medium uppercase tracking-widest text-emerald-500/80">
                                What was done
                              </div>
                              <p className="mt-0.5 text-xs leading-snug text-emerald-100/90">
                                {activity.outcome ||
                                  "No outcome recorded — add what was completed for review."}
                              </p>
                            </>
                          ) : null}
                          {activity.href ? (
                            <Link
                              href={activity.href}
                              className="mt-1.5 inline-block text-xs text-cyan-300 hover:underline"
                            >
                              Open linked work →
                            </Link>
                          ) : null}
                          <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                            {activity.kind.replace(/_/g, " ")} · {activity.ownerLabel}
                          </div>
                          {isClosed ? (
                            <div className="mt-1.5 text-xs font-medium text-slate-300">
                              Originally due{" "}
                              <span className="font-semibold text-slate-100">
                                {formatOpsCalendarDate(activity.dueAt)}
                              </span>
                            </div>
                          ) : null}
                          {activity.sourceRef ? (
                            <div className="mt-1 truncate font-mono text-[10px] text-slate-500">
                              {activity.sourceRef}
                            </div>
                          ) : null}
                          {!isClosed ? (
                            <div className="mt-2 space-y-2">
                              <div>
                                <label
                                  htmlFor={`ops-outcome-${activity.id}`}
                                  className="text-[10px] font-medium uppercase tracking-widest text-slate-500"
                                >
                                  Close-out notes
                                </label>
                                <textarea
                                  id={`ops-outcome-${activity.id}`}
                                  value={outcomeDrafts[activity.id] ?? ""}
                                  onChange={(e) =>
                                    setOutcomeDrafts((prev) => ({
                                      ...prev,
                                      [activity.id]: e.target.value,
                                    }))
                                  }
                                  rows={2}
                                  disabled={scheduleBusy}
                                  placeholder="What was completed (required before Done)…"
                                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none"
                                />
                              </div>
                              <div className="flex flex-wrap gap-1">
                              {activity.status !== "IN_PROGRESS" ? (
                                <button
                                  type="button"
                                  disabled={scheduleBusy}
                                  onClick={() => void setScheduleStatus(activity.id, "IN_PROGRESS")}
                                  className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:border-cyan-600"
                                >
                                  Start
                                </button>
                              ) : null}
                              {activity.status !== "IN_REVIEW" ? (
                                <button
                                  type="button"
                                  disabled={scheduleBusy}
                                  onClick={() => void setScheduleStatus(activity.id, "IN_REVIEW")}
                                  className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:border-amber-600"
                                >
                                  Review
                                </button>
                              ) : null}
                              <button
                                type="button"
                                disabled={
                                  scheduleBusy || !(outcomeDrafts[activity.id] ?? "").trim()
                                }
                                title={
                                  !(outcomeDrafts[activity.id] ?? "").trim()
                                    ? "Add close-out notes first"
                                    : "Mark done and save notes"
                                }
                                onClick={() => void setScheduleStatus(activity.id, "DONE")}
                                className="rounded border border-emerald-800 px-2 py-0.5 text-[10px] text-emerald-300 hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Done
                              </button>
                              <button
                                type="button"
                                disabled={
                                  scheduleBusy || !(outcomeDrafts[activity.id] ?? "").trim()
                                }
                                title={
                                  !(outcomeDrafts[activity.id] ?? "").trim()
                                    ? "Add a cancel reason in close-out notes first"
                                    : "Cancel and save reason"
                                }
                                onClick={() => void setScheduleStatus(activity.id, "CANCELLED")}
                                className="rounded border border-rose-900/70 px-2 py-0.5 text-[10px] text-rose-300/90 hover:border-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Cancel
                              </button>
                              </div>
                            </div>
                          ) : null}
                        </li>
                        );
                      })
                    )}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        ) : null}

        {snapshot && tab === "teams" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold text-white">Perimeter workforce apps</h2>
              <p className="mt-1 text-xs text-slate-500">
                Isolated LangGraph poll workers — read-only ingress into Ironframe :3000; operator HITL before
                dispatch.
              </p>
              <div className="mt-4">
                <WorkforceFleetList workforce={snapshot.workforce ?? []} />
              </div>
            </section>
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold text-white">Human-in-the-loop teams</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <Link href="/dashboard/admin/approvals" className="text-cyan-300 hover:underline">
                    All approval tracks
                  </Link>
                  {" · "}
                  <Link
                    href="/dashboard/admin/approvals?kind=SALES"
                    className="text-amber-300 hover:underline"
                  >
                    Sales
                  </Link>
                  {" · "}
                  <Link
                    href="/dashboard/admin/approvals?kind=SUPPORT"
                    className="text-emerald-300 hover:underline"
                  >
                    Support
                  </Link>
                  {" · "}
                  <Link
                    href="/dashboard/admin/approvals?kind=CUSTOMER_SUCCESS"
                    className="text-violet-300 hover:underline"
                  >
                    CS
                  </Link>
                  <p className="text-slate-500">Support, Sales, and Customer Success draft dispatch.</p>
                </li>
                <li>
                  <Link
                    href="/dashboard/operations/library"
                    className="text-cyan-300 hover:underline"
                  >
                    Operator library
                  </Link>
                  <p className="text-slate-500">
                    Directory of playbooks (pre-outreach run order, offer sheet, battlecards) and Ops
                    tools.
                  </p>
                </li>
                <li>
                  <Link
                    href="/dashboard/operations/workflow-review"
                    className="text-cyan-300 hover:underline"
                  >
                    Workflow review call assist
                  </Link>
                  <p className="text-slate-500">
                    Mic LIVE in-call + Teams Graph connect/create/poll transcript, live Q&A sidecar,
                    buying signs for Path B close.
                  </p>
                </li>
                <li>
                  <Link href="/dashboard/operations/support-intake" className="text-cyan-300 hover:underline">
                    Support intake operator console
                  </Link>
                  <p className="text-slate-500">
                    Tenant intake is session-scoped via /dashboard/support; worker drafts route to SUPPORT
                    approvals only.
                  </p>
                </li>
                <li>
                  <Link href="/dashboard/operations/ironleads" className="text-cyan-300 hover:underline">
                    Ironleads interaction portal
                  </Link>
                  <p className="text-slate-500">SUSPECT harvest & OSINT pipeline → CRM ingress (:8083).</p>
                </li>
                <li>
                  <Link
                    href="/dashboard/operations/salesteam#inbound-leads"
                    className="text-rose-300 hover:underline"
                  >
                    SalesTeam portal · P1 inbound
                  </Link>
                  <p className="text-slate-500">
                    Public /register/contact hand-raisers are P1 (Ops calendar + notify). Cold PROSPECT
                    queue is secondary (:8084).
                  </p>
                </li>
                <li>
                  <Link href="/sales-agent-portal" className="text-cyan-300 hover:underline">
                    Sales agent portal
                  </Link>
                  <p className="text-slate-500">Public prospect intake → SalesTeam worker (:8084).</p>
                </li>
                <li>
                  <Link href="/dashboard/operations/success-team" className="text-cyan-300 hover:underline">
                    IronSuccessTeam interaction portal
                  </Link>
                  <p className="text-slate-500">
                    CLOSED_WON health advisories → CS approval queue (:8085).
                  </p>
                </li>
              </ul>
            </section>
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 md:col-span-2">
              <h2 className="text-lg font-semibold text-white">Quick links</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {snapshot.quickLinks.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a href={link.href} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="text-cyan-300 hover:underline">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
