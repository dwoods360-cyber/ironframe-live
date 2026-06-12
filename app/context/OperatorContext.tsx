"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_OFFLINE_PROFILE,
  FALLBACK_EMERGENCY_PROFILE,
  OPERATOR_LOAD_TIMEOUT_MS,
  fetchActiveOperatorSession,
  profileFromSupabaseUser,
  type OperatorProfile,
} from "@/app/lib/operatorSession";

export type OperatorStatus = "INITIALIZING" | "READY";

export type OperatorState = {
  status: OperatorStatus;
  profile: OperatorProfile;
  user: User | null;
};

type OperatorContextValue = OperatorState & {
  isInitializing: boolean;
  isGuest: boolean;
  isOffline: boolean;
  isEmergencyFallback: boolean;
};

const OperatorContext = createContext<OperatorContextValue | null>(null);

const INITIAL_STATE: OperatorState = {
  status: "INITIALIZING",
  profile: DEFAULT_OFFLINE_PROFILE,
  user: null,
};

export function OperatorProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [operatorState, setOperatorState] = useState<OperatorState>(INITIAL_STATE);

  useEffect(() => {
    let active = true;

    async function initOperatorSession() {
      try {
        const session = await fetchActiveOperatorSession(supabase);

        if (!active) return;

        if (!session) {
          setOperatorState({
            status: "READY",
            profile: DEFAULT_OFFLINE_PROFILE,
            user: null,
          });
          return;
        }

        setOperatorState({
          status: "READY",
          profile: session.profile,
          user: session.user,
        });
      } catch (error) {
        console.error("[Operator Context] Critical initialization fail:", error);
        if (!active) return;
        setOperatorState({
          status: "READY",
          profile: FALLBACK_EMERGENCY_PROFILE,
          user: null,
        });
      }
    }

    const timeoutId = window.setTimeout(() => {
      if (!active) return;
      setOperatorState((prev) => {
        if (prev.status !== "INITIALIZING") return prev;
        return {
          status: "READY",
          profile: DEFAULT_OFFLINE_PROFILE,
          user: null,
        };
      });
    }, OPERATOR_LOAD_TIMEOUT_MS);

    void initOperatorSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const nextUser = session?.user ?? null;
      if (!nextUser) {
        setOperatorState({
          status: "READY",
          profile: DEFAULT_OFFLINE_PROFILE,
          user: null,
        });
        return;
      }
      setOperatorState({
        status: "READY",
        profile: profileFromSupabaseUser(nextUser),
        user: nextUser,
      });
    });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<OperatorContextValue>(() => {
    const { status, profile, user } = operatorState;
    return {
      status,
      profile,
      user,
      isInitializing: status === "INITIALIZING",
      isGuest: status === "READY" && user == null,
      isOffline: profile.mode === "offline",
      isEmergencyFallback: profile.mode === "emergency",
    };
  }, [operatorState]);

  return <OperatorContext.Provider value={value}>{children}</OperatorContext.Provider>;
}

export function useOperatorContext(): OperatorContextValue {
  const ctx = useContext(OperatorContext);
  if (!ctx) {
    throw new Error("useOperatorContext must be used inside OperatorProvider");
  }
  return ctx;
}
