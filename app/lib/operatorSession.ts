import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapSupabaseMetadataRoleToDisplay } from "@/app/lib/grcRoles";

export const OPERATOR_LOAD_TIMEOUT_MS = 4_000;

export type OperatorProfileMode = "live" | "offline" | "emergency";

export type OperatorProfile = {
  mode: OperatorProfileMode;
  id: string;
  displayName: string;
  displayRole: string;
  email: string | null;
  supabaseUserId: string | null;
};

export type OperatorSession = {
  user: User;
  profile: OperatorProfile;
};

export const DEFAULT_OFFLINE_PROFILE: OperatorProfile = {
  mode: "offline",
  id: "local-operator",
  displayName: "LOCAL OPERATOR",
  displayRole: mapSupabaseMetadataRoleToDisplay(undefined),
  email: null,
  supabaseUserId: null,
};

export const FALLBACK_EMERGENCY_PROFILE: OperatorProfile = {
  mode: "emergency",
  id: "emergency-operator",
  displayName: "EMERGENCY OPERATOR",
  displayRole: mapSupabaseMetadataRoleToDisplay(undefined),
  email: null,
  supabaseUserId: null,
};

export function resolveOperatorDisplayName(user: User | null): string {
  if (!user) return DEFAULT_OFFLINE_PROFILE.displayName;
  const fullName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  if (fullName) return fullName;
  const email = user.email?.trim();
  if (email) return email;
  return "AUTHENTICATED OPERATOR";
}

export function resolveOperatorDisplayRole(user: User | null): string {
  if (!user) return DEFAULT_OFFLINE_PROFILE.displayRole;
  return mapSupabaseMetadataRoleToDisplay(
    typeof user.user_metadata?.role === "string" ? user.user_metadata.role : undefined,
  );
}

export function profileFromSupabaseUser(user: User): OperatorProfile {
  return {
    mode: "live",
    id: user.id,
    displayName: resolveOperatorDisplayName(user),
    displayRole: resolveOperatorDisplayRole(user),
    email: user.email ?? null,
    supabaseUserId: user.id,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        window.clearTimeout(timer);
        resolve(null);
      });
  });
}

/** Live Supabase auth session — null when unauthenticated or telemetry lags past timeout. */
export async function fetchActiveOperatorSession(
  supabase: SupabaseClient,
): Promise<OperatorSession | null> {
  const result = await withTimeout(supabase.auth.getUser(), OPERATOR_LOAD_TIMEOUT_MS);
  if (!result) return null;

  const { data, error } = result;
  if (error || !data.user) return null;

  return {
    user: data.user,
    profile: profileFromSupabaseUser(data.user),
  };
}
