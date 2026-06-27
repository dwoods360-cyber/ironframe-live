"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { useTenantContext } from "@/app/context/TenantProvider";
import DocsMarkdown from "@/app/docs/[[...slug]]/DocsMarkdown";
import { syncCompanyProfileAction } from "@/app/actions/getStarted/syncCompanyProfile";
import { updateWorkspaceAleBaselineAction } from "@/app/actions/getStarted/updateWorkspaceAleBaseline";
import { getStartedStepAudioSrc } from "@/app/lib/getStartedStepAudio";
import {
  hasPlayedGetStartedWelcome,
  markGetStartedWelcomePlayed,
  resolveGetStartedWelcomeAudioSrc,
} from "@/app/lib/getStartedWelcomeAudio";
import { GET_STARTED_STEPS, type GetStartedStepId } from "@/app/lib/getStartedSteps";
import { GET_STARTED_STEP_VISUALS } from "@/app/lib/getStartedStepVisuals";
import {
  GET_STARTED_INLINE_READER_SCROLL_ID,
  normalizeGetStartedInlineDocHref,
  resolveGetStartedStepIdForDocHref,
  scrollGetStartedInlineReaderToAnchor,
  shouldInterceptGetStartedInlineDocLink,
} from "@/app/lib/getStartedInlineDocLinks";
import OperatorActivationBanner from "@/app/components/onboarding/OperatorActivationBanner";
import CommercialEntitlementHoldPanel from "@/app/components/billing/CommercialEntitlementHoldPanel";
import GetStartedOrientationFallback, {
  GET_STARTED_ORIENTATION_HASH,
  GET_STARTED_QUICKSTART_GUIDE_HREF,
} from "@/app/components/onboarding/GetStartedOrientationFallback";
import TrainerAgentSessionForm from "@/app/components/trainer/TrainerAgentSessionForm";
import { openOrientationWalkthroughWindow } from "@/app/lib/openOrientationWalkthroughWindow";
import { isDemoModeActive } from "@/app/lib/demo/demoMode";
import { isBenignRuntimeEmissionError } from "@/app/utils/safeRuntimeEmission";
import { isDemoRouteGroupPath } from "@/app/utils/grcRouteMatch";
import { useGetStartedReaderStore } from "@/app/store/getStartedReaderStore";
import {
  clearShadowPlaneForWorkspaceActivation,
  useSystemConfigStore,
} from "@/app/store/systemConfigStore";
import { dbKeyToSlugSegments } from "@/lib/appDocumentSlug";
import { resolveAbsoluteDocPath } from "@/lib/docsLinkNormalization";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";

const STORAGE_KEY = "ironframe-get-started-v1";
const DISMISS_KEY = "ironframe-get-started-dismissed";
const STEP_AUDIO_AUTOPLAY_KEY = "ironframe-get-started-step-audio-autoplay";

type StoredProgress = Record<string, boolean>;

function isDocsHref(href: string): boolean {
  return href.startsWith("/docs");
}

function isOrientationAudioUrl(url: string): boolean {
  return /\.(mp3|m4a|wav|ogg)(\?|$)/i.test(url);
}

function readProgress(): StoredProgress {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredProgress;
  } catch {
    return {};
  }
}

function writeProgress(progress: StoredProgress): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function docsHrefToSlug(href: string): string {
  const pathOnly = href.split("#")[0]?.split("?")[0] ?? href;
  return pathOnly.replace(/^\/docs\/?/i, "").replace(/\/+$/, "").toLowerCase();
}

type InlineDocPayload = {
  slug: string;
  title: string;
  content: string;
};

type GetStartedPortalClientProps = {
  initialAleBaselineCents?: string;
  initialHasPrimaryCompany?: boolean;
  initialTenantName?: string;
  initialTenantIndustry?: string;
  billingBlocked?: boolean;
  billingStatus?: string;
};

