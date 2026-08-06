"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  isNewslettersDeskDraft,
  isResearchDeskDraft,
  isStrictNewsletterQueueDraft,
  parsePublishingDeskTab,
  publishingDeskHref,
  publishingDeskTabForQueueDraft,
  PUBLISHING_LINKEDIN_CADENCE_HREF,
  PUBLISHING_LINKEDIN_DRAFTS_HREF,
  PUBLISHING_VIDEO_NARRATIVE_LINKS,
  PUBLISHING_VIDEOS_PAGE_HREF,
  type PublishingDeskTab,
} from "@/app/lib/governanceFrame/publishingDeskDraftKind";
import type { OperationsHubSnapshot } from "@/app/lib/server/operationsHubCore";
import { fetchOpsPortalJson } from "@/app/utils/fetchOpsPortalJson";

type DeskTab = PublishingDeskTab;

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
      <span className={deskReview.readyForHumanOperator ? "text-emerald-400" : "text-amber-300"}>
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

export default function PublishingDeskClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [desk, setDesk] = useState<DeskTab>(() => {
    const fromParam = parsePublishingDeskTab(searchParams.get("desk"));
    const draft = searchParams.get("draft")?.trim();
    return draft ? publishingDeskTabForQueueDraft(draft) : fromParam;
  });
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
  const [draftReaderOpen, setDraftReaderOpen] = useState(false);
  const [draftReaderFilename, setDraftReaderFilename] = useState<string | null>(null);
  const [draftReaderTitle, setDraftReaderTitle] = useState<string | null>(null);
  const [draftReaderMarkdown, setDraftReaderMarkdown] = useState<string | null>(null);
  const [draftReaderValidationOk, setDraftReaderValidationOk] = useState<boolean | null>(null);
  const [draftReaderLoading, setDraftReaderLoading] = useState(false);
  const [draftReaderError, setDraftReaderError] = useState<string | null>(null);
  const [linkedinTitle, setLinkedinTitle] = useState("");
  const [linkedinBody, setLinkedinBody] = useState("");
  const [linkedinUpdatedAt, setLinkedinUpdatedAt] = useState<string | null>(null);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [linkedinSaving, setLinkedinSaving] = useState(false);
  const [linkedinMessage, setLinkedinMessage] = useState<string | null>(null);
  const [linkedinError, setLinkedinError] = useState<string | null>(null);
  const promoteDefaultsSet = useRef(false);
  const promotePanelRef = useRef<HTMLDivElement | null>(null);
  const autoOpenedDraftRef = useRef<string | null>(null);
  const linkedinLoadedRef = useRef(false);

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
      setSyndicateSlug(slug);
      setPromoteMessage(`Selected ${file} for promote / deny.`);
      setDecisionMessage(null);

      const targetDesk = publishingDeskTabForQueueDraft(file);
      const params = new URLSearchParams(searchParams.toString());
      params.set("desk", targetDesk);
      params.set("draft", file);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });

      if (options?.scrollPromote !== false) {
        window.requestAnimationFrame(() => {
          if (targetDesk === "briefings" || targetDesk === "research") {
            promotePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            return;
          }
          document
            .getElementById("newsletters-syndicate-panel")
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      }
    },
    [pathname, router, searchParams, slugFromQueueFilename],
  );

  useEffect(() => {
    const draft = searchParams.get("draft")?.trim();
    if (draft) {
      const targetDesk = publishingDeskTabForQueueDraft(draft);
      setDesk(targetDesk);
      const currentDesk = searchParams.get("desk");
      if (currentDesk !== targetDesk) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("desk", targetDesk);
        params.set("draft", draft);
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      }
      return;
    }
    setDesk(parsePublishingDeskTab(searchParams.get("desk")));
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!focusedDraft || loading) return;
    const el = document.getElementById(`queue-draft-${focusedDraft}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedDraft, loading, desk, snapshot]);

  const closeDraftReader = useCallback(() => {
    setDraftReaderOpen(false);
    setDraftReaderFilename(null);
    setDraftReaderTitle(null);
    setDraftReaderMarkdown(null);
    setDraftReaderValidationOk(null);
    setDraftReaderLoading(false);
    setDraftReaderError(null);
  }, []);

  const openDraftReader = useCallback(
    async (filename: string, options?: { select?: boolean }) => {
      const file = filename.trim();
      if (!file) return;
      if (options?.select !== false) {
        selectQueueDraft(file, { scrollPromote: false });
      }
      setDraftReaderOpen(true);
      setDraftReaderFilename(file);
      setDraftReaderTitle(null);
      setDraftReaderMarkdown(null);
      setDraftReaderValidationOk(null);
      setDraftReaderError(null);
      setDraftReaderLoading(true);
      try {
        const data = await fetchOpsPortalJson<{
          ok?: boolean;
          filename?: string;
          title?: string;
          markdown?: string;
          validationOk?: boolean;
        }>(
          `/api/admin/operations-hub/briefings/draft?filename=${encodeURIComponent(file)}`,
          { cache: "no-store" },
          "Failed to load draft.",
        );
        setDraftReaderFilename(data.filename ?? file);
        setDraftReaderTitle(data.title ?? file);
        setDraftReaderMarkdown(data.markdown ?? "");
        setDraftReaderValidationOk(data.validationOk ?? null);
      } catch (err) {
        setDraftReaderError(err instanceof Error ? err.message : "Failed to load draft.");
      } finally {
        setDraftReaderLoading(false);
      }
    },
    [selectQueueDraft],
  );

  useEffect(() => {
    if (!focusedDraft || loading || !snapshot) return;
    const inQueue = snapshot.briefings.queueDrafts.some((d) => d.filename === focusedDraft);
    if (!inQueue) return;
    if (autoOpenedDraftRef.current === focusedDraft) return;
    autoOpenedDraftRef.current = focusedDraft;
    void openDraftReader(focusedDraft, { select: false });
  }, [focusedDraft, loading, snapshot, openDraftReader]);

  useEffect(() => {
    if (!draftReaderOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDraftReader();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [draftReaderOpen, closeDraftReader]);

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

  const loadLinkedinDraft = useCallback(async (opts?: { seedSuggested?: boolean }) => {
    setLinkedinLoading(true);
    setLinkedinError(null);
    try {
      const qs = opts?.seedSuggested ? "?seed=suggested" : "";
      const data = await fetchOpsPortalJson<{
        title?: string;
        body?: string;
        updatedAt?: string | null;
        source?: string;
      }>(
        `/api/admin/operations-hub/linkedin/draft${qs}`,
        undefined,
        "Failed to load LinkedIn draft.",
      );
      setLinkedinTitle(data.title ?? "");
      setLinkedinBody(data.body ?? "");
      setLinkedinUpdatedAt(data.updatedAt ?? null);
      setLinkedinMessage(
        data.source === "suggested" || data.source === "seeded"
          ? "Loaded suggested heatmap draft — edit title/body, then Save."
          : null,
      );
      linkedinLoadedRef.current = true;
    } catch (err) {
      setLinkedinError(err instanceof Error ? err.message : "Failed to load LinkedIn draft.");
    } finally {
      setLinkedinLoading(false);
    }
  }, []);

  useEffect(() => {
    if (desk !== "linkedin") return;
    if (linkedinLoadedRef.current && linkedinBody.length > 0) return;
    void loadLinkedinDraft({ seedSuggested: true });
  }, [desk, loadLinkedinDraft, linkedinBody.length]);

  const handleSaveLinkedinDraft = async () => {
    if (linkedinSaving || linkedinBody.trim().length < 40) return;
    setLinkedinSaving(true);
    setLinkedinMessage(null);
    setLinkedinError(null);
    try {
      const data = await fetchOpsPortalJson<{
        title?: string;
        body?: string;
        updatedAt?: string | null;
        message?: string;
      }>(
        "/api/admin/operations-hub/linkedin/draft",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: linkedinTitle, body: linkedinBody }),
        },
        "Failed to save LinkedIn draft.",
      );
      setLinkedinTitle(data.title ?? linkedinTitle);
      setLinkedinBody(data.body ?? linkedinBody);
      setLinkedinUpdatedAt(data.updatedAt ?? null);
      setLinkedinMessage(data.message ?? "Saved.");
    } catch (err) {
      setLinkedinError(err instanceof Error ? err.message : "Failed to save LinkedIn draft.");
    } finally {
      setLinkedinSaving(false);
    }
  };

  const handleCopyLinkedinDraft = async () => {
    try {
      await navigator.clipboard.writeText(linkedinBody);
      setLinkedinMessage("Copied post body — paste into LinkedIn (Wil).");
      setLinkedinError(null);
    } catch {
      setLinkedinError("Clipboard copy failed — select the body and copy manually.");
    }
  };

  const newsletterQueueDrafts = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.briefings.queueDrafts.filter(
      (draft) => draft.promotable && isNewslettersDeskDraft(draft.filename),
    );
  }, [snapshot]);

  const researchQueueDrafts = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.briefings.queueDrafts.filter((draft) =>
      isResearchDeskDraft(draft.filename),
    );
  }, [snapshot]);

  /** Briefings desk: exclude Ironcast newsletters and research-paper queue drafts. */
  const briefingQueueDrafts = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.briefings.queueDrafts.filter(
      (draft) =>
        !isStrictNewsletterQueueDraft(draft.filename) &&
        !isResearchDeskDraft(draft.filename),
    );
  }, [snapshot]);

  const activeQueueDrafts =
    desk === "research"
      ? researchQueueDrafts
      : desk === "newsletters"
        ? newsletterQueueDrafts
        : briefingQueueDrafts;

  const handlePromote = async (filenameOverride?: string, slugOverride?: string) => {
    const file = (filenameOverride ?? promoteFile).trim();
    const slug = (slugOverride ?? promoteSlug).trim();
    if (!file || !slug || promoteBusy || decisionBusyFile) return;
    if (filenameOverride) setDecisionBusyFile(file);
    else setPromoteBusy(true);
    setPromoteMessage(null);
    setDecisionMessage(null);
    try {
      const data = await fetchOpsPortalJson<{
        ok?: boolean;
        slug?: string;
        message?: string;
        alreadyPublished?: boolean;
      }>(
        "/api/admin/operations-hub/briefings/promote",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file, slug }),
        },
        "Promotion failed.",
      );
      const okMsg =
        data.message?.trim() ||
        `Approved & promoted to /governance-frame/${data.slug ?? slug}${
          data.alreadyPublished ? " (already published)" : ""
        }`;
      setPromoteMessage(okMsg);
      setDecisionMessage(okMsg);
      if (draftReaderFilename === file) closeDraftReader();
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
      if (draftReaderFilename === file) closeDraftReader();
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
  const tabs: Array<{ id: DeskTab; label: string; href: string; active: boolean }> = [
    {
      id: "briefings",
      label: "Briefings",
      href: publishingDeskHref("briefings"),
      active: desk === "briefings",
    },
    {
      id: "newsletters",
      label: "Newsletters",
      href: publishingDeskHref("newsletters"),
      active: desk === "newsletters",
    },
    {
      id: "research",
      label: "Research papers",
      href: publishingDeskHref("research"),
      active: desk === "research",
    },
    {
      id: "video",
      label: "Video",
      href: publishingDeskHref("video"),
      active: desk === "video",
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      href: publishingDeskHref("linkedin"),
      active: desk === "linkedin",
    },
  ];

  const isBriefingsOrResearchDesk = desk === "briefings" || desk === "research";
  const isDocsOnlyDesk = desk === "video" || desk === "linkedin";

  return (
    <div className="min-h-screen bg-[#020617] p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
              Ironframe internal · GLOBAL_ADMIN or BUSINESS_ADMIN · not tenant-facing
            </p>
            <h1 className="text-2xl font-bold text-white">Publishing Desk</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Quarantine → Approve → syndicate for Governance Frame and Ironcast. Human review remains required
              before anything publishes.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <button
              type="button"
              disabled={loading}
              onClick={() => void loadSnapshot()}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-cyan-600 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? "Refreshing…" : "Refresh desk"}
            </button>
            {refreshedAt ? <p className="font-mono text-[10px] text-slate-500">Updated {refreshedAt}</p> : null}
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-2">
            {tabs.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  item.active
                    ? "bg-cyan-900/50 text-cyan-100 ring-1 ring-cyan-700"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex gap-3 text-sm">
            <Link href="/dashboard/operations" className="text-cyan-300 hover:underline">← Today</Link>
            <Link href="/dashboard/operations?tab=calendar" className="text-cyan-300 hover:underline">Calendar</Link>
          </div>
        </div>

        {error ? <div className="rounded-xl border border-rose-900/50 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</div> : null}
        {loading && !snapshot && !isDocsOnlyDesk ? <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">Loading publishing snapshot…</div> : null}

        {desk === "linkedin" ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section className="rounded-xl border border-cyan-900/50 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold text-white">LinkedIn publication desk</h2>
              <p className="mt-1 text-sm text-slate-400">
                Same workbench pattern as Governance Frame (title + draft). This never promotes to
                research.ironframegrc.com. When ready: Copy body → paste into LinkedIn (Wil →
                optional company amplify).
              </p>
              {linkedinUpdatedAt ? (
                <p className="mt-3 font-mono text-[10px] text-slate-500">
                  Last saved {new Date(linkedinUpdatedAt).toLocaleString()}
                </p>
              ) : null}
              <label className="mt-4 block text-xs text-slate-400">
                Title
                <input
                  value={linkedinTitle}
                  onChange={(e) => setLinkedinTitle(e.target.value)}
                  disabled={linkedinLoading}
                  placeholder="e.g. LinkedIn Mon — Heatmap theater vs dollar-risk clarity"
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="mt-3 block text-xs text-slate-400">
                Post body (paste into LinkedIn)
                <textarea
                  value={linkedinBody}
                  onChange={(e) => setLinkedinBody(e.target.value)}
                  rows={18}
                  disabled={linkedinLoading}
                  placeholder="Loading LinkedIn draft…"
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm leading-relaxed text-slate-100"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={linkedinSaving || linkedinLoading || linkedinBody.trim().length < 40}
                  onClick={() => void handleSaveLinkedinDraft()}
                  className="rounded-lg bg-cyan-800 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {linkedinSaving ? "Saving…" : "Save draft"}
                </button>
                <button
                  type="button"
                  disabled={linkedinLoading || linkedinBody.trim().length < 1}
                  onClick={() => void handleCopyLinkedinDraft()}
                  className="rounded-lg border border-slate-600 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-100 hover:border-cyan-700 disabled:opacity-50"
                >
                  Copy body
                </button>
                <button
                  type="button"
                  disabled={linkedinLoading || linkedinSaving}
                  onClick={() => {
                    linkedinLoadedRef.current = false;
                    void loadLinkedinDraft({ seedSuggested: true });
                  }}
                  className="rounded-lg border border-violet-800/80 bg-violet-950/40 px-4 py-2 text-sm font-medium text-violet-100 hover:border-violet-500 disabled:opacity-50"
                >
                  {linkedinLoading ? "Loading…" : "Load suggested draft"}
                </button>
              </div>
              {linkedinMessage ? (
                <p className="mt-3 text-sm text-emerald-300">{linkedinMessage}</p>
              ) : null}
              {linkedinError ? (
                <p className="mt-3 text-sm text-rose-300">{linkedinError}</p>
              ) : null}
            </section>
            <section className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="text-lg font-semibold text-white">How to publish</h2>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
                  <li>Confirm the Title header, then edit the post body if needed.</li>
                  <li>Save draft (writes APP_DOCS so the docs reader stays in sync).</li>
                  <li>Copy body → paste into LinkedIn from Wil’s profile.</li>
                  <li>Mark the Ops Calendar card Done with the post URL.</li>
                </ol>
                <p className="mt-4 text-sm text-slate-400">
                  Not GF quarantine. No Approve / Deny / promote on this desk.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="text-lg font-semibold text-white">Cadence &amp; calendar</h2>
                <ul className="mt-4 space-y-2">
                  <li>
                    <Link
                      href={PUBLISHING_LINKEDIN_CADENCE_HREF}
                      className="block rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 hover:border-cyan-700/60 hover:text-cyan-100"
                    >
                      Founder LinkedIn cadence
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/operations?tab=calendar"
                      className="block rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 hover:border-cyan-700/60 hover:text-cyan-100"
                    >
                      Ops Calendar
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={PUBLISHING_LINKEDIN_DRAFTS_HREF}
                      className="block rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 hover:border-cyan-700/60 hover:text-cyan-100"
                    >
                      Docs reader (after Save)
                    </Link>
                  </li>
                </ul>
              </div>
            </section>
          </div>
        ) : null}

        {desk === "video" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold text-white">Video campaign</h2>
              <p className="mt-1 text-sm text-slate-400">
                When Risk Enters the Room — same desk chrome as Briefings / Newsletters / Research
                papers. Open the campaign hub for the plan and narrative index.
              </p>
              <Link
                href={PUBLISHING_VIDEOS_PAGE_HREF}
                className="mt-5 inline-flex items-center rounded-lg bg-cyan-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-700"
              >
                Open Videos hub
              </Link>
              <p className="mt-3 font-mono text-[10px] text-slate-500">
                {PUBLISHING_VIDEOS_PAGE_HREF}
              </p>
              <p className="mt-4 text-sm text-slate-400">
                Hub URL:{" "}
                <a
                  href="https://ironframegrc.com/docs/marketing-strategy/video-series/when-risk-enters-the-room"
                  className="text-cyan-300 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  ironframegrc.com/docs/…/when-risk-enters-the-room
                </a>
              </p>
            </section>
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold text-white">Narratives in this folder</h2>
              <p className="mt-1 text-sm text-slate-400">
                Full episode scripts, persona vignettes, and Evidence Breaks scenes — each file under{" "}
                <span className="font-mono text-slate-300">docs/marketing-strategy/video-series/</span>.
              </p>
              <div className="mt-4 max-h-[36rem] space-y-5 overflow-y-auto pr-1">
                {PUBLISHING_VIDEO_NARRATIVE_LINKS.map((group) => (
                  <div key={group.group}>
                    <h3 className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
                      {group.group}
                    </h3>
                    <ul className="mt-2 space-y-1.5">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="block rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 hover:border-cyan-700/60 hover:text-cyan-100"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {snapshot && isBriefingsOrResearchDesk ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold text-white">
                {desk === "research" ? "Research paper drafts" : "Quarantined drafts"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {desk === "research" ? (
                  <>
                    Industry research queue files (
                    <span className="font-mono text-slate-300">*-draft-research-*</span>
                    ). Use <span className="text-slate-300">Read</span> for the full manuscript.
                    Nothing publishes until you Approve (promote) or Deny.
                  </>
                ) : (
                  <>
                    Weekday autonomous GTM cron and manual requests stage here only. Use{" "}
                    <span className="text-slate-300">Read</span> for the full manuscript. Nothing publishes
                    until you Approve (promote) or Deny. Research paper drafts live under{" "}
                    <Link
                      href={publishingDeskHref("research")}
                      className="text-cyan-300 hover:underline"
                    >
                      Research papers
                    </Link>
                    .
                  </>
                )}
              </p>
              {decisionMessage ? (
                <p
                  className={`mt-2 text-sm ${
                    /fail|block|error|invalid|denied/i.test(decisionMessage)
                      ? "text-rose-300"
                      : "text-emerald-200"
                  }`}
                >
                  {decisionMessage}
                </p>
              ) : null}
              <ul className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                {activeQueueDrafts.length === 0 ? (
                  <li className="text-sm text-slate-500">
                    {desk === "research" ? (
                      <>
                        No research drafts awaiting review. Look for{" "}
                        <span className="font-mono text-slate-400">*-draft-research-*</span>.
                      </>
                    ) : (
                      <>
                        No briefing drafts awaiting review. Autonomous weekday runs land as{" "}
                        <span className="font-mono text-slate-400">*-draft-auto-briefing-*</span>.
                      </>
                    )}
                  </li>
                ) : (
                  activeQueueDrafts.map((draft) => {
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
                          {isResearchDeskDraft(draft.filename) ? (
                            <span className="text-teal-300">research</span>
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
                            disabled={busy || draftReaderLoading}
                            onClick={() => void openDraftReader(draft.filename)}
                            className="rounded-md border border-slate-600 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-cyan-600 disabled:opacity-50"
                          >
                            Read
                          </button>
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
              {desk === "briefings" ? (
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
              ) : null}
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
                <h2 className="text-lg font-semibold text-white">
                  {desk === "research" ? "Published research briefs" : "Published briefings"}
                </h2>
                {desk === "research" ? (
                  <p className="mt-1 text-sm text-slate-400">
                    Live on{" "}
                    <a
                      href="https://research.ironframegrc.com/research-papers"
                      className="text-cyan-300 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      research.ironframegrc.com/research-papers
                    </a>
                    .
                  </p>
                ) : null}
                <ul className="mt-4 space-y-2">
                  {(desk === "research"
                    ? snapshot.briefings.published.filter((row) =>
                        /^Industry Research Brief\b/i.test(row.title),
                      )
                    : snapshot.briefings.published.filter(
                        (row) => !/^Industry Research Brief\b/i.test(row.title),
                      )
                  ).map((briefing) => (
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

        {snapshot && desk === "newsletters" ? (
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
                              <div className="font-mono text-[10px] text-slate-500">
                                {draft.filename}
                              </div>
                              {draft.summary ? (
                                <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                                  {draft.summary}
                                </p>
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
                              disabled={busy || draftReaderLoading}
                              onClick={() => void openDraftReader(draft.filename)}
                              className="rounded-md border border-slate-600 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-cyan-600 disabled:opacity-50"
                            >
                              Read
                            </button>
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
              <div
                id="newsletters-syndicate-panel"
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
              >
                <h2 className="text-lg font-semibold text-white">Ironcast syndication</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Compile published Governance Frame briefings into presentation-safe HTML for corporate
                  Substack / Ironcast routing, and refresh the public RSS feed. Use{" "}
                  <span className="text-slate-300">Select</span> on a draft to load its slug here after
                  Approve.
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
                  <Link href="/dashboard/operations/publishing?desk=briefings" className="text-cyan-300 hover:underline">
                    Briefings queue
                  </Link>
                  <Link href="/dashboard/operations/publishing?desk=research" className="text-cyan-300 hover:underline">
                    Research papers queue
                  </Link>
                  <Link href="/dashboard/operations/publishing?desk=video" className="text-cyan-300 hover:underline">
                    Video desk
                  </Link>
                  <Link href="/dashboard/operations/publishing?desk=linkedin" className="text-cyan-300 hover:underline">
                    LinkedIn drafts
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
      </div>

      {draftReaderOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-6"
          role="presentation"
          onClick={closeDraftReader}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="publishing-draft-reader-title"
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
                  Quarantined draft
                </p>
                <h2
                  id="publishing-draft-reader-title"
                  className="mt-1 truncate text-lg font-semibold text-white"
                >
                  {draftReaderTitle ?? draftReaderFilename ?? "Draft"}
                </h2>
                {draftReaderFilename ? (
                  <p className="mt-1 truncate font-mono text-[10px] text-slate-500">
                    {draftReaderFilename}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeDraftReader}
                className="shrink-0 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-cyan-600"
              >
                Close
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-4 py-2 sm:px-5">
              {draftReaderValidationOk == null ? null : (
                <span
                  className={`text-[10px] uppercase tracking-widest ${
                    draftReaderValidationOk ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {draftReaderValidationOk ? "validation ok" : "needs review"}
                </span>
              )}
              <span className="text-[10px] uppercase tracking-widest text-slate-500">
                Full markdown · Escape to close
              </span>
            </div>

            {decisionMessage ? (
              <div
                className={`border-b px-4 py-2 text-sm sm:px-5 ${
                  /fail|block|error|invalid|denied/i.test(decisionMessage)
                    ? "border-rose-900/60 bg-rose-950/40 text-rose-200"
                    : "border-emerald-900/50 bg-emerald-950/30 text-emerald-200"
                }`}
              >
                {decisionMessage}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {draftReaderLoading ? (
                <p className="text-sm text-slate-400">Loading draft…</p>
              ) : null}
              {draftReaderError ? (
                <p className="text-sm text-rose-300">{draftReaderError}</p>
              ) : null}
              {!draftReaderLoading && !draftReaderError && draftReaderMarkdown != null ? (
                <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-200">
                  {draftReaderMarkdown}
                </pre>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-slate-800 px-4 py-3 sm:px-5">
              <button
                type="button"
                disabled={
                  !draftReaderFilename ||
                  decisionBusyFile === draftReaderFilename ||
                  promoteBusy ||
                  denyBusy ||
                  draftReaderLoading
                }
                onClick={() => {
                  if (!draftReaderFilename) return;
                  void handlePromote(
                    draftReaderFilename,
                    slugFromQueueFilename(draftReaderFilename),
                  );
                }}
                className="rounded-md bg-cyan-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={
                  !draftReaderFilename ||
                  decisionBusyFile === draftReaderFilename ||
                  promoteBusy ||
                  denyBusy ||
                  draftReaderLoading
                }
                onClick={() => {
                  if (!draftReaderFilename) return;
                  void handleDenyDraft(draftReaderFilename);
                }}
                className="rounded-md border border-rose-800/80 bg-rose-950/40 px-3 py-1.5 text-xs font-medium text-rose-200 hover:border-rose-600 disabled:opacity-50"
              >
                Deny
              </button>
              <button
                type="button"
                onClick={closeDraftReader}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-cyan-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
