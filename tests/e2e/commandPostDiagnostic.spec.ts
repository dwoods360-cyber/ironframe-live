import { test, expect } from "@playwright/test";

import { runCommandPostClickDiagnostic } from "./helpers/commandPostDiagnostic";

const OPERATOR_EMAIL =
  process.env.E2E_OPERATOR_EMAIL?.trim().toLowerCase() || "dwoods360@gmail.com";

test.describe.configure({ mode: "serial" });

test.describe("Command Post diagnostic", () => {
  test("integrity hub chip wiring and click navigation", async ({ page }) => {
    test.skip(
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
      "SUPABASE_SERVICE_ROLE_KEY required to mint apex session",
    );

    const report = await runCommandPostClickDiagnostic(page, OPERATOR_EMAIL);

    // Always print — this spec is diagnostic, not a gate.
    console.log("\n=== COMMAND POST DIAGNOSTIC ===");
    console.log(JSON.stringify(report, null, 2));
    console.log("=== END DIAGNOSTIC ===\n");

    expect(report.commandPost.found, "COMMAND POST chip must render on /integrity").toBe(true);
    expect(report.supabaseCookieCount, "Supabase auth cookies must be present on 127.0.0.1").toBeGreaterThan(0);

    if (report.commandPost.href === "/") {
      throw new Error("STALE_WIRING: Command Post chip still uses href=/ (redirects to /integrity on apex).");
    }

    if (report.commandPost.href === "#" && report.commandPost.ready === "false") {
      throw new Error(
        `SLUG_UNRESOLVED: Command Post ready=false slug=${report.commandPost.slug ?? "null"} cookie=${report.ironframeTenantCookie ?? "null"}`,
      );
    }

    if (!report.workspaceLaunchSeen) {
      throw new Error(
        `NO_WORKSPACE_LAUNCH: click did not request /api/auth/workspace-launch. network=${report.networkEvents.join(" | ") || "none"} finalUrl=${report.urlAfterClick}`,
      );
    }

    const onTenantHost = report.urlAfterClick.includes("gridcore.lvh.me");
    const onIntegrity = report.urlAfterClick.includes("/integrity");
    const onApexLogin = report.urlAfterClick.includes("127.0.0.1:3000/login");

    if (onIntegrity && !onTenantHost) {
      throw new Error(
        `INTEGRITY_LOOP: landed on ${report.urlAfterClick} after Command Post click. network=${report.networkEvents.join(" | ")}`,
      );
    }

    if (onApexLogin) {
      throw new Error(
        `APEX_LOGIN_LOOP: workspace-launch sent to apex /login (middleware RULE B may bounce to /integrity). network=${report.networkEvents.join(" | ")}`,
      );
    }

    expect(onTenantHost || report.urlAfterClick.includes("session-bootstrap")).toBe(true);
  });
});
