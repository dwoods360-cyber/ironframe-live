import { test, expect } from "@playwright/test";
import { bootstrapApexOperatorSession } from "./helpers/commandPostDiagnostic";

const OPERATOR_EMAIL =
  process.env.IRONFRAME_E2E_OPERATOR_EMAIL?.trim() || "dwoods360@gmail.com";

test.describe.configure({ mode: "serial" });

test.describe("Vendors page links", () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapApexOperatorSession(page, OPERATOR_EMAIL);
    await page.goto("/medshield/vendors", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForSelector("text=VENDOR NAME", { state: "visible", timeout: 30_000 });
  });

  test("header chips, add vendor, supply chain, workflow, and activity log", async ({ page }) => {
    await test.step("Add Vendor opens manual ingestion drawer", async () => {
      await page.getByTestId("header-add-vendor-chip").click();
      await expect(page.getByTestId("add-vendor-modal")).toBeVisible({ timeout: 10_000 });
      await page.getByTestId("add-vendor-close").click();
      await expect(page.getByTestId("add-vendor-modal")).toBeHidden({ timeout: 10_000 });
    });

    await test.step("Supply chain graph header link and back link", async () => {
      const supplyChainLink = page.getByTestId("header-supply-chain-graph-chip");
      await supplyChainLink.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForURL(/\/medshield\/vendors\/supply-chain/, { timeout: 20_000 }),
        supplyChainLink.click(),
      ]);
      await expect(page.getByText("Supply Chain Blast Radius")).toBeVisible();
      await page.getByTestId("supply-chain-vendor-registry-link").click();
      await expect(page).toHaveURL(/\/medshield\/vendors\/?$/, { timeout: 15_000 });
    });

    await test.step("Workflow menu items and map view navigation", async () => {
      const actionButton = page.locator('button[aria-label^="Workflow actions"]').first();
      await actionButton.click();
      await expect(page.getByRole("menuitem", { name: "Request SOC2 Update" })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: "Initiate Bulk RFI" })).toBeVisible();

      await Promise.all([
        page.waitForURL(/\/medshield\/vendors\/supply-chain/, { timeout: 20_000 }),
        page.getByRole("menuitem", { name: "Switch to Map View" }).click(),
      ]);
    });

    await test.step("Vendor registry back link from supply chain", async () => {
      await page.getByTestId("supply-chain-vendor-registry-link").click();
      await expect(page).toHaveURL(/\/medshield\/vendors\/?$/, { timeout: 15_000 });
    });

    await test.step("Activity log toolbar button", async () => {
      await Promise.all([
        page.waitForURL(/\/reports\/audit-trail/, { timeout: 20_000 }),
        page.getByTestId("vendors-activity-log").click(),
      ]);
    });
  });

  test("audit trail header chip from vendors registry", async ({ page }) => {
    const auditLink = page.getByTestId("header-audit-trail-chip");
    await auditLink.scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForURL(/\/reports\/audit-trail/, { timeout: 20_000 }),
      auditLink.click(),
    ]);
  });
});
