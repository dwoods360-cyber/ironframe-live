import { devices, expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const APEX =
  process.env.E2E_PRODUCTION_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://ironframegrc.com";
const EMAIL =
  process.env.IRONFRAME_DEV_SUPABASE_EMAIL?.trim().toLowerCase() ||
  process.env.IRONFRAME_E2E_OPERATOR_EMAIL?.trim().toLowerCase() ||
  "dwoods360@gmail.com";

/** Serialize Supabase generateLink — parallel workers invalidate each other's OTP. */
let productionAuthBootstrapChain: Promise<void> = Promise.resolve();

/** Viewport + UA only — avoid defaultBrowserType which Playwright forbids inside describe. */
const MOBILE_VIEWPORTS = [
  {
    name: "iPhone 14",
    viewport: devices["iPhone 14"].viewport!,
    userAgent: devices["iPhone 14"].userAgent!,
    isMobile: true,
    hasTouch: true,
  },
  {
    name: "Pixel 7",
    viewport: devices["Pixel 7"].viewport!,
    userAgent: devices["Pixel 7"].userAgent!,
    isMobile: true,
    hasTouch: true,
  },
] as const;

async function bootstrapProductionSessionInner(page: import("@playwright/test").Page) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !serviceKey || !anonKey) {
    test.skip(true, "Missing Supabase env for production auth");
    return;
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
    attempts.push({ type: "email", email: EMAIL, token: emailOtp });
  }

  let accessToken = "";
  let refreshToken = "";
  let lastDetail = "no token";
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
      accessToken = payload.access_token;
      refreshToken = payload.refresh_token;
      break;
    }
    lastDetail = payload.error_description || payload.msg || `${response.status}`;
  }
  if (!accessToken || !refreshToken) {
    throw new Error(`Could not verify magic link for production session (${lastDetail})`);
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

  const cookieDomain = new URL(APEX).hostname.includes("ironframegrc.com")
    ? ".ironframegrc.com"
    : new URL(APEX).hostname;

  await page.context().addCookies(
    pending.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookieDomain,
      path: typeof cookie.options.path === "string" ? cookie.options.path : "/",
      httpOnly: Boolean(cookie.options.httpOnly ?? true),
      secure: cookieDomain.includes("ironframegrc.com") || APEX.startsWith("https"),
      sameSite: "Lax" as const,
    })),
  );
}

async function bootstrapProductionSession(page: import("@playwright/test").Page) {
  await (productionAuthBootstrapChain = productionAuthBootstrapChain.then(() =>
    bootstrapProductionSessionInner(page),
  ));
}

function assertNoShellFailure(bodyText: string, url: string) {
  expect(bodyText, `shell failure on ${url}`).not.toMatch(
    /Application shell failure|Ops Hub hit an error|root layout could not render/i,
  );
}

test.describe.configure({ mode: "serial" });

for (const mobile of MOBILE_VIEWPORTS) {
  test.describe(`Mobile smoke (${mobile.name})`, () => {
    test.use({
      viewport: mobile.viewport,
      userAgent: mobile.userAgent,
      isMobile: mobile.isMobile,
      hasTouch: mobile.hasTouch,
    });
    test.setTimeout(180_000);

    test("login, integrity, and Ops Hub mount without shell failure", async ({ page }) => {
      test.skip(
        process.env.E2E_PRODUCTION !== "1" &&
          process.env.PLAYWRIGHT_TARGET?.trim().toLowerCase() !== "production",
        "Set E2E_PRODUCTION=1 to run against production.",
      );

      const pageErrors: string[] = [];
      page.on("pageerror", (err) => {
        pageErrors.push(err.message);
      });

      await bootstrapProductionSession(page);

      await page.goto(`${APEX}/login?fresh=1`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      assertNoShellFailure(await page.locator("body").innerText(), page.url());

      await page.goto(`${APEX}/integrity`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.waitForTimeout(1_500);
      const integrityText = await page.locator("body").innerText();
      assertNoShellFailure(integrityText, page.url());
      expect(page.url()).not.toMatch(/\/login/);

      await page.goto(`${APEX}/dashboard/operations`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await page.waitForTimeout(2_500);

      const opsText = await page.locator("body").innerText();
      assertNoShellFailure(opsText, page.url());
      expect(page.url()).toContain("/dashboard/operations");

      await expect(page.getByRole("heading", { name: /Ops Today/i })).toBeVisible({
        timeout: 45_000,
      });
      await expect(page.getByRole("link", { name: "Today" })).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Refresh telemetry|Refreshing/i }),
      ).toBeVisible();

      await expect(
        page
          .getByText(/Loading workforce chat/i)
          .or(page.getByText(/Conversation \+ PTT|IronBoard|Ask|PTT/i).first()),
      ).toBeVisible({ timeout: 30_000 });

      // Chip bar should be horizontally scrollable on narrow viewports
      const chipBar = page.getByTestId("header-two-chip-bar");
      await expect(chipBar).toBeVisible();
      const overflow = await chipBar.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      expect(overflow, "header chips should overflow on mobile width").toBe(true);

      const fatalClient = pageErrors.filter((msg) =>
        /Application shell|ChunkLoadError|Failed to find Server Action|reading ['"]workers['"]/i.test(
          msg,
        ),
      );
      expect(fatalClient, fatalClient.join("\n")).toEqual([]);
    });

    test("OPS HUB chip is reachable via horizontal chip scroll", async ({ page }) => {
      test.skip(
        process.env.E2E_PRODUCTION !== "1" &&
          process.env.PLAYWRIGHT_TARGET?.trim().toLowerCase() !== "production",
        "Set E2E_PRODUCTION=1 to run against production.",
      );

      await bootstrapProductionSession(page);
      await page.goto(`${APEX}/integrity`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });

      const opsChip = page.getByTestId("header-operations-hub-chip");
      await expect(opsChip).toBeAttached({ timeout: 30_000 });
      await opsChip.scrollIntoViewIfNeeded();
      await opsChip.click({ timeout: 15_000 });
      await expect(page).toHaveURL(/\/dashboard\/operations/, { timeout: 45_000 });
      assertNoShellFailure(await page.locator("body").innerText(), page.url());
      await expect(page.getByRole("heading", { name: /Ops Today/i })).toBeVisible({
        timeout: 45_000,
      });
    });
  });
}
