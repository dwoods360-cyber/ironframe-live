import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Header #2 chip destinations — each must resolve to an App Router page file. */
const HEADER_TWO_ROUTE_FIXTURES: Array<{ href: string; pagePath: string }> = [
  { href: "/", pagePath: "app/page.tsx" },
  { href: "/vendors", pagePath: "app/vendors/page.tsx" },
  { href: "/vendors/supply-chain", pagePath: "app/vendors/supply-chain/page.tsx" },
  { href: "/config", pagePath: "app/config/page.tsx" },
  { href: "/profile", pagePath: "app/(dashboard)/profile/page.tsx" },
  { href: "/vault", pagePath: "app/vault/page.tsx" },
  { href: "/reports/audit-trail", pagePath: "app/reports/audit-trail/page.tsx" },
  { href: "/integrity", pagePath: "app/(dashboard)/integrity/page.tsx" },
  { href: "/audit", pagePath: "app/(dashboard)/audit/page.tsx" },
  { href: "/boardroom/admin/audit-logs", pagePath: "app/(dashboard)/boardroom/admin/audit-logs/page.tsx" },
  { href: "/board-report", pagePath: "app/(dashboard)/board-report/page.tsx" },
  { href: "/opsupport", pagePath: "app/(dashboard)/opsupport/page.tsx" },
  { href: "/admin/clearance", pagePath: "app/admin/clearance/page.tsx" },
  { href: "/reports", pagePath: "app/reports/page.tsx" },
];

describe("header nav route fixtures", () => {
  it("maps Header #2 chip hrefs to existing page modules", () => {
    for (const fixture of HEADER_TWO_ROUTE_FIXTURES) {
      const absolute = join(process.cwd(), fixture.pagePath);
      expect(existsSync(absolute), `${fixture.href} -> ${fixture.pagePath}`).toBe(true);
    }
  });
});
