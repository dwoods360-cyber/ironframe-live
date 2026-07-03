import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { Page } from "@playwright/test";

const APEX_ORIGIN = "http://127.0.0.1:3000";

/** Serialize Supabase generateLink — parallel workers invalidate each other's OTP. */
let apexAuthBootstrapChain: Promise<void> = Promise.resolve();

function buildApexMagicLinkVerifyUrl(hashedToken: string, redirectTo: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const params = new URLSearchParams({
    token: hashedToken,
    type: "magiclink",
    redirect_to: redirectTo,
    apikey: anonKey,
  });
  return `${supabaseUrl.replace(/\/+$/, "")}/auth/v1/verify?${params.toString()}`;
}

export type CommandPostDomSnapshot = {
  found: boolean;
  tag: string | null;
  href: string | null;
  slug: string | null;
  ready: string | null;
  title: string | null;
};

export type CommandPostDiagnosticReport = {
  email: string;
  hostAfterLogin: string;
  integrityUrl: string;
  commandPost: CommandPostDomSnapshot;
  integrityHubHref: string | null;
  ironframeTenantCookie: string | null;
  supabaseCookieCount: number;
  networkEvents: string[];
  responseEvents: string[];
  urlAfterClick: string;
  workspaceLaunchSeen: boolean;
};

async function exchangeMagicLinkForSession(
  email: string,
  linkProperties: { email_otp?: string | null; hashed_token?: string | null },
): Promise<{ accessToken: string; refreshToken: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
  }

  const attempts: Record<string, string>[] = [];
  const hashedToken = linkProperties.hashed_token?.trim();
  const emailOtp = linkProperties.email_otp?.trim();
  if (hashedToken) {
    attempts.push({ type: "magiclink", token_hash: hashedToken });
    attempts.push({ type: "email", token_hash: hashedToken });
  }
  if (emailOtp) {
    attempts.push({ type: "magiclink", email, token: emailOtp });
    attempts.push({ type: "email", email, token: emailOtp });
  }

  let lastError = "no verification token returned";
  for (const body of attempts) {
    const response = await fetch(`${supabaseUrl}/auth/v1/verify`, {
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
    };

    if (response.ok && payload.access_token && payload.refresh_token) {
      return { accessToken: payload.access_token, refreshToken: payload.refresh_token };
    }

    lastError = payload.error_description ?? payload.msg ?? `HTTP ${response.status}`;
  }

  throw new Error(`Supabase magic-link verify failed: ${lastError}`);
}

async function materializeSupabaseAuthCookies(
  accessToken: string,
  refreshToken: string,
): Promise<Array<{ name: string; value: string; options: Record<string, unknown> }>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
  }

  const pending: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return pending.map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          const existing = pending.findIndex((row) => row.name === cookie.name);
          const row = { name: cookie.name, value: cookie.value, options: cookie.options ?? {} };
          if (existing >= 0) pending[existing] = row;
          else pending.push(row);
        }
      },
    },
  });

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw new Error(`Supabase setSession failed: ${error.message}`);
  return pending;
}

/** Mint Supabase session cookies on apex 127.0.0.1 (matches playwright.config baseURL). */
export async function bootstrapApexOperatorSession(page: Page, email: string): Promise<void> {
  await (apexAuthBootstrapChain = apexAuthBootstrapChain.then(() =>
    bootstrapApexOperatorSessionInner(page, email),
  ));
}

async function bootstrapApexOperatorSessionInner(page: Page, email: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for Command Post diagnostic auth.");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const redirectTo = `${APEX_ORIGIN}/api/auth/callback`;
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: email.trim().toLowerCase(),
    options: { redirectTo },
  });
  if (error) throw new Error(`generateLink failed: ${error.message}`);

  const { accessToken, refreshToken } = await exchangeMagicLinkForSession(
    email.trim().toLowerCase(),
    data.properties ?? {},
  ).catch(async () => {
    const hashedToken = data.properties?.hashed_token?.trim();
    const actionLink = data.properties?.action_link?.trim();
    const verifyUrl =
      hashedToken != null && hashedToken.length > 0
        ? buildApexMagicLinkVerifyUrl(hashedToken, redirectTo)
        : actionLink;
    if (!verifyUrl) {
      throw new Error("Supabase generateLink returned no verification path.");
    }

    await page.goto(verifyUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const landed = page.url();
    if (landed.includes("#")) {
      const hash = landed.slice(landed.indexOf("#") + 1);
      const params = new URLSearchParams(hash);
      const access = params.get("access_token");
      const refresh = params.get("refresh_token");
      if (access && refresh) {
        return { accessToken: access, refreshToken: refresh };
      }
    }

    const cookies = await page.context().cookies(APEX_ORIGIN);
    const hasSession = cookies.some((row) => row.name.includes("sb-") && row.value.length > 0);
    if (hasSession) {
      return { accessToken: "", refreshToken: "" };
    }

    throw new Error("Browser magic-link verify did not establish a Supabase session.");
  });

  if (accessToken && refreshToken) {
    const authCookies = await materializeSupabaseAuthCookies(accessToken, refreshToken);
    const normalizeSameSite = (value: unknown): "Lax" | "Strict" | "None" => {
      if (value === "strict" || value === "Strict") return "Strict";
      if (value === "none" || value === "None") return "None";
      return "Lax";
    };

    await page.context().addCookies([
      ...authCookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: "127.0.0.1",
        path: typeof cookie.options.path === "string" ? cookie.options.path : "/",
        httpOnly: Boolean(cookie.options.httpOnly),
        secure: false,
        sameSite: normalizeSameSite(cookie.options.sameSite),
      })),
    ]);
  }
}

