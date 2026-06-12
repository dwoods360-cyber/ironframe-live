"use client";

import type { User } from "@supabase/supabase-js";
import { useOperatorContext } from "@/app/context/OperatorContext";

export { OPERATOR_LOAD_TIMEOUT_MS } from "@/app/lib/operatorSession";

export type OperatorIdentity = {
  user: User | null;
  displayName: string;
  displayRole: string;
  isLoading: boolean;
  isGuest: boolean;
};

/** Header #1 identity — backed by OperatorProvider (never blocks layout indefinitely). */
export function useOperatorIdentity(): OperatorIdentity {
  const { profile, user, isInitializing, isGuest } = useOperatorContext();

  return {
    user,
    displayName: isInitializing ? "Resolving operator…" : profile.displayName,
    displayRole: isInitializing ? "…" : profile.displayRole,
    isLoading: isInitializing,
    isGuest,
  };
}