export default function GetStartedPortalClient({
  initialAleBaselineCents = "0",
  initialHasPrimaryCompany = false,
  initialTenantName = "",
  initialTenantIndustry = "",
  billingBlocked = false,
  billingStatus = "PENDING",
}: GetStartedPortalClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { tenantFetch } = useTenantContext();
  const inlineDocHref = useGetStartedReaderStore((s) => s.inlineDocHref);
  const setInlineDocHref = useGetStartedReaderStore((s) => s.setInlineDocHref);
  const clearInlineDoc = useGetStartedReaderStore((s) => s.clearInlineDoc);
  const isSimulationMode = useSystemConfigStore().isSimulationMode;
  const demoSandbox = isDemoRouteGroupPath(pathname) || isDemoModeActive();
  const [progress, setProgress] = useState<StoredProgress>({});
  const [inlineDoc, setInlineDoc] = useState<InlineDocPayload | null>(null);
  const [inlineDocLoading, setInlineDocLoading] = useState(false);
  const [inlineDocError, setInlineDocError] = useState<string | null>(null);
  const [focusedStepId, setFocusedStepId] = useState<GetStartedStepId | null>(null);
  const [stepAudioAutoplay, setStepAudioAutoplay] = useState(true);
  const [stepAudioPlaying, setStepAudioPlaying] = useState(false);
  const [welcomeAudioPlaying, setWelcomeAudioPlaying] = useState(false);
  const [welcomePhaseDone, setWelcomePhaseDone] = useState(true);
  const [aleBaselineCents, setAleBaselineCents] = useState(initialAleBaselineCents);
  const [aleDraftDollars, setAleDraftDollars] = useState("");
  const [aleSaveBusy, setAleSaveBusy] = useState(false);
  const [aleSaveError, setAleSaveError] = useState<string | null>(null);
  const [aleSaveMessage, setAleSaveMessage] = useState<string | null>(null);
  const [hasPrimaryCompany, setHasPrimaryCompany] = useState(initialHasPrimaryCompany);
  const [companyNameDraft, setCompanyNameDraft] = useState(initialTenantName);
  const [sectorDraft, setSectorDraft] = useState(initialTenantIndustry);
  const [departmentsDraft, setDepartmentsDraft] = useState("");
  const [companySaveBusy, setCompanySaveBusy] = useState(false);
  const [companySaveError, setCompanySaveError] = useState<string | null>(null);
  const [companySaveMessage, setCompanySaveMessage] = useState<string | null>(null);
  const stepAudioRef = useRef<HTMLAudioElement>(null);
  const welcomeAudioRef = useRef<HTMLAudioElement>(null);

  const welcomeAudioSrc = resolveGetStartedWelcomeAudioSrc();

  useEffect(() => {
    return () => clearInlineDoc();
  }, [clearInlineDoc]);

  useEffect(() => {
    if (searchParams.get("activation") !== "1") return;
    clearShadowPlaneForWorkspaceActivation();
    const url = new URL(window.location.href);
    url.searchParams.delete("activation");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [searchParams]);

  useEffect(() => {
    if (inlineDocHref) return;
    if (typeof window === "undefined") return;
    const hashRoot = window.location.hash.replace(/^#/, "").split(":")[0] ?? "";
    if (hashRoot === GET_STARTED_ORIENTATION_HASH || hashRoot === "quickstart") {
      const base = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, "", base);
    }
  }, [inlineDocHref]);

  const inlineReaderTopClass = useMemo(() => {
    /** Get Started hides Header #2 — overlay clears master + tenant bar only (~6.5rem). */
    const onboardingTop = "top-[6.5rem]";
    const onboardingTopSim = "top-[8.75rem]";
    if (demoSandbox && isSimulationMode) return "top-[11.75rem]";
    if (isSimulationMode) return onboardingTopSim;
    return onboardingTop;
  }, [demoSandbox, isSimulationMode]);

  const aleBaselineUnset = useMemo(() => {
    try {
      return BigInt(aleBaselineCents || "0") <= 0n;
    } catch {
      return true;
    }
  }, [aleBaselineCents]);

  const companyProfileUnset = !hasPrimaryCompany;

  const onboardingProfileComplete = !aleBaselineUnset && !companyProfileUnset;

  const saveAleBaseline = useCallback(async () => {
    if (aleSaveBusy) return;
    setAleSaveBusy(true);
    setAleSaveError(null);
    setAleSaveMessage(null);

    const withTimeout = <T,>(promise: Promise<T>, label: string) =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(
                  `${label} timed out after 90 seconds. Check the terminal running next dev for errors, then retry.`,
                ),
              ),
            90_000,
          );
        }),
      ]);

    try {
      const result = await withTimeout(
        updateWorkspaceAleBaselineAction(aleDraftDollars),
        "ALE baseline save",
      );
      if (!result.ok) {
        setAleSaveError(result.error);
        return;
      }
      setAleBaselineCents(result.aleBaselineCents);
      setAleSaveMessage(
        `ALE baseline saved at ${formatCentsToUSD(BigInt(result.aleBaselineCents))}.`,
      );
    } catch (error) {
      setAleSaveError(
        error instanceof Error ? error.message : "Could not save the ALE baseline.",
      );
    } finally {
      setAleSaveBusy(false);
    }
  }, [aleDraftDollars, aleSaveBusy]);

  const saveCompanyProfile = useCallback(async () => {
    if (companySaveBusy) return;
    setCompanySaveBusy(true);
    setCompanySaveError(null);
    setCompanySaveMessage(null);

    try {
      const result = await syncCompanyProfileAction({
        companyName: companyNameDraft,
        sector: sectorDraft,
        departmentsRaw: departmentsDraft.trim() || undefined,
      });
      if (!result.ok) {
        setCompanySaveError(result.error);
        return;
      }
      setHasPrimaryCompany(true);
      setCompanySaveMessage(
        result.created
          ? "Company profile saved. Guided onboarding is now unlocked."
          : "Company profile updated. Guided onboarding is now unlocked.",
      );
    } catch (error) {
      setCompanySaveError(
        error instanceof Error ? error.message : "Could not save the company profile.",
      );
    } finally {
      setCompanySaveBusy(false);
    }
  }, [companyNameDraft, companySaveBusy, departmentsDraft, sectorDraft]);

  useEffect(() => {
    setProgress(readProgress());
    setStepAudioAutoplay(window.localStorage.getItem(STEP_AUDIO_AUTOPLAY_KEY) !== "0");
    const welcomePending = Boolean(welcomeAudioSrc) && !hasPlayedGetStartedWelcome();
    setWelcomePhaseDone(!welcomePending);
  }, [welcomeAudioSrc]);

  const playWelcomeAudio = useCallback(async () => {
    const audio = welcomeAudioRef.current;
    if (!audio || !welcomeAudioSrc) {
      setWelcomePhaseDone(true);
      return;
    }
    const stepAudio = stepAudioRef.current;
    if (stepAudio) {
      stepAudio.pause();
      setStepAudioPlaying(false);
    }
    audio.src = welcomeAudioSrc;
    audio.load();
    try {
      await audio.play();
      setWelcomeAudioPlaying(true);
    } catch {
      setWelcomeAudioPlaying(false);
      setWelcomePhaseDone(true);
    }
  }, [welcomeAudioSrc]);

  useEffect(() => {
    if (!welcomeAudioSrc || hasPlayedGetStartedWelcome()) return;
    void playWelcomeAudio();
  }, [welcomeAudioSrc, playWelcomeAudio]);

  const openInlineGuide = useCallback((href: string, stepId?: GetStartedStepId) => {
    const resolvedStepId = stepId ?? resolveGetStartedStepIdForDocHref(href);
    if (resolvedStepId) {
      setFocusedStepId(resolvedStepId);
    }
    setInlineDocHref(href);
    if (typeof window !== "undefined") {
      const base = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, "", `${base}#${GET_STARTED_ORIENTATION_HASH}`);
    }
  }, [setInlineDocHref]);

  useEffect(() => {
    if (billingBlocked || !onboardingProfileComplete) return;
    const rawHash = window.location.hash.replace(/^#/, "");
    const hashRoot = rawHash.split(":")[0] ?? "";
    if (hashRoot === GET_STARTED_ORIENTATION_HASH || hashRoot === "quickstart") {
      openInlineGuide(GET_STARTED_QUICKSTART_GUIDE_HREF, "quickstart");
    }
  }, [billingBlocked, onboardingProfileComplete, openInlineGuide]);

  const playStepAudio = useCallback(async (stepId: GetStartedStepId) => {
    const audio = stepAudioRef.current;
    if (!audio) return;
    audio.src = getStartedStepAudioSrc(stepId);
    audio.load();
    try {
      await audio.play();
      setStepAudioPlaying(true);
    } catch {
      setStepAudioPlaying(false);
    }
  }, []);

  useEffect(() => {
    if (billingBlocked || !onboardingProfileComplete) {
      clearInlineDoc();
      return;
    }
    if (!inlineDocHref) {
      setInlineDoc(null);
      setInlineDocError(null);
      setInlineDocLoading(false);
      return;
    }

    const slug = docsHrefToSlug(inlineDocHref);
    const controller = new AbortController();
    let cancelled = false;

    setInlineDocLoading(true);
    setInlineDocError(null);

    void tenantFetch(`/api/docs/reader?slug=${encodeURIComponent(slug)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const data = (await response.json()) as InlineDocPayload & { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "Guide could not be loaded.");
        }
        if (!cancelled) {
          setInlineDoc(data);
        }
      })
      .catch((err) => {
        if (cancelled || isBenignRuntimeEmissionError(err)) return;
        setInlineDocError(err instanceof Error ? err.message : "Guide could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) {
          setInlineDocLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [billingBlocked, clearInlineDoc, inlineDocHref, onboardingProfileComplete, tenantFetch]);

  useEffect(() => {
    if (!inlineDoc || !inlineDocHref) return;
    const hash = inlineDocHref.split("#")[1]?.trim();
    if (!hash) return;
    const frame = window.requestAnimationFrame(() => {
      scrollGetStartedInlineReaderToAnchor(hash);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [inlineDoc, inlineDocHref]);

  const completedCount = useMemo(
    () => GET_STARTED_STEPS.filter((step) => progress[step.id]).length,
    [progress],
  );
  const percentComplete = Math.round((completedCount / GET_STARTED_STEPS.length) * 100);
  const allComplete = completedCount === GET_STARTED_STEPS.length;

  const guidedStepId = useMemo((): GetStartedStepId => {
    if (focusedStepId) return focusedStepId;
    const next = GET_STARTED_STEPS.find((step) => !progress[step.id]);
    return next?.id ?? GET_STARTED_STEPS[0]!.id;
  }, [focusedStepId, progress]);

  const guidedVisual = GET_STARTED_STEP_VISUALS[guidedStepId];
  const guidedStepMeta = GET_STARTED_STEPS.find((step) => step.id === guidedStepId)!;

  const inlineReaderStepId = useMemo((): GetStartedStepId | null => {
    if (focusedStepId) return focusedStepId;
    if (!inlineDocHref) return null;
    const openPath = inlineDocHref.split("#")[0]?.split("?")[0] ?? "";
    const match = GET_STARTED_STEPS.find((step) => {
      const stepPath = step.href.split("#")[0]?.split("?")[0] ?? "";
      return stepPath === openPath;
    });
    return match?.id ?? null;
  }, [focusedStepId, inlineDocHref]);

  const inlineReaderVisual = inlineReaderStepId
    ? GET_STARTED_STEP_VISUALS[inlineReaderStepId]
    : null;
  const inlineReaderStepTitle = inlineReaderStepId
    ? GET_STARTED_STEPS.find((step) => step.id === inlineReaderStepId)?.title
    : null;
  const isQuickstartGuideOpen = inlineReaderStepId === "quickstart";

  const inlineDocPathResolver = useMemo(() => {
    const baseSegments = inlineDoc?.slug ? dbKeyToSlugSegments(inlineDoc.slug) : [];
    return (href: string) => {
      const pathOnly = href.trim().split("#")[0]?.split("?")[0] ?? "";
      if (pathOnly === "/get-started" || pathOnly.startsWith("/get-started/")) {
        return `#${GET_STARTED_ORIENTATION_HASH}`;
      }
      return resolveAbsoluteDocPath(href, baseSegments);
    };
  }, [inlineDoc?.slug]);

  const handleInlineDocLinkClick = useCallback(
    (resolvedHref: string, rawHref: string) => {
      const anchorHref = resolvedHref.startsWith("#")
        ? resolvedHref
        : rawHref.startsWith("#")
          ? rawHref
          : null;
      if (anchorHref) {
        scrollGetStartedInlineReaderToAnchor(anchorHref.slice(1));
        return;
      }

      if (!shouldInterceptGetStartedInlineDocLink(resolvedHref)) {
        return;
      }

      openInlineGuide(normalizeGetStartedInlineDocHref(resolvedHref));
    },
    [openInlineGuide],
  );

  useEffect(() => {
    if (!stepAudioAutoplay || !welcomePhaseDone) return;
    void playStepAudio(guidedStepId);
  }, [guidedStepId, stepAudioAutoplay, playStepAudio, welcomePhaseDone]);

  const logProgress = useCallback(
    async (stepId: string, completed: boolean, markAllComplete = false) => {
      try {
        await tenantFetch("/api/get-started/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stepId,
            completed,
            allComplete: markAllComplete,
          }),
          keepalive: true,
        });
      } catch (err) {
        if (isBenignRuntimeEmissionError(err)) return;
        console.error("[Get Started] progress log failed:", err);
      }
    },
    [tenantFetch],
  );

  const markStepComplete = useCallback(
    (stepId: GetStartedStepId) => {
      setProgress((prev) => {
        if (prev[stepId]) return prev;
        const next = { ...prev, [stepId]: true };
        writeProgress(next);
        const done = GET_STARTED_STEPS.every((step) => next[step.id]);
        void logProgress(stepId, true, done);
        return next;
      });
    },
    [logProgress],
  );

  const handleTrainerLessonReceived = useCallback(() => {
    markStepComplete("trainer-session");
  }, [markStepComplete]);

  const handleDismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    if (allComplete) {
      void logProgress("portal-complete", true, true);
    }
  };

  const videoUrl = process.env.NEXT_PUBLIC_GET_STARTED_VIDEO_URL?.trim();

  const openOrientationWalkthrough = useCallback(() => {
    const stepAudio = stepAudioRef.current;
    if (stepAudio) {
      stepAudio.pause();
      setStepAudioPlaying(false);
    }
    openOrientationWalkthroughWindow();
  }, []);

  useEffect(() => {
    if (!inlineDocHref) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearInlineDoc();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [inlineDocHref, clearInlineDoc]);

  return (
    <div className="ironframe-get-started-portal relative min-h-[calc(100vh-5rem)] overflow-hidden bg-[#020617] p-4 text-slate-100 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />

      <div className="relative z-10 mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-800/80 pb-6 lg:flex-row lg:items-end">
          <div>
            <div className="mb-1 font-mono text-[10px] tracking-widest text-cyan-400 uppercase">
              Command Post Initialization
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Get Started Portal</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Post-activation onboarding — Command Post layout, Level 1 curriculum, and Trainer sandbox.
              {billingBlocked
                ? " Training modules unlock when your design-partner subscription is confirmed."
                : " Invite and credential steps are in your workspace email only."}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#070e20]/60 px-4 py-3 font-mono text-xs">
            <div className="text-slate-500 uppercase">Progress</div>
            <div className="mt-1 text-lg font-bold text-cyan-400">{percentComplete}%</div>
            <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-slate-900">
              <div
                className="h-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>
        </header>

        <OperatorActivationBanner />

        {aleBaselineUnset ? (
          <section className="rounded-xl border border-amber-500/30 bg-amber-950/15 px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-amber-300">
              Workspace ALE baseline required
            </p>
            <p className="mt-2 text-xs leading-relaxed text-amber-100/90">
              Your organization sets annual loss expectancy (ALE) in USD. This value calibrates
              Integrity Hub and board reporting for your tenant. Stored as BigInt cents in
              PostgreSQL.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block flex-1 text-[10px] text-amber-200/80">
                ALE baseline (USD)
                <input
                  type="text"
                  inputMode="decimal"
                  value={aleDraftDollars}
                  onChange={(event) => setAleDraftDollars(event.target.value)}
                  placeholder="5900000.00"
                  className="mt-1 h-11 w-full rounded-lg border border-amber-700/40 bg-[#0a0500]/40 px-3 font-mono text-sm text-amber-50 outline-none focus:border-amber-500"
                />
              </label>
              <button
                type="button"
                disabled={aleSaveBusy || !aleDraftDollars.trim()}
                onClick={() => void saveAleBaseline()}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-amber-500/50 bg-amber-950/50 px-5 font-mono text-[10px] font-bold uppercase tracking-wide text-amber-100 transition hover:bg-amber-900/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aleSaveBusy ? "Saving…" : "Save ALE baseline"}
              </button>
            </div>
            {aleSaveError ? (
              <p className="mt-2 text-xs text-rose-300" role="alert">
                {aleSaveError}
              </p>
            ) : null}
            {aleSaveMessage ? (
              <p className="mt-2 text-xs text-emerald-300" role="status">
                {aleSaveMessage}
              </p>
            ) : null}
          </section>
        ) : (
          <>
            <p className="font-mono text-[10px] text-slate-500">
              Workspace ALE baseline: {formatCentsToUSD(BigInt(aleBaselineCents))}
            </p>

            {companyProfileUnset ? (
              <section className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-950/15 px-4 py-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-300">
                  Company profile required
                </p>
                <p className="mt-2 text-xs leading-relaxed text-cyan-100/90">
                  Provision creates your workspace tenant only. Name your organization and sector so
                  Integrity Hub, risk registers, and board reporting have a primary company record.
                  ALE baseline is applied automatically from your saved workspace value.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block text-[10px] text-cyan-200/80">
                    Company name
                    <input
                      type="text"
                      value={companyNameDraft}
                      onChange={(event) => setCompanyNameDraft(event.target.value)}
                      placeholder={initialTenantName || "Acme Holdings"}
                      className="mt-1 h-11 w-full rounded-lg border border-cyan-700/40 bg-[#020617]/40 px-3 font-mono text-sm text-cyan-50 outline-none focus:border-cyan-500"
                    />
                  </label>
                  <label className="block text-[10px] text-cyan-200/80">
                    Sector
                    <input
                      type="text"
                      value={sectorDraft}
                      onChange={(event) => setSectorDraft(event.target.value)}
                      placeholder={initialTenantIndustry || "Financial Services"}
                      className="mt-1 h-11 w-full rounded-lg border border-cyan-700/40 bg-[#020617]/40 px-3 font-mono text-sm text-cyan-50 outline-none focus:border-cyan-500"
                    />
                  </label>
                  <label className="block text-[10px] text-cyan-200/80 sm:col-span-2">
                    Departments (optional, comma or newline separated)
                    <textarea
                      value={departmentsDraft}
                      onChange={(event) => setDepartmentsDraft(event.target.value)}
                      placeholder="Finance, IT, Legal"
                      rows={2}
                      className="mt-1 min-h-[2.75rem] w-full rounded-lg border border-cyan-700/40 bg-[#020617]/40 px-3 py-2 font-mono text-sm text-cyan-50 outline-none focus:border-cyan-500"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={
                    companySaveBusy || !companyNameDraft.trim() || !sectorDraft.trim()
                  }
                  onClick={() => void saveCompanyProfile()}
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-lg border border-cyan-500/50 bg-cyan-950/50 px-5 font-mono text-[10px] font-bold uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-900/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {companySaveBusy ? "Saving…" : "Save company profile"}
                </button>
                {companySaveError ? (
                  <p className="mt-2 text-xs text-rose-300" role="alert">
                    {companySaveError}
                  </p>
                ) : null}
                {companySaveMessage ? (
                  <p className="mt-2 text-xs text-emerald-300" role="status">
                    {companySaveMessage}
                  </p>
                ) : null}
              </section>
            ) : null}
          </>
        )}

        {billingBlocked ? (
          <CommercialEntitlementHoldPanel billingStatus={billingStatus} compact />
        ) : onboardingProfileComplete ? (
          <>
        {welcomeAudioSrc ? (
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-indigo-300">
              Workspace welcome
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              A short welcome message plays once before guided training narration begins.
            </p>
            <audio
              ref={welcomeAudioRef}
              preload="metadata"
              className="sr-only"
              aria-hidden
              onEnded={() => {
                setWelcomeAudioPlaying(false);
                markGetStartedWelcomePlayed();
                setWelcomePhaseDone(true);
              }}
              onPause={() => setWelcomeAudioPlaying(false)}
              onPlay={() => setWelcomeAudioPlaying(true)}
            />
            <button
              type="button"
              onClick={() => void playWelcomeAudio()}
              className="mt-3 inline-flex h-11 items-center rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-4 font-mono text-[10px] font-bold tracking-wide text-indigo-200 uppercase transition hover:bg-indigo-950/60"
            >
              {welcomeAudioPlaying ? "Playing welcome…" : "Replay welcome message"}
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <aside className="space-y-4 lg:col-span-3">
            <div className="rounded-xl border border-slate-800/80 bg-[#070e20]/40 p-4">
              <h2 className="font-mono text-[10px] tracking-widest text-indigo-400 uppercase">
                Guided step {GET_STARTED_STEPS.findIndex((s) => s.id === guidedStepId) + 1} of{" "}
                {GET_STARTED_STEPS.length}
              </h2>
              <p className="mt-2 text-xs font-semibold text-white">{guidedStepMeta.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{guidedVisual.actionCue}</p>
              <div className="mt-3 overflow-hidden rounded-lg border border-indigo-500/20 bg-[#050a14]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={guidedVisual.screenshotSrc}
                  alt={guidedVisual.screenshotAlt}
                  className="max-h-52 w-full object-cover object-top"
                />
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                Screenshot from Level 1 training corpus. Click a checklist row to focus another step.
              </p>
              <audio
                ref={stepAudioRef}
                preload="metadata"
                className="sr-only"
                aria-hidden
                onEnded={() => setStepAudioPlaying(false)}
                onPause={() => setStepAudioPlaying(false)}
                onPlay={() => setStepAudioPlaying(true)}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void playStepAudio(guidedStepId)}
                  className="inline-flex h-11 items-center rounded-lg border border-indigo-500/40 bg-indigo-950/30 px-3 font-mono text-[10px] font-bold tracking-wide text-indigo-200 uppercase transition hover:bg-indigo-950/50"
                >
                  {stepAudioPlaying ? "Playing step…" : "Play step narration"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStepAudioAutoplay((prev) => {
                      const next = !prev;
                      window.localStorage.setItem(STEP_AUDIO_AUTOPLAY_KEY, next ? "1" : "0");
                      return next;
                    });
                  }}
                  className="inline-flex h-11 items-center rounded-lg border border-slate-700 px-3 font-mono text-[10px] text-slate-400 uppercase transition hover:border-slate-500 hover:text-slate-200"
                >
                  Auto-play: {stepAudioAutoplay ? "On" : "Off"}
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-[#070e20]/40 p-4">
              <h2 className="font-mono text-[10px] tracking-widest text-indigo-400 uppercase">
                Optional audio overview
              </h2>
              {videoUrl ? (
                <div className="mt-3 space-y-2">
                  {isOrientationAudioUrl(videoUrl) ? (
                    <button
                      type="button"
                      onClick={openOrientationWalkthrough}
                      className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-indigo-500/40 bg-indigo-950/30 px-4 font-mono text-[10px] font-bold tracking-wide text-indigo-200 uppercase transition hover:bg-indigo-950/50"
                    >
                      Start visual walkthrough
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openOrientationWalkthrough}
                      className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-indigo-500/40 bg-indigo-950/30 px-4 font-mono text-[10px] font-bold tracking-wide text-indigo-200 uppercase transition hover:bg-indigo-950/50"
                    >
                      Open orientation in new window
                    </button>
                  )}
                  <p className="text-[10px] leading-relaxed text-slate-500">
                    Opens a separate browser window — screenshots crossfade with narration (audio) or
                    video plays full-screen. The window closes when playback ends.
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                  Orientation audio or screencast will be embedded here by your delivery engineer
                  ({`NEXT_PUBLIC_GET_STARTED_VIDEO_URL`}). Use the checklist and Trainer panel to
                  complete initialization today.
                </p>
              )}
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 text-xs text-emerald-200/90">
              <strong className="font-mono text-[10px] uppercase tracking-wide text-emerald-400">
                Audit evidence
              </strong>
              <p className="mt-2 leading-relaxed text-emerald-100/80">
                Checklist and Trainer completions write <code className="text-emerald-300">TRAINING_ONBOARDING</code>{" "}
                entries to your tenant agent log for security awareness training exports.
              </p>
            </div>
          </aside>

          <section id="get-started-mission-checklist" className="space-y-3 lg:col-span-5">
            <h2 className="font-mono text-[10px] tracking-widest text-slate-500 uppercase">
              Mission checklist
            </h2>
            {GET_STARTED_STEPS.map((step, index) => {
              const done = Boolean(progress[step.id]);
              return (
                <article
                  key={step.id}
                  id={step.id === "quickstart" ? GET_STARTED_ORIENTATION_HASH : undefined}
                  role="button"
                  tabIndex={0}
                  onClick={() => setFocusedStepId(step.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setFocusedStepId(step.id);
                    }
                  }}
                  className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                    guidedStepId === step.id
                      ? "border-indigo-500/50 ring-1 ring-indigo-500/30"
                      : done
                        ? "border-emerald-500/30 bg-emerald-950/10"
                        : "border-slate-800/80 bg-[#070e20]/30"
                  } ${done ? "bg-emerald-950/10" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold ${
                        done ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {done ? "✓" : index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-sans text-sm font-semibold text-white">{step.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{step.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {step.href.startsWith("/get-started") ? null : isDocsHref(step.href) ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openInlineGuide(step.href, step.id);
                            }}
                            className="inline-flex h-9 items-center rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-3 font-mono text-[10px] font-bold tracking-wide text-cyan-300 uppercase transition hover:bg-cyan-950/40"
                          >
                            {step.docLabel}
                          </button>
                        ) : (
                          <Link
                            href={step.href}
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex h-9 items-center rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-3 font-mono text-[10px] font-bold tracking-wide text-cyan-300 uppercase transition hover:bg-cyan-950/40"
                          >
                            {step.docLabel}
                          </Link>
                        )}
                        {!done ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setFocusedStepId(step.id);
                              if (isDocsHref(step.href)) {
                                openInlineGuide(step.href, step.id);
                              }
                              markStepComplete(step.id);
                            }}
                            className="inline-flex h-9 items-center rounded-lg border border-slate-700 px-3 font-mono text-[10px] text-slate-400 uppercase transition hover:border-slate-500 hover:text-slate-200"
                          >
                            Mark complete
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <section
            id="trainer-sandbox"
            className="rounded-xl border border-slate-800/80 bg-[#070e20]/30 p-4 lg:col-span-4"
          >
            <h2 className="font-mono text-[10px] tracking-widest text-cyan-400 uppercase">
              Trainer agent sandbox
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Also available from <span className="text-indigo-300">Ask Trainer</span> in Header #1 on
              any workspace route.
            </p>
            <TrainerAgentSessionForm
              className="mt-4"
              onLessonReceived={handleTrainerLessonReceived}
            />
          </section>
        </div>

        <footer className="flex flex-col items-stretch justify-between gap-3 border-t border-slate-900 pt-4 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <p className="font-mono text-[10px] text-slate-500">
              {allComplete
                ? "Initialization complete — proceed to live command surfaces."
                : `${GET_STARTED_STEPS.length - completedCount} steps remaining.`}
            </p>
            <p className="font-mono text-[10px] text-slate-600">
              Deep dives:{" "}
              <button
                type="button"
                onClick={() => openInlineGuide("/docs/user-manuals/dashboard-guide")}
                className="text-cyan-500/80 hover:text-cyan-400"
              >
                Dashboard guide
              </button>
              {" · "}
              <button
                type="button"
                onClick={() => openInlineGuide("/docs/user-manuals/glossary")}
                className="text-cyan-500/80 hover:text-cyan-400"
              >
                Glossary
              </button>
              {" · "}
              <button
                type="button"
                onClick={() => openInlineGuide("/docs/end-users/onboarding")}
                className="text-cyan-500/80 hover:text-cyan-400"
              >
                First-week checklist
              </button>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const step = GET_STARTED_STEPS.find((row) => row.id === "integrity-hub");
                if (!step) return;
                setFocusedStepId("integrity-hub");
                openInlineGuide(step.href, "integrity-hub");
              }}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-700 px-5 font-mono text-xs text-slate-300 uppercase transition hover:border-slate-500"
            >
              Open Integrity Hub guide
            </button>
            {allComplete ? (
              <Link
                href="/"
                onClick={handleDismiss}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-6 font-sans text-xs font-bold tracking-wide text-white uppercase transition hover:bg-indigo-500"
              >
                Enter Command Post
              </Link>
            ) : null}
          </div>
        </footer>
          </>
        ) : null}
      </div>

      {!billingBlocked && onboardingProfileComplete && inlineDocHref ? (
        <div
          className={`ironframe-orientation-surface fixed inset-x-0 bottom-0 z-[35] flex flex-col border-t border-[var(--login-border)] bg-[#020617] ${inlineReaderTopClass}`}
          role="dialog"
          aria-modal="true"
          aria-label={
            inlineReaderStepTitle
              ? `${inlineReaderStepTitle} — guided reading`
              : "Reading guide — stay on Get Started"
          }
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--login-border)] px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={clearInlineDoc}
              className="inline-flex h-11 items-center rounded-lg border border-[var(--login-border)] bg-[var(--bg-secondary)] px-4 font-mono text-[10px] font-bold tracking-wide text-[var(--text-main)] uppercase transition hover:bg-[var(--bg-tertiary)]"
            >
              Back to checklist
            </button>
            <p className="truncate font-mono text-[10px] uppercase tracking-widest text-[var(--login-accent)]">
              {inlineReaderStepTitle ?? "Guided reading"}
            </p>
            <button
              type="button"
              onClick={clearInlineDoc}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--login-border)] font-mono text-lg text-[var(--login-muted)] transition hover:border-[var(--login-accent)] hover:text-[var(--text-main)]"
              aria-label="Close orientation reader"
            >
              ×
            </button>
          </div>
          <div
            id={GET_STARTED_INLINE_READER_SCROLL_ID}
            className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 custom-scrollbar"
          >
            {inlineReaderVisual ? (
              <div className="mx-auto mb-6 max-w-3xl overflow-hidden rounded-xl border border-[var(--login-border)] bg-[#050a14]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={inlineReaderVisual.screenshotSrc}
                  alt={inlineReaderVisual.screenshotAlt}
                  className="max-h-64 w-full object-cover object-top"
                />
              </div>
            ) : null}
            {inlineDocLoading ? (
              <p className="mx-auto max-w-3xl font-mono text-xs text-[var(--login-muted)]">Loading guide…</p>
            ) : inlineDocError ? (
              isQuickstartGuideOpen ? (
                <GetStartedOrientationFallback mode="unavailable" detail={inlineDocError} />
              ) : (
                <p className="mx-auto max-w-3xl rounded-lg border border-[var(--login-error)]/30 bg-[color-mix(in_srgb,var(--login-error)_8%,transparent)] p-3 text-xs text-[var(--login-error)]">
                  {inlineDocError}
                </p>
              )
            ) : inlineDoc ? (
              <article className="mx-auto max-w-3xl">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[var(--login-accent)]">
                  {inlineReaderStepTitle ?? "User guide"}
                </p>
                <h2 className="mb-6 border-b border-[var(--login-border)] pb-4 font-sans text-2xl font-bold text-[var(--text-main)]">
                  {inlineDoc.title}
                </h2>
                <DocsMarkdown
                  content={inlineDoc.content}
                  currentSlug={inlineDoc.slug ? dbKeyToSlugSegments(inlineDoc.slug) : []}
                />
              </article>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