export async function readCommandPostDomSnapshot(page: Page): Promise<CommandPostDomSnapshot> {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="header-command-post-chip"]');
    if (!el) {
      return { found: false, tag: null, href: null, slug: null, ready: null, title: null };
    }
    return {
      found: true,
      tag: el.tagName,
      href: el.getAttribute("href"),
      slug: el.getAttribute("data-command-post-slug"),
      ready: el.getAttribute("data-command-post-ready"),
      title: el.getAttribute("title"),
    };
  });
}

export async function runCommandPostClickDiagnostic(
  page: Page,
  email: string,
): Promise<CommandPostDiagnosticReport> {
  const networkEvents: string[] = [];
  const responseEvents: string[] = [];
  const onRequest = (request: { method: () => string; url: () => string }) => {
    const url = request.url();
    if (
      url.includes("workspace-launch") ||
      url.includes("session-bootstrap") ||
      url.includes("/login") ||
      url.includes("/integrity")
    ) {
      networkEvents.push(`${request.method()} ${url}`);
    }
  };
  const onResponse = (response: { url: () => string; status: () => number; headers: () => Record<string, string> }) => {
    const url = response.url();
    if (
      url.includes("workspace-launch") ||
      url.includes("session-bootstrap") ||
      (url.includes("/login") && !url.includes("_next"))
    ) {
      const location = response.headers()["location"] ?? response.headers()["Location"];
      responseEvents.push(
        `${response.status()} ${url}${location ? ` -> ${location}` : ""}`,
      );
    }
  };
  page.on("request", onRequest);
  page.on("response", onResponse);

  await bootstrapApexOperatorSession(page, email);
  await page.goto(`${APEX_ORIGIN}/integrity`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2_000);

  const cookies = await page.context().cookies("http://127.0.0.1");
  const ironframeTenantCookie =
    cookies.find((row) => row.name === "ironframe-tenant")?.value ?? null;
  const supabaseCookieCount = cookies.filter((row) => row.name.includes("sb-")).length;

  const commandPost = await readCommandPostDomSnapshot(page);
  const integrityHubHref = await page
    .locator('[data-testid="header-integrity-hub-chip"]')
    .getAttribute("href")
    .catch(() => null);

  const chip = page.locator('[data-testid="header-command-post-chip"]');
  await chip.waitFor({ state: "visible", timeout: 20_000 });

  const urlBeforeClick = page.url();
  await chip.click({ noWaitAfter: true, timeout: 10_000 });

  let workspaceLaunchSeen = false;
  try {
    await page.waitForURL(
      (url) =>
        url.href.includes("workspace-launch") ||
        (url.hostname.includes("lvh.me") && !url.pathname.includes("session-bootstrap")) ||
        url.pathname === "/login",
      { timeout: 60_000 },
    );
  } catch {
    // Capture final state even when navigation stalls.
  }

  workspaceLaunchSeen = networkEvents.some((line) => line.includes("workspace-launch"));

  await page.waitForTimeout(2_000);
  page.off("request", onRequest);
  page.off("response", onResponse);

  return {
    email,
    hostAfterLogin: new URL(urlBeforeClick).host,
    integrityUrl: urlBeforeClick,
    commandPost,
    integrityHubHref,
    ironframeTenantCookie,
    supabaseCookieCount,
    networkEvents,
    responseEvents,
    urlAfterClick: page.url(),
    workspaceLaunchSeen,
  };
}
