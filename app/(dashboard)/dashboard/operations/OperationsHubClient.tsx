"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { OperationsHubSnapshot, WorkforceServiceStatus } from "@/app/lib/server/operationsHubCore";
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
  const [syndicateSlug, setSyndicateSlug] = useState("");
  const [syndicateBusy, setSyndicateBusy] = useState(false);
  const [syndicateMessage, setSyndicateMessage] = useState<string | null>(null);
  const promoteDefaultsSet = useRef(false);

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

  const handlePromote = async () => {
    if (!promoteFile.trim() || !promoteSlug.trim() || promoteBusy) return;
    setPromoteBusy(true);
    setPromoteMessage(null);
    try {
      const data = await fetchOpsPortalJson<{ ok?: boolean; slug?: string }>(
        "/api/admin/operations-hub/briefings/promote",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: promoteFile.trim(), slug: promoteSlug.trim() }),
        },
        "Promotion failed.",
      );
      setPromoteMessage(`Promoted to /governance-frame/${data.slug ?? promoteSlug}`);
      await loadSnapshot();
    } catch (err) {
      setPromoteMessage(err instanceof Error ? err.message : "Promotion failed.");
    } finally {
      setPromoteBusy(false);
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
          <button
            type="button"
            onClick={() => void loadSnapshot()}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-cyan-600"
          >
            Refresh telemetry
          </button>
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
                {snapshot.briefings.published.length} published visible
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
                Ironcast newsletters
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
                Review Section V citations, then promote to public Governance Frame + newsletter syndication.
              </p>
              <ul className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                {snapshot.briefings.queueDrafts.map((draft) => (
                  <li
                    key={draft.filename}
                    className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-100">{draft.title}</div>
                        <div className="font-mono text-[10px] text-slate-500">{draft.filename}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPromoteFile(draft.filename);
                          setPromoteSlug(
                            draft.filename.replace(/-draft-/i, "-").replace(/\.md$/i, "").toLowerCase(),
                          );
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
                      {draft.requiresImmediatePromotion ? (
                        <span className="text-rose-400">urgent exposure</span>
                      ) : null}
                      {!draft.promotable ? <span className="text-slate-500">non-promotable</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <section className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="text-lg font-semibold text-white">Promote to public</h2>
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
                  <button
                    type="button"
                    disabled={promoteBusy || !promoteFile || !promoteSlug}
                    onClick={() => void handlePromote()}
                    className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
                  >
                    {promoteBusy ? "Promoting…" : "Promote & syndicate"}
                  </button>
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
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
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
            </section>
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold text-white">Published editions</h2>
              <ul className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                {snapshot.newsletters.editions.length === 0 ? (
                  <li className="text-sm text-slate-500">
                    No published briefings yet — promote a draft from the Briefings tab first.
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
