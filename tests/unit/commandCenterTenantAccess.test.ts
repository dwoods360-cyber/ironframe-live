import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveCommandCenterTenantScope } from "@/app/lib/auth/commandCenterTenantAccess";

const VAULT = "c6932d16-a716-4a07-9bc4-6ec987f641e2";
const MED = "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";
const BWC = "ba130f7c-453e-4c79-a611-0d69c1904a10";
const RUN3 = "ef58739c-ada9-4d2e-89f1-ec8ca625506a";

vi.mock("@/lib/prisma", () => ({
  default: {
    userRoleAssignment: { findMany: vi.fn(), findUnique: vi.fn() },
    tenant: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock("@/app/utils/serverAuth", () => ({
  getSupabaseSessionUser: vi.fn(),
}));

vi.mock("@/app/utils/serverTenantContext", () => ({
  getHostBoundTenantUuid: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { getHostBoundTenantUuid } from "@/app/utils/serverTenantContext";

describe("resolveCommandCenterTenantScope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getHostBoundTenantUuid).mockResolvedValue(null);
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "user-1",
      email: "vault@ciso.example",
    } as never);
    vi.mocked(prisma.userRoleAssignment.findMany).mockResolvedValue([]);
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([]);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null);
  });

  it("returns empty scope for unauthenticated users", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue(null);
    await expect(resolveCommandCenterTenantScope()).resolves.toEqual({
      tenants: [],
      canAccessGlobal: false,
      hostTenantSlug: null,
      canSwitchTenantsOnSubdomain: false,
    });
  });

  it("grants global lane for platform GLOBAL_ADMIN email without RBAC rows", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "owner-1",
      email: "dwoods360@gmail.com",
    } as never);
    vi.mocked(prisma.userRoleAssignment.findMany).mockResolvedValue([]);
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([
      {
        id: MED,
        name: "Medshield",
        slug: "medshield",
        industry: "HEALTH",
        ale_baseline: 100n,
      },
    ] as never);

    const scope = await resolveCommandCenterTenantScope();
    expect(scope.canAccessGlobal).toBe(true);
    expect(scope.hostTenantSlug).toBeNull();
    expect(scope.tenants).toHaveLength(1);
    expect(scope.tenants[0]?.slug).toBe("medshield");
  });

  it("returns only assigned tenants for scoped CISO", async () => {
    vi.mocked(prisma.userRoleAssignment.findMany).mockResolvedValue([
      { tenantId: VAULT, role: "CISO" },
    ] as never);
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([
      {
        id: VAULT,
        name: "Vaultbank NA",
        slug: "vaultbank",
        industry: "FINANCE",
        ale_baseline: 250000000n,
      },
    ] as never);

    const scope = await resolveCommandCenterTenantScope();
    expect(scope.canAccessGlobal).toBe(false);
    expect(scope.hostTenantSlug).toBeNull();
    expect(scope.canSwitchTenantsOnSubdomain).toBe(false);
    expect(scope.tenants).toHaveLength(1);
    expect(scope.tenants[0]?.slug).toBe("vaultbank");
  });

  it("returns assigned tenants and global lane for GLOBAL_ADMIN", async () => {
    vi.mocked(prisma.userRoleAssignment.findMany).mockResolvedValue([
      { tenantId: MED, role: "GLOBAL_ADMIN" },
      { tenantId: VAULT, role: "CISO" },
    ] as never);
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([
      {
        id: MED,
        name: "Medshield",
        slug: "medshield",
        industry: "HEALTH",
        ale_baseline: 100n,
      },
      {
        id: VAULT,
        name: "Vaultbank NA",
        slug: "vaultbank",
        industry: "FINANCE",
        ale_baseline: 200n,
      },
    ] as never);

    const scope = await resolveCommandCenterTenantScope();
    expect(scope.canAccessGlobal).toBe(true);
    expect(scope.hostTenantSlug).toBeNull();
    expect(scope.canSwitchTenantsOnSubdomain).toBe(true);
    expect(scope.tenants).toHaveLength(2);
    expect(prisma.tenant.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        ale_baseline: true,
      },
      orderBy: { name: "asc" },
    });
  });

  it("locks scope to host tenant on subdomain with no global lane", async () => {
    vi.mocked(getHostBoundTenantUuid).mockResolvedValue(VAULT);
    vi.mocked(prisma.userRoleAssignment.findMany).mockResolvedValue([
      { tenantId: VAULT, role: "CISO" },
    ] as never);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: VAULT,
      name: "Vaultbank NA",
      slug: "vaultbank",
      industry: "FINANCE",
      ale_baseline: 250000000n,
    } as never);
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([
      {
        id: VAULT,
        name: "Vaultbank NA",
        slug: "vaultbank",
        industry: "FINANCE",
        ale_baseline: 250000000n,
      },
    ] as never);

    const scope = await resolveCommandCenterTenantScope();
    expect(scope.canAccessGlobal).toBe(false);
    expect(scope.hostTenantSlug).toBe("vaultbank");
    expect(scope.canSwitchTenantsOnSubdomain).toBe(false);
    expect(scope.tenants).toHaveLength(1);
    expect(scope.tenants[0]?.slug).toBe("vaultbank");
    expect(prisma.tenant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [VAULT] } } }),
    );
  });

  it("multi-assigned GRC on subdomain can switch between assigned workspaces", async () => {
    vi.mocked(getHostBoundTenantUuid).mockResolvedValue(RUN3);
    vi.mocked(prisma.userRoleAssignment.findMany).mockResolvedValue([
      { tenantId: RUN3, role: "GRC_MANAGER" },
      { tenantId: BWC, role: "GRC_MANAGER" },
    ] as never);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: RUN3,
      name: "Run #3 — execution sequence",
      slug: "run3",
      industry: "HEALTH",
      ale_baseline: 100n,
    } as never);
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([
      {
        id: RUN3,
        name: "Run #3 — execution sequence",
        slug: "run3",
        industry: "HEALTH",
        ale_baseline: 100n,
      },
      {
        id: BWC,
        name: "The Blackwoods Coffee Co.",
        slug: "bwc",
        industry: "FINANCE",
        ale_baseline: 200n,
      },
    ] as never);

    const scope = await resolveCommandCenterTenantScope();
    expect(scope.hostTenantSlug).toBe("run3");
    expect(scope.canSwitchTenantsOnSubdomain).toBe(true);
    expect(scope.tenants).toHaveLength(2);
    expect(scope.tenants.map((t) => t.slug).sort()).toEqual(["bwc", "run3"]);
    expect(prisma.tenant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [RUN3, BWC] } } }),
    );
  });

  it("GLOBAL_ADMIN on subdomain keeps assigned-tenant switcher", async () => {
    vi.mocked(getHostBoundTenantUuid).mockResolvedValue(MED);
    vi.mocked(prisma.userRoleAssignment.findMany).mockResolvedValue([
      { tenantId: MED, role: "GLOBAL_ADMIN" },
      { tenantId: VAULT, role: "CISO" },
    ] as never);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: MED,
      name: "Medshield",
      slug: "medshield",
      industry: "HEALTH",
      ale_baseline: 100n,
    } as never);
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([
      {
        id: MED,
        name: "Medshield",
        slug: "medshield",
        industry: "HEALTH",
        ale_baseline: 100n,
      },
      {
        id: VAULT,
        name: "Vaultbank NA",
        slug: "vaultbank",
        industry: "FINANCE",
        ale_baseline: 200n,
      },
    ] as never);

    const scope = await resolveCommandCenterTenantScope();
    expect(scope.canAccessGlobal).toBe(false);
    expect(scope.hostTenantSlug).toBe("medshield");
    expect(scope.canSwitchTenantsOnSubdomain).toBe(true);
    expect(scope.tenants).toHaveLength(2);
  });

  it("returns empty scope when host tenant is not assigned", async () => {
    vi.mocked(getHostBoundTenantUuid).mockResolvedValue(VAULT);
    vi.mocked(prisma.userRoleAssignment.findMany).mockResolvedValue([
      { tenantId: MED, role: "CISO" },
    ] as never);

    const scope = await resolveCommandCenterTenantScope();
    expect(scope).toEqual({
      tenants: [],
      canAccessGlobal: false,
      hostTenantSlug: null,
      canSwitchTenantsOnSubdomain: false,
    });
  });
});
