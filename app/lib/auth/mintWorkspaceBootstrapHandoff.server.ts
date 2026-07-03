import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import { mintWorkspaceBootstrapHandoffUrl } from "@/app/lib/auth/workspaceSessionBootstrap";
import { isTenantWorkspaceBootstrapUrl } from "@/app/lib/commandPostNavigation";
import { sanitizeAuthNextPath } from "@/app/lib/auth/publicAppUrl";
import { workspaceActivationNextParam } from "@/app/lib/auth/workspaceActivationLanding";
import {
  isReservedTenantSlugLabel,
  isValidTenantSlugLabel,
} from "@/app/lib/tenantSubdomain";

export type SupabaseCookieMutation = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

export type MintWorkspaceBootstrapResult =
  | { ok: true; bootstrapUrl: string; cookieMutations: SupabaseCookieMutation[] }
  | {
      ok: false;
      reason:
        | "invalid_slug"
        | "auth_not_configured"
        | "unauthenticated"
        | "tenant_membership_required"
        | "invalid_bootstrap_target";
    };

export function normalizeWorkspaceLaunchSlug(raw: string | null | undefined): string | null {
  const slug = raw?.trim().toLowerCase() ?? "";
  if (!slug) return null;
  if (!isValidTenantSlugLabel(slug) || isReservedTenantSlugLabel(slug)) return null;
  return slug;
}

export function normalizeWorkspaceLaunchNextPath(raw: string | null | undefined): string {
  return sanitizeAuthNextPath(raw, workspaceActivationNextParam());
}

export function stampSupabaseCookieMutations(
  response: NextResponse,
  cookieMutations: readonly SupabaseCookieMutation[],
): NextResponse {
  cookieMutations.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  return response;
}

/** Mint a tenant-bound bootstrap redeem URL for the signed-in apex session. */
export async function mintWorkspaceBootstrapFromRequest(
  request: NextRequest,
  tenantSlug: string,
  nextPath: string,
): Promise<MintWorkspaceBootstrapResult> {
  const slug = normalizeWorkspaceLaunchSlug(tenantSlug);
  if (!slug) {
    return { ok: false, reason: "invalid_slug" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    return { ok: false, reason: "auth_not_configured" };
  }

  const cookieMutations: SupabaseCookieMutation[] = [];

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach((cookie) => {
          cookieMutations.push(cookie);
        });
      },
    },
  });

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token || !session.refresh_token) {
    return { ok: false, reason: "unauthenticated" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id?.trim()) {
    return { ok: false, reason: "unauthenticated" };
  }

  const bootstrapUrl = await mintWorkspaceBootstrapHandoffUrl({
    tenantSlug: slug,
    userId: user.id.trim(),
    userEmail: user.email,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    nextPath,
  });

  if (!bootstrapUrl) {
    return { ok: false, reason: "tenant_membership_required" };
  }

  if (!isTenantWorkspaceBootstrapUrl(bootstrapUrl, slug)) {
    return { ok: false, reason: "invalid_bootstrap_target" };
  }

  return { ok: true, bootstrapUrl, cookieMutations };
}
