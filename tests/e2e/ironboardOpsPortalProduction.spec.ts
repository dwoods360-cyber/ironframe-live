import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const APEX = "https://www.ironframegrc.com";
const EMAIL =
  process.env.IRONFRAME_DEV_SUPABASE_EMAIL?.trim().toLowerCase() ||
  "dwoods360@gmail.com";

async function bootstrapProductionSession(page: import("@playwright/test").Page) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !serviceKey || !anonKey) {
    throw new Error("Missing Supabase env for production auth");
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: EMAIL,
    options: { redirectTo: `${APEX}/api/auth/callback` },
  });
  if (error) throw new Error(error.message);

  const hashedToken = data.properties?.hashed_token?.trim();
  const emailOtp = data.properties?.email_otp?.trim();
  const attempts: Record<string, string>[] = [];
  if (hashedToken) {
    attempts.push({ type: "magiclink", token_hash: hashedToken });
    attempts.push({ type: "email", token_hash: hashedToken });
  }
  if (emailOtp) {
    attempts.push({ type: "magiclink", email: EMAIL, token: emailOtp });
  }

  let accessToken = "";
  let refreshToken = "";
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
    };
    if (response.ok && payload.access_token && payload.refresh_token) {
      accessToken = payload.access_token;
      refreshToken = payload.refresh_token;
      break;
    }
  }
  if (!accessToken || !refreshToken) {
    throw new Error("Could not verify magic link for production session");
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
          const row = {
            name: cookie.name,
            value: cookie.value,
            options: cookie.options ?? {},
          };
          if (existing >= 0) pending[existing] = row;
          else pending.push(row);
        }
      },
    },
  });
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionError) throw new Error(sessionError.message);

  await page.context().addCookies(
    pending.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: ".ironframegrc.com",
      path: typeof cookie.options.path === "string" ? cookie.options.path : "/",
      httpOnly: Boolean(cookie.options.httpOnly ?? true),
      secure: true,
      sameSite: "Lax" as const,
    })),
  );
}

test.describe("Ironboard ops portal production", () => {
  test("loads Cloud Run iframe and answers Query", async ({ page }) => {
    test.setTimeout(180_000);
    await bootstrapProductionSession(page);

    const health = await page.request.get(`${APEX}/api/admin/operations-hub/ironboard-health`);
    const healthJson = await health.json();
    console.log("health", health.status(), healthJson);

    const healthFromPage: Array<Record<string, unknown>> = [];
    page.on("response", async (response) => {
      if (!response.url().includes("ironboard-health")) return;
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = await response.text().catch(() => null);
      }
      healthFromPage.push({
        status: response.status(),
        url: response.url(),
        body,
      });
    });

    await page.goto(`${APEX}/dashboard/operations/ironboard`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // Browser-origin fetch (same path the React client uses).
    const browserFetch = await page.evaluate(async () => {
      const started = Date.now();
      try {
        const response = await fetch("/api/admin/operations-hub/ironboard-health", {
          cache: "no-store",
        });
        const text = await response.text();
        return {
          ok: response.ok,
          status: response.status,
          ms: Date.now() - started,
          text: text.slice(0, 500),
        };
      } catch (error) {
        return {
          ok: false,
          status: 0,
          ms: Date.now() - started,
          text: error instanceof Error ? error.message : String(error),
        };
      }
    });
    console.log("browserFetch", browserFetch);

    const iframe = page.frameLocator('iframe[title="IronBoard 17-Agent Boardroom"]');
    const iframeEl = page.locator('iframe[title="IronBoard 17-Agent Boardroom"]');
    const offline = page.getByText("Ironboard engine offline");
    const probing = page.getByText("Probing Ironboard engine health");

    await Promise.race([
      iframeEl.waitFor({ state: "attached", timeout: 45_000 }),
      offline.waitFor({ state: "visible", timeout: 45_000 }),
    ]).catch(() => undefined);

    const offlineVisible = await offline.isVisible().catch(() => false);
    const probingVisible = await probing.isVisible().catch(() => false);
    const iframeCount = await iframeEl.count();
    const iframeSrc = iframeCount ? await iframeEl.first().getAttribute("src") : null;
    const bodyText = (await page.locator("main").innerText().catch(() => "")).slice(0, 800);
    console.log({
      offlineVisible,
      probingVisible,
      iframeCount,
      iframeSrc,
      healthFromPage,
      bodyText,
      url: page.url(),
    });

    expect(
      probingVisible,
      `client health check stuck; browserFetch=${JSON.stringify(browserFetch)} healthNet=${JSON.stringify(healthFromPage)}`,
    ).toBe(false);
    expect(offlineVisible, `offline panel should be hidden; health=${JSON.stringify(healthJson)}`).toBe(
      false,
    );
    expect(iframeSrc).toContain("ironframe-ironboard");

    await expect(iframe.locator("#query-form")).toBeVisible({ timeout: 60_000 });
    await iframe.locator("#user-prompt").fill("Say hi in one word.");
    await iframe.locator("#submit-btn").click();

    await expect
      .poll(
        async () => {
          const text = (await iframe.locator("#chat-window").innerText()).trim();
          return text.length > 20 ? text : "";
        },
        { timeout: 90_000, intervals: [500, 1000, 2000] },
      )
      .not.toEqual("");

    const chat = await iframe.locator("#chat-window").innerText();
    console.log("chat_snip", chat.slice(0, 300));
    expect(chat.toLowerCase()).not.toContain("live stream faulted");
  });
});
