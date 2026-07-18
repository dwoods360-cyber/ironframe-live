"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { OperationsHubSnapshot, WorkforceServiceStatus } from "@/app/lib/server/operationsHubCore";
import OpsWorkerChatPanel from "@/app/components/operations/OpsWorkerChatPanel";
import { fetchOpsPortalJson } from "@/app/utils/fetchOpsPortalJson";

type HubTab = "overview" | "workforce" | "crm" | "briefings" | "newsletters" | "teams";

const HUB_TAB_IDS: HubTab[] = [
  "overview",
  "workforce",
  "crm",
  "briefings",
  "newsletters",
  "teams",
];

function parseHubTab(raw: string | null): HubTab {
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
  const [decisionBusyFile, setDecisionBusyFile] = useState<string | null>(null);
  const [decisionMessage, setDecisionMessage] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const promoteDefaultsSet = useRef(false);

  const slugFromQueueFilename = (filename: string) =>
    filename.replace(/-draft-/i, "-").replace(/\.md$/i, "").toLowerCase();

  useEffect(() => {
    setTab(parseHubTab(searchParams.get("tab")));
  }, [searchParams]);

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
      if (!promoteDefaultsSet.current && data.briefings.queueDrafts[0]?.filename) {
        promoteDefaultsSet.current = true;
        const first = data.briefings.queueDrafts[0];
        setPromoteFile(first.filename);
        setPromoteSlug(
          first.filename.replace(/-draft-/i, "-").replace(/\.md$/i, "").toLowerCase(),
        );
      }
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

  const tabs: Array<{ id: HubTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "workforce", label: "Workforce" },
    { id: "crm", label: "CRM" },
    { id: "briefings", label: "Briefings" },
    { id: "newsletters", label: "Newsletters" },
    { id: "teams", label: "Teams" },
  ];

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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
                Review approval queue ({snapshot.approvals.total})
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
                href="/dashboard/admin/approvals"
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-cyan-200 hover:border-cyan-600"
              >
                Support approvals (SUPPORT)
              </Link>
              <Link
                href="/dashboard/operations/salesteam"
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-cyan-200 hover:border-cyan-600"
              >
                SalesTeam portal
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
                  href="/dashboard/operations/ironboard"
                  className="text-xs text-cyan-300 hover:underline"
                >
                  Open Ironboard CRM tools →
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
                      <span className="font-medium text-slate-100">{row.company}</span>
                      <span className="font-mono text-xs text-slate-400">
                        score {row.priorityScore}
                        {row.detectedTrigger ? ` · ${row.detectedTrigger}` : ""}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </section>
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
                    return (
                      <li
                        key={draft.filename}
                        className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm"
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
                            onClick={() => {
                              setPromoteFile(draft.filename);
                              setPromoteSlug(slug);
                            }}
                            className="shrink-0 text-xs text-cyan-300 hover:underline"
                          >
                            Select
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
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
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
                      return (
                        <li
                          key={draft.filename}
                          className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm"
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
                    Agent messaging approvals
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
