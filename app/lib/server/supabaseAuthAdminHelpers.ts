import "server-only";



import type { SupabaseClient, User } from "@supabase/supabase-js";



import { buildTenantSubdomainOrigin } from "@/app/lib/tenantSubdomain";



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



export type SupabaseMagicLinkProperties = {

  email_otp?: string | null;

  hashed_token?: string | null;

};



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



/** Tenant-hosted bootstrap URL — sets session cookies on the workspace host after activation. */

export function buildTenantWorkspaceSessionBootstrapUrl(input: {

  tenantSlug: string;

  accessToken: string;

  refreshToken: string;

  nextPath?: string;

}): string {

  const tenantSlug = input.tenantSlug.trim().toLowerCase();

  const origin = buildTenantSubdomainOrigin(tenantSlug);

  const params = new URLSearchParams({

    access_token: input.accessToken,

    refresh_token: input.refreshToken,

    next: input.nextPath?.trim() || "/get-started",

  });

  return `${origin}/api/auth/session-bootstrap?${params.toString()}`;

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

  input: { email: string; tenantSlug: string; nextPath?: string },

): Promise<string | null> {

  const email = input.email.trim().toLowerCase();

  const tenantSlug = input.tenantSlug.trim().toLowerCase();

  if (!email || !tenantSlug) return null;



  const { buildAuthCallbackUrl, resolveTenantAuthRedirectOrigin } = await import(

    "@/app/lib/auth/publicAppUrl"

  );

  const redirectTo = buildAuthCallbackUrl(

    resolveTenantAuthRedirectOrigin(tenantSlug),

    input.nextPath ?? "/get-started",

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



  return buildTenantWorkspaceSessionBootstrapUrl({

    tenantSlug,

    accessToken: tokens.accessToken,

    refreshToken: tokens.refreshToken,

    nextPath: input.nextPath ?? "/get-started",

  });

}


