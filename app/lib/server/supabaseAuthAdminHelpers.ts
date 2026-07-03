import "server-only";



import type { SupabaseClient, User } from "@supabase/supabase-js";



import { mintWorkspaceBootstrapHandoffUrl } from "@/app/lib/auth/workspaceSessionBootstrap";
import { userIdFromAccessToken } from "@/app/lib/auth/workspaceBootstrapTicket";
import { ensureCorporateInviteRoleAssignment } from "@/app/lib/auth/corporateInviteProvisioning";
import { workspaceActivationNextParam } from "@/app/lib/auth/workspaceActivationLanding";



/** Supabase invite/createUser errors when the auth.users row already exists. */

export function isSupabaseExistingUserError(message: string): boolean {

  const normalized = message.toLowerCase();

  return (

    normalized.includes("already been registered") ||

    normalized.includes("already exists") ||

    normalized.includes("user already registered")

  );

}



export async function findSupabaseAuthUserByEmail(

  supabaseAdmin: SupabaseClient,

  email: string,

): Promise<User | null> {

  const target = email.trim().toLowerCase();

  if (!target) return null;



  let page = 1;

  const perPage = 1000;

  for (;;) {

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });

    if (error) {

      throw new Error(`Supabase listUsers failed: ${error.message}`);

    }



    const match = data.users.find((u) => u.email?.trim().toLowerCase() === target);

    if (match) return match;



    if (data.users.length < perPage) break;

    page += 1;

  }



  return null;

}

/** Invalidate all refresh tokens / sessions for a user (post-revocation hardening). */
export async function revokeAllSupabaseSessionsForUser(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const uid = userId.trim();
  if (!uid) {
    return { ok: false, error: "User id is required to revoke sessions." };
  }

  const { error } = await supabaseAdmin.auth.admin.signOut(uid, "global");
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/** Paginated auth.users index for platform-admin roster views (user id → email). */
export async function listSupabaseAuthEmailsByUserId(
  supabaseAdmin: SupabaseClient,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let page = 1;
  const perPage = 1000;

  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Supabase listUsers failed: ${error.message}`);
    }

    for (const user of data.users) {
      const email = user.email?.trim();
      if (email) {
        map.set(user.id, email);
      }
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  return map;
}

export type SupabaseMagicLinkProperties = {

  email_otp?: string | null;

  hashed_token?: string | null;

};



/** Password grant immediately after assisted registration — reliable vs magic-link verify. */
export async function exchangePasswordForSession(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) return null;

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return null;

  const response = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: normalizedEmail, password }),
  });

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    error_description?: string;
    msg?: string;
    message?: string;
  };

  if (response.ok && payload.access_token && payload.refresh_token) {
    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
    };
  }

  console.error(
    "[exchangePasswordForSession]",
    payload.error_description ?? payload.msg ?? payload.message ?? `HTTP ${response.status}`,
  );
  return null;
}



/** Server-side magic-link redemption — avoids brittle browser GET /auth/v1/verify navigation. */

export async function exchangeSupabaseMagicLinkForSession(

  email: string,

  linkProperties: SupabaseMagicLinkProperties,

): Promise<{ accessToken: string; refreshToken: string } | null> {

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !anonKey) return null;



  const normalizedEmail = email.trim().toLowerCase();

  const attempts: Record<string, string>[] = [];

  const hashedToken = linkProperties.hashed_token?.trim();

  const emailOtp = linkProperties.email_otp?.trim();



  if (hashedToken) {

    attempts.push({ type: "magiclink", token_hash: hashedToken });

    attempts.push({ type: "email", token_hash: hashedToken });

  }

  if (emailOtp) {

    attempts.push({ type: "magiclink", email: normalizedEmail, token: emailOtp });

    attempts.push({ type: "email", email: normalizedEmail, token: emailOtp });

  }



  if (attempts.length === 0) return null;



  let lastError = "no verification token returned";

  for (const body of attempts) {

    const response = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/auth/v1/verify`, {

      method: "POST",

      headers: {

        apikey: anonKey,

        Authorization: `Bearer ${anonKey}`,

        "Content-Type": "application/json",

      },

      body: JSON.stringify(body),

    });



    const payload = (await response.json()) as {

      access_token?: string;

      refresh_token?: string;

      error_description?: string;

      msg?: string;

      message?: string;

    };



    if (response.ok && payload.access_token && payload.refresh_token) {

      return {

        accessToken: payload.access_token,

        refreshToken: payload.refresh_token,

      };

    }



    lastError = payload.error_description ?? payload.msg ?? payload.message ?? `HTTP ${response.status}`;

  }



  console.error("[exchangeSupabaseMagicLinkForSession]", lastError);

  return null;

}



/** Browser-navigable Supabase magic-link verify URL (requires public anon key). */

export function buildSupabaseMagicLinkVerifyUrl(input: {

  supabaseUrl: string;

  anonKey: string;

  hashedToken: string;

  redirectTo: string;

}): string {

  const params = new URLSearchParams({

    token: input.hashedToken,

    type: "magiclink",

    redirect_to: input.redirectTo,

    apikey: input.anonKey,

  });

  return `${input.supabaseUrl.replace(/\/+$/, "")}/auth/v1/verify?${params.toString()}`;

}



/** One-time tenant session bridge after workspace activation (server exchanges magic link). */

export async function buildTenantWorkspaceSessionHandoffUrl(

  supabaseAdmin: SupabaseClient,

  input: { email: string; tenantSlug: string; nextPath?: string; password?: string },

): Promise<string | null> {

  const email = input.email.trim().toLowerCase();

  const tenantSlug = input.tenantSlug.trim().toLowerCase();

  if (!email || !tenantSlug) return null;



  if (input.password) {
    const activationNext = input.nextPath ?? workspaceActivationNextParam();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
      const passwordTokens = await exchangePasswordForSession(email, input.password);
      if (passwordTokens) {
        const userId = userIdFromAccessToken(passwordTokens.accessToken);
        if (!userId) continue;
        await ensureCorporateInviteRoleAssignment(userId, tenantSlug);
        const handoffUrl = await mintWorkspaceBootstrapHandoffUrl({
          tenantSlug,
          userId,
          userEmail: email,
          accessToken: passwordTokens.accessToken,
          refreshToken: passwordTokens.refreshToken,
          nextPath: activationNext,
        });
        if (handoffUrl) return handoffUrl;
      }
    }
  }

  const { buildAuthCallbackUrl, resolveTenantAuthRedirectOrigin } = await import(
    "@/app/lib/auth/publicAppUrl"
  );

  const activationNext = input.nextPath ?? workspaceActivationNextParam();
  const redirectTo = buildAuthCallbackUrl(
    resolveTenantAuthRedirectOrigin(tenantSlug),
    activationNext,
    { workspaceTenantSlug: tenantSlug },
  );



  const { data, error } = await supabaseAdmin.auth.admin.generateLink({

    type: "magiclink",

    email,

    options: {

      redirectTo,

      data: { tenant_slug: tenantSlug },

    },

  });



  if (error) {

    console.error("[buildTenantWorkspaceSessionHandoffUrl]", error.message);

    return null;

  }



  const tokens = await exchangeSupabaseMagicLinkForSession(email, data.properties ?? {});

  if (!tokens) return null;

  const userId = userIdFromAccessToken(tokens.accessToken);
  if (!userId) return null;

  await ensureCorporateInviteRoleAssignment(userId, tenantSlug);

  return mintWorkspaceBootstrapHandoffUrl({
    tenantSlug,
    userId,
    userEmail: email,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    nextPath: input.nextPath ?? workspaceActivationNextParam(),
  });

}


