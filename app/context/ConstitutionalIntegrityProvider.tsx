"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useRiskStore } from "@/app/store/riskStore";
import { isConstitutionalOverlaySuppressedPath } from "@/app/utils/grcRouteMatch";
import { isBenignRuntimeEmissionError } from "@/app/utils/safeRuntimeEmission";
import { ABORT_REASONS } from "@/app/utils/abortReasons";
import { ironguardFetch } from "@/app/utils/apiClient";
import { logExplicitDiagnosticAbort, observeSuppressedFetchAbort } from "@/app/utils/diagnosticAbortLog";

const POLL_MS = 4000;
const INTEGRITY_FETCH_TIMEOUT_MS = 12_000;

function publicSurfaceIntegrityClearPatch() {
  return {
    isConstitutionalEmergency: false,
    constitutionalRebaselinePending: false,
    constitutionalDegradedMode: false,
    requiredForensicAttestationMin: 50,
    isSustainabilityApiDegraded: false,
    isSustainabilityStaleLockdownBlocking: false,
    isOverrideSpent: false,
    sha256: null as string | null,
    sha256Short: "",
    failureReason: null as string | null,
    failureMessage: null as string | null,
  };
}

export type ConstitutionalIntegrityClientState = {
  isConstitutionalEmergency: boolean;
  constitutionalRebaselinePending: boolean;
  constitutionalDegradedMode: boolean;
  /** Ironwatch Stale Data — Ironlock raises forensic minimum to 100. */
  isSustainabilityApiDegraded: boolean;
  /** Irontech ≥24h lockdown — POST/PUT/PATCH/DELETE blocked until waiver or recovery. */
  isSustainabilityStaleLockdownBlocking: boolean;
  requiredForensicAttestationMin: number;
  isOverrideSpent: boolean;
  sha256: string | null;
  sha256Short: string;
  failureReason: string | null;
  failureMessage: string | null;
  refreshIntegrity: () => Promise<void>;
};

const ConstitutionalIntegrityContext = createContext<ConstitutionalIntegrityClientState | null>(
  null,
);

export function ConstitutionalIntegrityProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const setConstitutionalIntegrityState = useRiskStore((s) => s.setConstitutionalIntegrityState);
  const isConstitutionalEmergency = useRiskStore((s) => s.isConstitutionalEmergency);
  const constitutionalRebaselinePending = useRiskStore((s) => s.constitutionalRebaselinePending);
  const constitutionalSha256 = useRiskStore((s) => s.constitutionalSha256);
  const constitutionalSha256Short = useRiskStore((s) => s.constitutionalSha256Short);
  const constitutionalFailureReason = useRiskStore((s) => s.constitutionalFailureReason);
  const constitutionalFailureMessage = useRiskStore((s) => s.constitutionalFailureMessage);
  const constitutionalDegradedMode = useRiskStore((s) => s.constitutionalDegradedMode);
  const isSustainabilityApiDegraded = useRiskStore((s) => s.isSustainabilityApiDegraded);
  const isSustainabilityStaleLockdownBlocking = useRiskStore(
    (s) => s.isSustainabilityStaleLockdownBlocking,
  );
  const requiredForensicAttestationMin = useRiskStore((s) => s.requiredForensicAttestationMin);
  const isOverrideSpent = useRiskStore((s) => s.isOverrideSpent);

  const pollInFlightRef = useRef(false);
  const overlaySuppressed = isConstitutionalOverlaySuppressedPath(pathname);

  useEffect(() => {
    if (overlaySuppressed) {
      setConstitutionalIntegrityState(publicSurfaceIntegrityClearPatch());
    }
  }, [overlaySuppressed, pathname, setConstitutionalIntegrityState]);

  const refreshIntegrity = useCallback(async () => {
    if (pollInFlightRef.current) return;
    pollInFlightRef.current = true;
    const suppressed = isConstitutionalOverlaySuppressedPath(pathname);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      logExplicitDiagnosticAbort(ABORT_REASONS.integrityFetchTimeout, {
        surface: "ConstitutionalIntegrityProvider",
        path: "/api/grc/tas-integrity",
        method: "GET",
      });
      controller.abort(ABORT_REASONS.integrityFetchTimeout);
    }, INTEGRITY_FETCH_TIMEOUT_MS);
    try {
      const res = await ironguardFetch("/api/grc/tas-integrity", {
        cache: "no-store",
        signal: controller.signal,
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        if (suppressed) {
          setConstitutionalIntegrityState(publicSurfaceIntegrityClearPatch());
        }
        return;
      }
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (suppressed) {
        setConstitutionalIntegrityState({
          ...publicSurfaceIntegrityClearPatch(),
          sha256: typeof body.sha256 === "string" && body.sha256.length === 64 ? body.sha256 : null,
          sha256Short: typeof body.sha256Short === "string" ? body.sha256Short : "",
        });
        return;
      }
      setConstitutionalIntegrityState({
        isConstitutionalEmergency: Boolean(body.isConstitutionalEmergency),
        constitutionalRebaselinePending: Boolean(body.constitutionalRebaselinePending),
        constitutionalDegradedMode: Boolean(body.constitutionalDegradedMode),
        requiredForensicAttestationMin:
          typeof body.requiredForensicAttestationMin === "number" &&
          body.requiredForensicAttestationMin >= 50
            ? body.requiredForensicAttestationMin
            : 50,
        isSustainabilityApiDegraded: Boolean(body.isSustainabilityApiDegraded),
        isSustainabilityStaleLockdownBlocking: Boolean(body.isSustainabilityStaleLockdownBlocking),
        isOverrideSpent: Boolean(body.isOverrideSpent),
        sha256: typeof body.sha256 === "string" && body.sha256.length === 64 ? body.sha256 : null,
        sha256Short: typeof body.sha256Short === "string" ? body.sha256Short : "",
        failureReason: typeof body.failureReason === "string" ? body.failureReason : null,
        failureMessage: typeof body.failureMessage === "string" ? body.failureMessage : null,
      });
    } catch (error) {
      if (isBenignRuntimeEmissionError(error)) {
        observeSuppressedFetchAbort(error, {
          surface: "ConstitutionalIntegrityProvider",
          path: "/api/grc/tas-integrity",
          method: "GET",
        });
        return;
      }
      if (suppressed) {
        setConstitutionalIntegrityState(publicSurfaceIntegrityClearPatch());
        return;
      }
      setConstitutionalIntegrityState({
        isConstitutionalEmergency: true,
        constitutionalRebaselinePending: false,
        constitutionalDegradedMode: false,
        requiredForensicAttestationMin: 50,
        isSustainabilityApiDegraded: false,
        isSustainabilityStaleLockdownBlocking: false,
        isOverrideSpent: false,
        sha256: null,
        sha256Short: "",
        failureReason: "UNREADABLE",
        failureMessage: "Failed to reach constitutional integrity sentinel.",
      });
    } finally {
      window.clearTimeout(timeoutId);
      pollInFlightRef.current = false;
    }
  }, [pathname, setConstitutionalIntegrityState]);

  useEffect(() => {
    void refreshIntegrity();
    const id = window.setInterval(() => {
      void refreshIntegrity();
    }, POLL_MS);
    const onTenantChanged = () => {
      void refreshIntegrity();
    };
    window.addEventListener("ironframe-tenant-changed", onTenantChanged);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("ironframe-tenant-changed", onTenantChanged);
    };
  }, [refreshIntegrity]);

  const value = useMemo<ConstitutionalIntegrityClientState>(
    () => ({
      isConstitutionalEmergency,
      constitutionalRebaselinePending,
      constitutionalDegradedMode,
      isSustainabilityApiDegraded,
      isSustainabilityStaleLockdownBlocking,
      requiredForensicAttestationMin,
      isOverrideSpent,
      sha256: constitutionalSha256,
      sha256Short: constitutionalSha256Short,
      failureReason: constitutionalFailureReason,
      failureMessage: constitutionalFailureMessage,
      refreshIntegrity,
    }),
    [
      isConstitutionalEmergency,
      constitutionalRebaselinePending,
      constitutionalDegradedMode,
      isSustainabilityApiDegraded,
      isSustainabilityStaleLockdownBlocking,
      requiredForensicAttestationMin,
      isOverrideSpent,
      constitutionalSha256,
      constitutionalSha256Short,
      constitutionalFailureReason,
      constitutionalFailureMessage,
      refreshIntegrity,
    ],
  );

  return (
    <ConstitutionalIntegrityContext.Provider value={value}>
      {children}
    </ConstitutionalIntegrityContext.Provider>
  );
}

export function useConstitutionalIntegrity(): ConstitutionalIntegrityClientState {
  const ctx = useContext(ConstitutionalIntegrityContext);
  if (!ctx) {
    throw new Error("useConstitutionalIntegrity must be used within ConstitutionalIntegrityProvider");
  }
  return ctx;
}

/** Optional hook — returns lock flags without throwing outside provider (e.g. tests). */
export function useConstitutionalLockFlags(): {
  isLocked: boolean;
  isConstitutionalEmergency: boolean;
  constitutionalRebaselinePending: boolean;
  constitutionalDegradedMode: boolean;
  requiredForensicAttestationMin: number;
  isOverrideSpent: boolean;
} {
  const emergency = useRiskStore((s) => s.isConstitutionalEmergency);
  const rebaseline = useRiskStore((s) => s.constitutionalRebaselinePending);
  const degraded = useRiskStore((s) => s.constitutionalDegradedMode);
  const min = useRiskStore((s) => s.requiredForensicAttestationMin);
  const spent = useRiskStore((s) => s.isOverrideSpent);
  const staleLockdown = useRiskStore((s) => s.isSustainabilityStaleLockdownBlocking);
  return {
    isConstitutionalEmergency: emergency,
    constitutionalRebaselinePending: rebaseline,
    constitutionalDegradedMode: degraded,
    requiredForensicAttestationMin: min,
    isOverrideSpent: spent,
    isLocked: (emergency && !degraded) || rebaseline || staleLockdown,
  };
}

export function useForensicAttestationMin(): number {
  return useRiskStore((s) => s.requiredForensicAttestationMin);
}

export function useSustainabilityApiDegraded(): boolean {
  return useRiskStore((s) => s.isSustainabilityApiDegraded);
}

export function useSustainabilityStaleLockdownBlocking(): boolean {
  return useRiskStore((s) => s.isSustainabilityStaleLockdownBlocking);
}
