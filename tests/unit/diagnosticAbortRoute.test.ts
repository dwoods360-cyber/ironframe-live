import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const requirePlatformAdministrator = vi.fn();
const findMany = vi.fn();

vi.mock("@/app/lib/auth/platformAdminAccess", () => ({
  requirePlatformAdministrator,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    systemHealthLog: {
      findMany,
    },
  },
}));

vi.mock("@/app/lib/server/persistDiagnosticAbortLog", () => ({
  persistDiagnosticAbortLog: vi.fn(),
}));

describe("api/opsupport/diagnostic-abort", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([]);
  });

  it("GET returns 403 for non-platform administrators", async () => {
    requirePlatformAdministrator.mockResolvedValue({ error: "GLOBAL_ADMIN role required." });
    const { GET } = await import("@/app/api/opsupport/diagnostic-abort/route");
    const res = await GET();
    expect(res.status).toBe(403);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("GET returns rows for platform administrators", async () => {
    requirePlatformAdministrator.mockResolvedValue({ userId: "admin-1" });
    findMany.mockResolvedValue([
      {
        id: "row-1",
        createdAt: new Date("2026-06-27T12:00:00.000Z"),
        detail: "dashboard-fetch-timeout | surface=DashboardHomeClient",
        meta: {
          reason: "dashboard-fetch-timeout",
          surface: "DashboardHomeClient",
          path: "/api/dashboard",
          method: "GET",
        },
      },
    ]);
    const { GET } = await import("@/app/api/opsupport/diagnostic-abort/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: Array<{ reason: string }> };
    expect(body.rows[0]?.reason).toBe("dashboard-fetch-timeout");
  });

  it("POST returns 403 for non-platform administrators", async () => {
    requirePlatformAdministrator.mockResolvedValue({ error: "GLOBAL_ADMIN role required." });
    const { POST } = await import("@/app/api/opsupport/diagnostic-abort/route");
    const res = await POST(
      new Request("http://localhost/api/opsupport/diagnostic-abort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "inline-doc-unmount" }),
      }),
    );
    expect(res.status).toBe(403);
  });
});
