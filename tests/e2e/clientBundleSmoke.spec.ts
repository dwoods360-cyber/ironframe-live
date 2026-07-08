import { test, expect } from "@playwright/test";

import { bootstrapApexOperatorSession, openWorkspaceCommandPost } from "./helpers/commandPostDiagnostic";
import { skipUnlessDashboard, waitForDashboardReady } from "./helpers/dashboardGate";

const OPERATOR_EMAIL =
  process.env.IRONFRAME_E2E_OPERATOR_EMAIL?.trim() || "dwoods360@gmail.com";

/**
 * Guards against client bundles importing Node-only modules (e.g. async_hooks via prisma).
 */
test.describe("Client bundle smoke", () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    test.skip(
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
      "SUPABASE_SERVICE_ROLE_KEY required to mint apex session",
    );
    await bootstrapApexOperatorSession(page, OPERATOR_EMAIL);
    await openWorkspaceCommandPost(page, "medshield");
  });

  test("command post dashboard compiles and mounts ThreatPipeline shell", async ({ page }) => {
    const compileErrors: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      if (
        text.includes("async_hooks") ||
        text.includes("Failed to compile") ||
        text.includes("Module not found")
      ) {
        compileErrors.push(text);
      }
    });
    page.on("pageerror", (err) => {
      if (err.message.includes("async_hooks") || err.message.includes("Module not found")) {
        compileErrors.push(err.message);
      }
    });

    await page.goto(new URL("/", page.url()).href, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const mode = await waitForDashboardReady(page);
    skipUnlessDashboard(mode);

    await expect(page.getByText("Protected Tenants").first()).toBeVisible({ timeout: 15_000 });
    await expect(
      page
        .getByRole("button", { name: /Manual Risk REGISTRATION/i })
        .or(page.getByTestId("pipeline-attack-velocity"))
        .first(),
    ).toBeVisible({ timeout: 20_000 });

    expect(compileErrors, compileErrors.join("\n")).toEqual([]);
  });
});
