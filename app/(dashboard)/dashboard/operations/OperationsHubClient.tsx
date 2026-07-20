"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { OperationsHubSnapshot, WorkforceServiceStatus } from "@/app/lib/server/operationsHubCore";
import OpsWorkerChatPanel from "@/app/components/operations/OpsWorkerChatPanel";
import { fetchOpsPortalJson } from "@/app/utils/fetchOpsPortalJson";

type HubTab =
  | "overview"
  | "calendar"
  | "workforce"
  | "crm"
  | "briefings"
  | "newsletters"
  | "teams";

const HUB_TAB_IDS: HubTab[] = [
  "overview",
  "calendar",
  "workforce",
  "crm",
  "briefings",
  "newsletters",
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

function DeskReviewBadges({
  deskReview,
}: {
  deskReview: OperationsHubSnapshot["briefings"]["queueDrafts"][number]["deskReview"];
}) {
  if (!deskReview) {
    return <span className="text-slate-600">no GF desk pass</span>;
  }
  return (
    <>
      <span
        className={
          deskReview.readyForHumanOperator ? "text-emerald-400" : "text-amber-300"
        }
      >
        desk {deskReview.readyForHumanOperator ? "ready" : "revise"}
      </span>
      {deskReview.findings.map((finding) => (
        <span
          key={finding.agentId}
          className={
            finding.status === "pass" || finding.status === "advisory"
              ? "text-slate-400"
              : finding.status === "fail"
                ? "text-rose-400"
                : "text-amber-400"
          }
          title={finding.summary}
        >
          {finding.agentId.replace("gf-", "")}:{finding.status}
        </span>
      ))}
    </>
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<HubTab>(() => parseHubTab(searchParams.get("tab")));
  const [snapshot, setSnapshot] = useState<OperationsHubSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoteFile, setPromoteFile] = useState("");
  const [promoteSlug, setPromoteSlug] = useState("");
  const [promoteBusy, setPromoteBusy] = useState(false);
  const [promoteMessage, setPromoteMessage] = useState<string | null>(null);
  const [denyBusy, setDenyBusy] = useState(false);
  const [requestPrompt, setRequestPrompt] = useState("");
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [deskTitle, setDeskTitle] = useState("");
  const [deskPrompt, setDeskPrompt] = useState("");
  const [deskBusy, setDeskBusy] = useState(false);
  const [deskMessage, setDeskMessage] = useState<string | null>(null);
  const [deskReviewBusyFile, setDeskReviewBusyFile] = useState<string | null>(null);
  const [newsletterRequestPrompt, setNewsletterRequestPrompt] = useState("");
  const [newsletterRequestBusy, setNewsletterRequestBusy] = useState(false);
  const [newsletterRequestMessage, setNewsletterRequestMessage] = useState<string | null>(null);
  const [syndicateSlug, setSyndicateSlug] = useState("");
  const [syndicateBusy, setSyndicateBusy] = useState(false);
  const [syndicateMessage, setSyndicateMessage] = useState<string | null>(null);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [calendarSearch, setCalendarSearch] = useState("");
  const [decisionBusyFile, setDecisionBusyFile] = useState<string | null>(null);
  const [decisionMessage, setDecisionMessage] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const promoteDefaultsSet = useRef(false);
  const promotePanelRef = useRef<HTMLDivElement | null>(null);

  const slugFromQueueFilename = useCallback(
    (filename: string) =>
      filename.replace(/-draft-/i, "-").replace(/\.md$/i, "").toLowerCase(),
    [],
  );

  const focusedDraft = searchParams.get("draft")?.trim() || null;

  const selectQueueDraft = useCallback(
    (filename: string, options?: { scrollPromote?: boolean }) => {
      const file = filename.trim();
      if (!file) return;
      const slug = slugFromQueueFilename(file);
      setPromoteFile(file);
      setPromoteSlug(slug);
      setPromoteMessage(`Selected ${file} for promote / deny.`);
      setDecisionMessage(null);

      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "briefings");
      params.set("draft", file);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });

      if (options?.scrollPromote !== false) {
        window.requestAnimationFrame(() => {
          promotePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      }
    },
    [pathname, router, searchParams, slugFromQueueFilename],
  );

  useEffect(() => {
    setTab(parseHubTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    if (!focusedDraft || loading) return;
    const el = document.getElementById(`queue-draft-${focusedDraft}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedDraft, loading, tab, snapshot]);

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
      if (!promoteDefaultsSet.current && data.briefings.queueDrafts.length > 0) {
        promoteDefaultsSet.current = true;
        const urlDraft = new URLSearchParams(window.location.search).get("draft")?.trim();
        const fromUrl = urlDraft
          ? data.briefings.queueDrafts.find((d) => d.filename === urlDraft)
          : undefined;
        const pick = fromUrl ?? data.briefings.queueDrafts[0];
        setPromoteFile(pick.filename);
        setPromoteSlug(slugFromQueueFilename(pick.filename));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failure.");
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [slugFromQueueFilename]);

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

  /** Strict Ironcast/newsletter filenames (autonomous or requested). */
  const isStrictNewsletterQueueDraft = (filename: string) =>
    /newsletter/i.test(filename) || /ironcast/i.test(filename);

  /**
   * Newsletters approve/deny desk: Ironcast drafts plus market series that syndicate
   * as newsletter editions after Approve (e.g. *-draft-market-grc-*).
   */
  const isNewslettersDeskDraft = (filename: string) =>
    isStrictNewsletterQueueDraft(filename) ||
    /market-grc/i.test(filename) ||
    /-draft-market-/i.test(filename);

  const newsletterQueueDrafts = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.briefings.queueDrafts.filter(
      (draft) => draft.promotable && isNewslettersDeskDraft(draft.filename),
    );
  }, [snapshot]);

  /** Briefings desk keeps governance drafts that are not strict Ironcast newsletter names. */
  const briefingQueueDrafts = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.briefings.queueDrafts.filter(
      (draft) => !isStrictNewsletterQueueDraft(draft.filename),
    );
  }, [snapshot]);

  const handlePromote = async (filenameOverride?: string, slugOverride?: string) => {
    const file = (filenameOverride ?? promoteFile).trim();
    const slug = (slugOverride ?? promoteSlug).trim();
    if (!file || !slug || promoteBusy || decisionBusyFile) return;
    if (filenameOverride) setDecisionBusyFile(file);
    else setPromoteBusy(true);
    setPromoteMessage(null);
    setDecisionMessage(null);
    try {
      const data = await fetchOpsPortalJson<{ ok?: boolean; slug?: string }>(
        "/api/admin/operations-hub/briefings/promote",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file, slug }),
        },
        "Promotion failed.",
      );
      const okMsg = `Approved & promoted to /governance-frame/${data.slug ?? slug}`;
      setPromoteMessage(okMsg);
      setDecisionMessage(okMsg);
      await loadSnapshot();
    } catch (err) {
      const fail = err instanceof Error ? err.message : "Promotion failed.";
      setPromoteMessage(fail);
      setDecisionMessage(fail);
    } finally {
      setPromoteBusy(false);
      setDecisionBusyFile(null);
    }
  };

  const handleDenyDraft = async (filename: string) => {
    const file = filename.trim();
    if (!file || decisionBusyFile || denyBusy) return;
    const confirmed = window.confirm(
      `Deny ${file}?\n\nIt will leave the approval queue and will not be published.`,
    );
    if (!confirmed) return;
    setDecisionBusyFile(file);
    setDenyBusy(true);
    setDecisionMessage(null);
    setPromoteMessage(null);
    try {
      const data = await fetchOpsPortalJson<{ ok?: boolean; message?: string }>(
        "/api/admin/operations-hub/briefings/deny",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file }),
        },
        "Deny failed.",
      );
      const okMsg = data.message ?? `Denied ${file} — removed from active queue.`;
      setDecisionMessage(okMsg);
      setPromoteMessage(okMsg);
      if (promoteFile === file) {
        setPromoteFile("");
        setPromoteSlug("");
        promoteDefaultsSet.current = false;
      }
      await loadSnapshot();
    } catch (err) {
      const fail = err instanceof Error ? err.message : "Deny failed.";
      setDecisionMessage(fail);
      setPromoteMessage(fail);
    } finally {
      setDecisionBusyFile(null);
      setDenyBusy(false);
    }
  };

  const handleGfDeskAuthor = async () => {
    if (!deskPrompt.trim() || deskBusy) return;
    setDeskBusy(true);
    setDeskMessage(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        message?: string;
        readyForHumanOperator?: boolean;
      }>(
        "/api/admin/operations-hub/briefings/desk-run",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "author",
            title: deskTitle.trim() || undefined,
            requestPrompt: deskPrompt.trim(),
            overwrite: true,
            tenantSlug: "ironframe-sandbox",
          }),
        },
        "GF desk author failed.",
      );
      setDeskMessage(
        `${data.message ?? "Desk run complete."}${
          data.readyForHumanOperator ? " Checklist advisory-ready for human Approve." : ""
        }`,
      );
      await loadSnapshot();
    } catch (err) {
      setDeskMessage(err instanceof Error ? err.message : "GF desk author failed.");
    } finally {
      setDeskBusy(false);
    }
  };

  const handleGfDeskReview = async (filename: string) => {
    const file = filename.trim();
    if (!file || deskReviewBusyFile) return;
    setDeskReviewBusyFile(file);
    setDeskMessage(null);
    try {
      const data = await fetchOpsPortalJson<{ ok?: boolean; message?: string }>(
        "/api/admin/operations-hub/briefings/desk-run",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "review",
            filename: file,
            tenantSlug: "ironframe-sandbox",
          }),
        },
        "GF desk review failed.",
      );
      setDeskMessage(data.message ?? `Desk review recorded for ${file}.`);
      await loadSnapshot();
    } catch (err) {
      setDeskMessage(err instanceof Error ? err.message : "GF desk review failed.");
    } finally {
      setDeskReviewBusyFile(null);
    }
  };

  const handleBriefingRequest = async () => {
    if (!requestPrompt.trim() || requestBusy) return;
    setRequestBusy(true);
    setRequestMessage(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        message?: string;
        staged?: Array<{ filename: string }>;
        failed?: Array<{ filename: string; error: string }>;
      }>(
        "/api/admin/operations-hub/briefings/request",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestPrompt: requestPrompt.trim(),
            overwrite: true,
            tenantSlug: "ironframe-sandbox",
          }),
        },
        "Briefing request failed.",
      );
      const stagedNames = (data.staged ?? []).map((row) => row.filename).join(", ");
      const failedNote =
        data.failed && data.failed.length > 0
          ? ` Failures: ${data.failed.map((row) => `${row.filename}: ${row.error}`).join("; ")}`
          : "";
      setRequestMessage(
        `${data.message ?? "Request complete."}${stagedNames ? ` Files: ${stagedNames}.` : ""}${failedNote}`,
      );
      await loadSnapshot();
    } catch (err) {
      setRequestMessage(err instanceof Error ? err.message : "Briefing request failed.");
    } finally {
      setRequestBusy(false);
    }
  };

  const handleNewsletterRequest = async () => {
    if (!newsletterRequestPrompt.trim() || newsletterRequestBusy) return;
    setNewsletterRequestBusy(true);
    setNewsletterRequestMessage(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        message?: string;
        staged?: Array<{ filename: string }>;
        failed?: Array<{ filename: string; error: string }>;
      }>(
        "/api/admin/operations-hub/newsletters/request",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestPrompt: newsletterRequestPrompt.trim(),
            overwrite: true,
            tenantSlug: "ironframe-sandbox",
          }),
        },
        "Newsletter request failed.",
      );
      const stagedNames = (data.staged ?? []).map((row) => row.filename).join(", ");
      const failedNote =
        data.failed && data.failed.length > 0
          ? ` Failures: ${data.failed.map((row) => `${row.filename}: ${row.error}`).join("; ")}`
          : "";
      setNewsletterRequestMessage(
        `${data.message ?? "Request complete."}${stagedNames ? ` Files: ${stagedNames}.` : ""}${failedNote}`,
      );
      await loadSnapshot();
    } catch (err) {
      setNewsletterRequestMessage(err instanceof Error ? err.message : "Newsletter request failed.");
    } finally {
      setNewsletterRequestBusy(false);
    }
  };

  const handleSyndicate = async (slug: string) => {
    if (!slug.trim() || syndicateBusy) return;
    setSyndicateBusy(true);
    setSyndicateMessage(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        newsletterHtmlPath?: string | null;
      }>(
        "/api/admin/operations-hub/newsletters/syndicate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: slug.trim() }),
        },
        "Syndication failed.",
      );
      setSyndicateMessage(
        data.newsletterHtmlPath
          ? `Ironcast HTML compiled: ${data.newsletterHtmlPath}`
          : "RSS + newsletter syndication complete.",
      );
      await loadSnapshot();
    } catch (err) {
      setSyndicateMessage(err instanceof Error ? err.message : "Syndication failed.");
    } finally {
      setSyndicateBusy(false);
    }
  };

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
      const entered = window.prompt(
        status === "DONE"
          ? "What was done? (required — saved for later review)"
          : "Why cancelled? (required — saved for later review)",
      );
      if (entered === null) return;
      outcome = entered.trim();
      if (!outcome) {
        setScheduleMessage("Outcome is required when marking Done or Cancelled.");
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
      await loadSnapshot();
    } catch (err) {
      setScheduleMessage(err instanceof Error ? err.message : "Status update failed.");
    } finally {
      setScheduleBusy(false);
    }
  };

  const tabs: Array<{ id: HubTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "calendar", label: "Calendar" },
    { id: "workforce", label: "Workforce" },
    { id: "crm", label: "CRM" },
    { id: "briefings", label: "Briefings" },
    { id: "newsletters", label: "Newsletters" },
    { id: "teams", label: "Teams" },
  ];

  const scheduleByPriority = useMemo(() => {
    const activities = snapshot?.schedule?.activities ?? [];
    const q = calendarSearch.trim().toLowerCase();
    /** P1 (highest) first — lower numeric rank wins. */
    const byPriority = (a: (typeof activities)[number], b: (typeof activities)[number]) => {
      const pa = typeof a.priority === "number" ? a.priority : 999;
      const pb = typeof b.priority === "number" ? b.priority : 999;
      if (pa !== pb) return pa - pb;
      return (a.dueAt ?? "").localeCompare(b.dueAt ?? "");
    };
    const matches = (a: (typeof activities)[number]) => {
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
    const filtered = [...activities.filter(matches)].sort(byPriority);
    const open = filtered.filter((a) =>
      ["PLANNED", "IN_PROGRESS", "IN_REVIEW"].includes(a.status),
    );
    const done = filtered.filter((a) => a.status === "DONE" || a.status === "CANCELLED");
    return {
      open,
      done: calendarSearch.trim() ? done : done.slice(0, 12),
      doneTotal: done.length,
      matchCount: filtered.length,
      totalCount: activities.length,
    };
  }, [snapshot, calendarSearch]);

  return (
    <div className="min-h-screen bg-[#020617] p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
              Ironframe internal · GLOBAL_ADMIN or BUSINESS_ADMIN · not tenant-facing
            </p>
            <h1 className="text-2xl font-bold text-white">Revenue & Success Command Center</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Internal perimeter workforce console — Ironboard, Ironleads, SalesTeam, IronSuccessTeam,
              IronSupportTeam, CRM pipeline, human-in-the-loop approvals, Ironcast newsletters, and public
              briefing promotion. Tenant workspaces never mount these apps.
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
        </nav>

        {tab !== "overview" ? (
          <div>
            <Link
              href="/dashboard/operations"
              className="inline-block rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-600"
            >
              ← Operations hub
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Approval queue</div>
              <div className="mt-2 text-3xl font-bold text-white">{snapshot.approvals.total}</div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {approvalBadges.map((badge) => (
                  <span key={badge.label} className={badge.tone}>
                    {badge.label}: {badge.count}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">CRM deals</div>
              <div className="mt-2 text-3xl font-bold text-white">{snapshot.crm.totalDeals}</div>
              <div className="mt-1 text-xs text-slate-400">{snapshot.crm.totalContacts} contacts</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Briefing queue</div>
              <div className="mt-2 text-3xl font-bold text-white">
                {snapshot.briefings.queueDrafts.length}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Quarantine only · {snapshot.briefings.published.length} published
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Calendar</div>
              <div className="mt-2 text-3xl font-bold text-white">
                {snapshot.schedule?.openCount ?? 0}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {snapshot.schedule?.dueSoonCount ?? 0} due ≤3d · {snapshot.schedule?.overdueCount ?? 0}{" "}
                overdue
              </div>
              <Link
                href="/dashboard/operations?tab=calendar"
                className="mt-2 inline-block text-xs text-cyan-300 hover:underline"
              >
                Open calendar →
              </Link>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Workers online</div>
              <div className="mt-2 text-3xl font-bold text-white">
                {snapshot.workforce.filter((w) => w.reachable).length}/{snapshot.workforce.length}
              </div>
              <div className="mt-1 text-xs text-slate-400">Local fleet health probes</div>
            </div>
          </div>
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-white">Quick actions</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/dashboard/admin/approvals"
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-cyan-200 hover:border-cyan-600"
              >
                All approvals ({snapshot.approvals.total})
              </Link>
              <Link
                href="/dashboard/admin/approvals?kind=SALES"
                className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-2 text-sm text-amber-200 hover:border-amber-600"
              >
                Sales outreach ({snapshot.approvals.byKind.SALES})
              </Link>
              <Link
                href="/dashboard/operations?tab=calendar"
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-cyan-200 hover:border-cyan-600"
              >
                Open calendar
              </Link>
              <Link
                href="/dashboard/operations?tab=briefings"
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-cyan-200 hover:border-cyan-600"
              >
                Promote briefing draft
              </Link>
              <Link
                href="/dashboard/operations?tab=newsletters"
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-cyan-200 hover:border-cyan-600"
              >
                Request / syndicate newsletters
              </Link>
              <Link
                href="/dashboard/operations?tab=workforce"
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-cyan-200 hover:border-cyan-600"
              >
                Check worker fleet
              </Link>
              <Link
                href="/dashboard/admin/approvals?kind=SUPPORT"
                className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-200 hover:border-emerald-600"
              >
                Support replies ({snapshot.approvals.byKind.SUPPORT})
              </Link>
              <Link
                href="/dashboard/admin/approvals?kind=CUSTOMER_SUCCESS"
                className="rounded-lg border border-violet-800/50 bg-violet-950/30 px-4 py-2 text-sm text-violet-200 hover:border-violet-600"
              >
                CS advisories ({snapshot.approvals.byKind.CUSTOMER_SUCCESS})
              </Link>
              <Link
                href="/dashboard/operations/salesteam"
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-cyan-200 hover:border-cyan-600"
              >
                SalesTeam portal
              </Link>
              <Link
                href="/operator/workflow-review-protocol.html"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-teal-800/50 bg-teal-950/30 px-4 py-2 text-sm text-teal-100 hover:border-teal-500"
              >
                Workflow review talk track
              </Link>
              <Link
                href="/dashboard/operations/support-intake"
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-cyan-200 hover:border-cyan-600"
              >
                Support intake console
              </Link>
              <Link
                href="/dashboard/operations/ironboard"
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-cyan-200 hover:border-cyan-600"
              >
                Ironboard boardroom
              </Link>
              <Link
                href="/dashboard/operations/ironleads"
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-cyan-200 hover:border-cyan-600"
              >
                Ironleads portal
              </Link>
              <Link
                href="/dashboard/operations/success-team"
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-cyan-200 hover:border-cyan-600"
              >
                IronSuccessTeam portal
              </Link>
            </div>
          </section>
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Perimeter workforce apps</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Poll workers and boardroom consoles — including IronSupportTeam (:8086).
                </p>
              </div>
              <Link
                href="/dashboard/operations?tab=workforce"
                className="text-xs text-cyan-300 hover:underline"
              >
                Full fleet telemetry →
              </Link>
            </div>
            <div className="mt-4">
              <WorkforceFleetList workforce={snapshot.workforce} />
            </div>
          </section>
          </>
        ) : null}

        {snapshot && tab === "workforce" ? (
          <div className="grid gap-4 md:grid-cols-2">
            {snapshot.workforce.map((service) => (
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
              <div className="mt-4">
                <label htmlFor="ops-calendar-search" className="sr-only">
                  Search calendar
                </label>
                <div className="relative">
                  <input
                    id="ops-calendar-search"
                    type="search"
                    value={calendarSearch}
                    onChange={(e) => setCalendarSearch(e.target.value)}
                    placeholder="Search title, synopsis, kind, owner, source…"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 pr-20 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                  />
                  {calendarSearch.trim() ? (
                    <button
                      type="button"
                      onClick={() => setCalendarSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                {calendarSearch.trim() ? (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Showing {scheduleByPriority.matchCount} of {scheduleByPriority.totalCount}{" "}
                    items
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
                      {label === "Done" && !calendarSearch.trim()
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
                        return (
                        <li
                          key={activity.id}
                          className={`rounded-lg border p-3 ${
                            isClosed
                              ? "border-slate-800/80 bg-slate-950/40 opacity-90"
                              : "border-slate-800 bg-slate-950/70"
                          }`}
                        >
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
                          <div className="mt-1 text-xs text-slate-400">
                            {isClosed ? (
                              <>
                                Closed
                                {activity.completedAt
                                  ? ` ${activity.completedAt.slice(0, 10)}`
                                  : ""}
                                {" · "}
                                was due {activity.dueAt.slice(0, 10)}
                              </>
                            ) : (
                              <>
                                Due {activity.dueAt.slice(0, 10)} ·{" "}
                                {activity.daysUntilDue < 0
                                  ? `${Math.abs(activity.daysUntilDue)}d overdue`
                                  : activity.daysUntilDue === 0
                                    ? "due today"
                                    : `${activity.daysUntilDue}d left`}
                              </>
                            )}
                          </div>
                          {activity.sourceRef ? (
                            <div className="mt-1 truncate font-mono text-[10px] text-slate-500">
                              {activity.sourceRef}
                            </div>
                          ) : null}
                          {!isClosed ? (
                            <div className="mt-2 flex flex-wrap gap-1">
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
                                  className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:border-cyan-600"
                                >
                                  Review
                                </button>
                              ) : null}
                              <button
                                type="button"
                                disabled={scheduleBusy}
                                onClick={() => void setScheduleStatus(activity.id, "DONE")}
                                className="rounded border border-emerald-800 px-2 py-0.5 text-[10px] text-emerald-300 hover:border-emerald-500"
                              >
                                Done
                              </button>
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

        {snapshot && tab === "briefings" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold text-white">Quarantined drafts</h2>
              <p className="mt-1 text-sm text-slate-400">
                Weekday autonomous GTM cron and manual requests stage here only. Nothing publishes until you
                Approve (promote) or Deny.
              </p>
              {decisionMessage ? (
                <p className="mt-2 text-sm text-slate-300">{decisionMessage}</p>
              ) : null}
              <ul className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                {briefingQueueDrafts.length === 0 ? (
                  <li className="text-sm text-slate-500">
                    No briefing drafts awaiting review. Autonomous weekday runs land as{" "}
                    <span className="font-mono text-slate-400">*-draft-auto-briefing-*</span>.
                  </li>
                ) : (
                  briefingQueueDrafts.map((draft) => {
                    const busy = decisionBusyFile === draft.filename;
                    const slug = slugFromQueueFilename(draft.filename);
                    const selected =
                      promoteFile === draft.filename || focusedDraft === draft.filename;
                    return (
                      <li
                        id={`queue-draft-${draft.filename}`}
                        key={draft.filename}
                        className={`rounded-lg border p-3 text-sm ${
                          selected
                            ? "border-cyan-500 bg-cyan-950/30 ring-1 ring-cyan-500/40"
                            : "border-slate-800 bg-slate-950/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-100">{draft.title}</div>
                            <div className="font-mono text-[10px] text-slate-500">{draft.filename}</div>
                            {draft.summary ? (
                              <p className="mt-1 text-xs text-slate-400 line-clamp-2">{draft.summary}</p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => selectQueueDraft(draft.filename)}
                            className={`shrink-0 text-xs hover:underline ${
                              selected ? "font-semibold text-cyan-200" : "text-cyan-300"
                            }`}
                            aria-pressed={selected}
                          >
                            {selected ? "Selected" : "Select"}
                          </button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest">
                          <span className={draft.validationOk ? "text-emerald-400" : "text-amber-400"}>
                            {draft.validationOk ? "validation ok" : "needs review"}
                          </span>
                          <DeskReviewBadges deskReview={draft.deskReview} />
                          {/auto-briefing/i.test(draft.filename) ? (
                            <span className="text-violet-300">autonomous</span>
                          ) : null}
                          {/gf-desk/i.test(draft.filename) ? (
                            <span className="text-cyan-300">gf desk</span>
                          ) : null}
                          {draft.requiresImmediatePromotion ? (
                            <span className="text-rose-400">urgent exposure</span>
                          ) : null}
                          {!draft.promotable ? <span className="text-slate-500">non-promotable</span> : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy || !draft.promotable || promoteBusy || denyBusy}
                            onClick={() => void handlePromote(draft.filename, slug)}
                            className="rounded-md bg-cyan-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
                          >
                            {busy ? "Working…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={
                              busy ||
                              promoteBusy ||
                              denyBusy ||
                              deskReviewBusyFile === draft.filename
                            }
                            onClick={() => void handleGfDeskReview(draft.filename)}
                            className="rounded-md border border-cyan-800/80 bg-cyan-950/40 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:border-cyan-500 disabled:opacity-50"
                          >
                            {deskReviewBusyFile === draft.filename ? "Desk…" : "Run GF desk"}
                          </button>
                          <button
                            type="button"
                            disabled={busy || promoteBusy || denyBusy}
                            onClick={() => void handleDenyDraft(draft.filename)}
                            className="rounded-md border border-rose-800/80 bg-rose-950/40 px-3 py-1.5 text-xs font-medium text-rose-200 hover:border-rose-600 disabled:opacity-50"
                          >
                            Deny
                          </button>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>
            <section className="space-y-6">
              <div className="rounded-xl border border-cyan-900/50 bg-slate-900/60 p-5">
                <h2 className="text-lg font-semibold text-white">
                  Governance Frame publication desk
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Runs gf-researcher → editor → verifier → regulatory → product-boundary →
                  gf-operator. Stages quarantine drafts and advisory{" "}
                  <span className="font-mono text-slate-300">.desk-reviews</span> only. Human
                  Approve remains required — desk agents never promote.
                </p>
                <label className="mt-4 block text-xs text-slate-400">
                  Title
                  <input
                    value={deskTitle}
                    onChange={(e) => setDeskTitle(e.target.value)}
                    placeholder="e.g. Evidence defensibility after the AI Act"
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  />
                </label>
                <label className="mt-3 block text-xs text-slate-400">
                  Research brief
                  <textarea
                    value={deskPrompt}
                    onChange={(e) => setDeskPrompt(e.target.value)}
                    rows={6}
                    placeholder="Define the governance question, jurisdictions, and primary sources to pursue (quarantine only)…"
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  />
                </label>
                <button
                  type="button"
                  disabled={deskBusy || deskPrompt.trim().length < 40}
                  onClick={() => void handleGfDeskAuthor()}
                  className="mt-3 rounded-lg bg-cyan-800 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {deskBusy ? "Desk running…" : "Author with GF desk & stage"}
                </button>
                {deskMessage ? (
                  <p className="mt-3 text-sm text-slate-300">{deskMessage}</p>
                ) : null}
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="text-lg font-semibold text-white">Request series (queue only)</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Submit a Governance Frame series prompt. Authorship stages drafts into{" "}
                  <span className="font-mono text-slate-300">docs/briefing-queue/</span> for your
                  review — this does not promote or syndicate. Use board-bot/CFO-style narrative
                  (not the Level 2 Writer).
                </p>
                <label className="mt-4 block text-xs text-slate-400">
                  Series request
                  <textarea
                    value={requestPrompt}
                    onChange={(e) => setRequestPrompt(e.target.value)}
                    rows={8}
                    placeholder="Draft a public Governance Frame briefing series (quarantine only) titled…"
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  />
                </label>
                <button
                  type="button"
                  disabled={requestBusy || requestPrompt.trim().length < 40}
                  onClick={() => void handleBriefingRequest()}
                  className="mt-3 rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
                >
                  {requestBusy ? "Generating & staging…" : "Generate & stage for review"}
                </button>
                {requestMessage ? (
                  <p className="mt-3 text-sm text-slate-300">{requestMessage}</p>
                ) : null}
              </div>
              <div
                id="briefings-promote-panel"
                ref={promotePanelRef}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
              >
                <h2 className="text-lg font-semibold text-white">Promote (approve) or deny</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Approve publishes to Governance Frame (+ optional syndication). Deny removes the draft from
                  the desk and records a denial — it never publishes.
                </p>
                <div className="mt-4 space-y-3">
                  <label className="block text-xs text-slate-400">
                    Queue filename
                    <input
                      value={promoteFile}
                      onChange={(e) => setPromoteFile(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>
                  <label className="block text-xs text-slate-400">
                    Published slug
                    <input
                      value={promoteSlug}
                      onChange={(e) => setPromoteSlug(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={promoteBusy || denyBusy || !promoteFile || !promoteSlug}
                      onClick={() => void handlePromote()}
                      className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
                    >
                      {promoteBusy ? "Promoting…" : "Approve / promote & syndicate"}
                    </button>
                    <button
                      type="button"
                      disabled={promoteBusy || denyBusy || !promoteFile}
                      onClick={() => void handleDenyDraft(promoteFile)}
                      className="rounded-lg border border-rose-800/80 bg-rose-950/50 px-4 py-2 text-sm font-medium text-rose-100 hover:border-rose-600 disabled:opacity-50"
                    >
                      {denyBusy ? "Denying…" : "Deny"}
                    </button>
                  </div>
                  {promoteMessage ? (
                    <p className="text-sm text-slate-300">{promoteMessage}</p>
                  ) : null}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="text-lg font-semibold text-white">Published briefings</h2>
                <ul className="mt-4 space-y-2">
                  {snapshot.briefings.published.map((briefing) => (
                    <li key={briefing.slug} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-200">{briefing.title}</span>
                      <Link
                        href={`/governance-frame/${briefing.slug}`}
                        className="text-xs text-cyan-300 hover:underline"
                      >
                        View public
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        ) : null}

        {snapshot && tab === "newsletters" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="text-lg font-semibold text-white">Drafts awaiting Approve / Deny</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Ironcast newsletter drafts and market series (e.g. Control-first GRC Parts 1–3) wait here.
                  Approve promotes to Governance Frame; Deny discards without publishing. Syndicate compiled
                  HTML only after Approve.
                </p>
                {decisionMessage ? (
                  <p className="mt-2 text-sm text-slate-300">{decisionMessage}</p>
                ) : null}
                <ul className="mt-4 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
                  {newsletterQueueDrafts.length === 0 ? (
                    <li className="text-sm text-slate-500">
                      No newsletter drafts awaiting review. Look for{" "}
                      <span className="font-mono text-slate-400">*-draft-market-grc-*</span> or{" "}
                      <span className="font-mono text-slate-400">*-draft-auto-newsletter-*</span>.
                    </li>
                  ) : (
                    newsletterQueueDrafts.map((draft) => {
                      const busy = decisionBusyFile === draft.filename;
                      const slug = slugFromQueueFilename(draft.filename);
                      const focused = focusedDraft === draft.filename;
                      return (
                        <li
                          id={`queue-draft-${draft.filename}`}
                          key={draft.filename}
                          className={`rounded-lg border p-3 text-sm ${
                            focused
                              ? "border-cyan-500 bg-cyan-950/30 ring-1 ring-cyan-500/40"
                              : "border-slate-800 bg-slate-950/50"
                          }`}
                        >
                          <div className="font-medium text-slate-100">{draft.title}</div>
                          <div className="font-mono text-[10px] text-slate-500">{draft.filename}</div>
                          {draft.summary ? (
                            <p className="mt-2 text-xs text-slate-400">{draft.summary}</p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest">
                            <span className={draft.validationOk ? "text-emerald-400" : "text-amber-400"}>
                              {draft.validationOk ? "validation ok" : "needs review"}
                            </span>
                            {/auto-newsletter/i.test(draft.filename) ? (
                              <span className="text-violet-300">autonomous</span>
                            ) : null}
                            {/market-grc|draft-market/i.test(draft.filename) ? (
                              <span className="text-cyan-300">market series</span>
                            ) : null}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy || !draft.promotable || promoteBusy || denyBusy}
                              onClick={() => void handlePromote(draft.filename, slug)}
                              className="rounded-md bg-cyan-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
                            >
                              {busy ? "Working…" : "Approve"}
                            </button>
                            <button
                              type="button"
                              disabled={busy || promoteBusy || denyBusy}
                              onClick={() => void handleDenyDraft(draft.filename)}
                              className="rounded-md border border-rose-800/80 bg-rose-950/40 px-3 py-1.5 text-xs font-medium text-rose-200 hover:border-rose-600 disabled:opacity-50"
                            >
                              Deny
                            </button>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="text-lg font-semibold text-white">Request series (queue only)</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Submit an Ironcast newsletter series prompt. Authorship stages drafts into{" "}
                  <span className="font-mono text-slate-300">docs/briefing-queue/</span> for your
                  review — this does not promote or compile email HTML. Approve from this tab or Briefings,
                  then syndicate here.
                </p>
                <label className="mt-4 block text-xs text-slate-400">
                  Newsletter series request
                  <textarea
                    value={newsletterRequestPrompt}
                    onChange={(e) => setNewsletterRequestPrompt(e.target.value)}
                    rows={8}
                    placeholder="Draft a public Ironcast newsletter series (quarantine only) telling the Ironframe creation story by pillar—value and intent, no implementation…"
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  />
                </label>
                <button
                  type="button"
                  disabled={newsletterRequestBusy || newsletterRequestPrompt.trim().length < 40}
                  onClick={() => void handleNewsletterRequest()}
                  className="mt-3 rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
                >
                  {newsletterRequestBusy ? "Generating & staging…" : "Generate & stage for review"}
                </button>
                {newsletterRequestMessage ? (
                  <p className="mt-3 text-sm text-slate-300">{newsletterRequestMessage}</p>
                ) : null}
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="text-lg font-semibold text-white">Ironcast syndication</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Compile published Governance Frame briefings into presentation-safe HTML for corporate
                  Substack / Ironcast routing, and refresh the public RSS feed.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">Compiled HTML</div>
                    <div className="mt-1 text-2xl font-bold text-cyan-300">
                      {snapshot.newsletters.compiledCount}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">Pending syndication</div>
                    <div className="mt-1 text-2xl font-bold text-amber-300">
                      {snapshot.newsletters.pendingSyndicationCount}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <a
                    href={snapshot.newsletters.rssFeedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-300 hover:underline"
                  >
                    Public RSS feed
                    {snapshot.newsletters.rssItemCount != null
                      ? ` (${snapshot.newsletters.rssItemCount} items)`
                      : ""}
                  </a>
                  <Link href="/governance-frame" className="text-cyan-300 hover:underline">
                    Governance Frame reader
                  </Link>
                  <Link href="/dashboard/operations?tab=briefings" className="text-cyan-300 hover:underline">
                    Review / promote queue
                  </Link>
                </div>
                <div className="mt-5 space-y-3">
                  <label className="block text-xs text-slate-400">
                    Re-syndicate published slug
                    <input
                      value={syndicateSlug}
                      onChange={(e) => setSyndicateSlug(e.target.value)}
                      placeholder="e.g. 2026-06-07-staging-boundary-check"
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={syndicateBusy || !syndicateSlug.trim()}
                    onClick={() => void handleSyndicate(syndicateSlug)}
                    className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
                  >
                    {syndicateBusy ? "Compiling…" : "Compile RSS + newsletter HTML"}
                  </button>
                  {syndicateMessage ? (
                    <p className="text-sm text-slate-300">{syndicateMessage}</p>
                  ) : null}
                </div>
              </div>
            </section>
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold text-white">Published editions</h2>
              <ul className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                {snapshot.newsletters.editions.length === 0 ? (
                  <li className="text-sm text-slate-500">
                    No published editions yet — request a newsletter series above, promote from Briefings,
                    then syndicate.
                  </li>
                ) : (
                  snapshot.newsletters.editions.map((edition) => (
                    <li
                      key={edition.slug}
                      className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-slate-100">{edition.title}</div>
                          <div className="font-mono text-[10px] text-slate-500">{edition.slug}</div>
                        </div>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-widest ${
                            edition.syndicated ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {edition.syndicated ? "syndicated" : "pending"}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        <Link
                          href={`/governance-frame/${edition.slug}`}
                          className="text-cyan-300 hover:underline"
                        >
                          View public
                        </Link>
                        {!edition.syndicated ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSyndicateSlug(edition.slug);
                              void handleSyndicate(edition.slug);
                            }}
                            className="text-cyan-300 hover:underline"
                          >
                            Syndicate now
                          </button>
                        ) : edition.htmlModifiedAt ? (
                          <span className="text-slate-500">
                            HTML {new Date(edition.htmlModifiedAt).toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
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
                <WorkforceFleetList workforce={snapshot.workforce} />
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
