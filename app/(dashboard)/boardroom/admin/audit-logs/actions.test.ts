import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";

import { getSecureAuditLogs } from "./actions";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { isPlatformAdministratorIdentity } from "@/app/lib/auth/platformAdminAccess";
import prisma from "@/lib/prisma";

const TENANT_AUDIT_PRIVILEGED_ROLES = [
  UserRole.CISO,
  UserRole.GRC_MANAGER,
  UserRole.DIRECTOR_OF_COMPLIANCE,
  UserRole.INTERNAL_AUDITOR,
  UserRole.GLOBAL_ADMIN,
];

const AUDIT_LOG_FIND_MANY_ARGS = {
  orderBy: { createdAt: "desc" as const },
  take: 50,
  select: {
    id: true,
    action: true,
    justification: true,
    createdAt: true,
  },
};

vi.mock("@/app/utils/serverAuth", () => ({
  getSupabaseSessionUser: vi.fn(),
}));

vi.mock("@/app/lib/auth/platformAdminAccess", () => ({
  isPlatformAdministratorIdentity: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    tenant: {
      findUnique: vi.fn(),
    },
    userRoleAssignment: {
      findFirst: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
  },
}));

describe("Ironguard Security Gate: getSecureAuditLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isPlatformAdministratorIdentity).mockResolvedValue(false);
  });

  it("rejects immediately with UNAUTHORIZED_ACCESS_DENIED if no session exists", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue(null);

    await expect(getSecureAuditLogs("acorp")).rejects.toThrowError("UNAUTHORIZED_ACCESS_DENIED");

    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
    expect(prisma.userRoleAssignment.findFirst).not.toHaveBeenCalled();
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only user id before any database access", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "   ",
      email: "blank@acorp.test",
    } as never);

    await expect(getSecureAuditLogs("acorp")).rejects.toThrowError("UNAUTHORIZED_ACCESS_DENIED");

    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
    expect(prisma.userRoleAssignment.findFirst).not.toHaveBeenCalled();
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("rejects with ACCESS_VIOLATION if the user exists but lacks a privileged tenant role", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "user_regular_123",
      email: "member@acorp.test",
    } as never);

    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-uuid-acorp",
      slug: "acorp",
    } as never);

    vi.mocked(prisma.userRoleAssignment.findFirst).mockResolvedValue(null);

    await expect(getSecureAuditLogs("acorp")).rejects.toThrowError(
      "ACCESS_VIOLATION: Insufficient privileges for target tenant workspace.",
    );

    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("allows data extraction and serializes amount cents from audit justification", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "user_admin_999",
      email: "ciso@acorp.test",
    } as never);

    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-uuid-acorp",
      slug: "acorp",
    } as never);

    vi.mocked(prisma.userRoleAssignment.findFirst).mockResolvedValue({
      id: "assign_abc",
    } as never);

    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      {
        id: "log_1",
        action: "STRIPE_PAYMENT_INTENT_BILLING_ACTIVE",
        justification:
          "Stripe payment_intent.succeeded (pi_test) activated billing for acorp; amount_received_cents=2000.",
        createdAt: new Date("2026-06-17T10:55:00.000Z"),
      },
    ] as never);

    const result = await getSecureAuditLogs("acorp");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "log_1",
      action: "STRIPE_PAYMENT_INTENT_BILLING_ACTIVE",
      tenantSlug: "acorp",
      amountReceivedCents: "2000",
      createdAt: "2026-06-17T10:55:00.000Z",
    });
  });
});

describe("VALIDATION & SANITIZATION VECTOR", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isPlatformAdministratorIdentity).mockResolvedValue(false);
  });

  it("rejects if the tenantSlug is malformed or becomes empty after trimming", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "user_dev_123",
    } as never);

    await expect(getSecureAuditLogs("   ")).rejects.toThrowError(
      "ACCESS_VIOLATION: Invalid tenant workspace slug.",
    );
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it("throws unprovisioned exception when tenant row is missing from DB", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "user_dev_123",
    } as never);

    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null);

    await expect(getSecureAuditLogs("ghost-tenant")).rejects.toThrowError(
      "ACCESS_VIOLATION: Target tenant workspace is not provisioned.",
    );
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("trims padded tenant slug input before lookup", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "user_dev_123",
    } as never);

    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-uuid-acorp",
      slug: "acorp",
    } as never);

    vi.mocked(prisma.userRoleAssignment.findFirst).mockResolvedValue({
      id: "assign_1",
    } as never);

    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

    await getSecureAuditLogs("  acorp  ");

    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { slug: "acorp" },
      select: { id: true, slug: true },
    });
  });
});

describe("GLOBAL PLATFORM ADMINISTRATOR VECTOR", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bypasses userRoleAssignment and extracts logs for verified GLOBAL_ADMIN", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "global_super_user",
    } as never);

    vi.mocked(isPlatformAdministratorIdentity).mockResolvedValue(true);

    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-uuid-acorp",
      slug: "acorp",
    } as never);

    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      {
        id: "log_super",
        action: "STRIPE_PAYMENT_INTENT_BILLING_ACTIVE",
        justification: "amount_received_cents=5000",
        createdAt: new Date("2026-06-17T10:55:00.000Z"),
      },
    ] as never);

    const result = await getSecureAuditLogs("acorp");

    expect(result).toHaveLength(1);
    expect(result[0].amountReceivedCents).toBe("5000");
    expect(prisma.userRoleAssignment.findFirst).not.toHaveBeenCalled();
  });
});

describe("STRICT QUERY CONSTRAINT ENFORCEMENT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isPlatformAdministratorIdentity).mockResolvedValue(false);
  });

  it("calls Prisma with precise tenantId filter to prevent cross-tenant bleed", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "user_target_777",
    } as never);

    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-uuid-acorp",
      slug: "acorp",
    } as never);

    vi.mocked(prisma.userRoleAssignment.findFirst).mockResolvedValue({
      id: "role_assign_1",
    } as never);

    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

    await getSecureAuditLogs("acorp");

    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { slug: "acorp" },
      select: { id: true, slug: true },
    });

    expect(prisma.userRoleAssignment.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user_target_777",
        tenantId: "tenant-uuid-acorp",
        role: { in: TENANT_AUDIT_PRIVILEGED_ROLES },
      },
      select: { id: true },
    });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: { tenantId: "tenant-uuid-acorp" },
      ...AUDIT_LOG_FIND_MANY_ARGS,
    });
  });

  it("trims padded user id before privileged role lookup", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "  user_target_777  ",
    } as never);

    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-uuid-acorp",
      slug: "acorp",
    } as never);

    vi.mocked(prisma.userRoleAssignment.findFirst).mockResolvedValue({
      id: "role_assign_1",
    } as never);

    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

    await getSecureAuditLogs("acorp");

    expect(prisma.userRoleAssignment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user_target_777",
        }),
      }),
    );
  });
});

describe("FINANCIAL METRIC PARSING FALLBACK VECTOR", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isPlatformAdministratorIdentity).mockResolvedValue(false);
  });

  it("falls back to zero cents when justification is null or unparseable", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "user_admin_1",
    } as never);

    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-uuid-acorp",
      slug: "acorp",
    } as never);

    vi.mocked(prisma.userRoleAssignment.findFirst).mockResolvedValue({
      id: "assign_1",
    } as never);

    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      {
        id: "log_empty_just",
        action: "WORKSPACE_METADATA_UPDATED",
        justification: "Workspace updated metadata values cleanly.",
        createdAt: new Date("2026-06-17T10:55:00.000Z"),
      },
      {
        id: "log_null_just",
        action: "WORKSPACE_METADATA_UPDATED",
        justification: null,
        createdAt: new Date("2026-06-17T10:56:00.000Z"),
      },
    ] as never);

    const result = await getSecureAuditLogs("acorp");

    expect(result[0].amountReceivedCents).toBe("0");
    expect(result[1].amountReceivedCents).toBe("0");
  });

  it("falls back to zero cents when justification is undefined", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "user_admin_1",
    } as never);

    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-uuid-acorp",
      slug: "acorp",
    } as never);

    vi.mocked(prisma.userRoleAssignment.findFirst).mockResolvedValue({
      id: "assign_1",
    } as never);

    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      {
        id: "log_undefined_just",
        action: "WORKSPACE_METADATA_UPDATED",
        justification: undefined,
        createdAt: new Date("2026-06-17T10:57:00.000Z"),
      },
    ] as never);

    const result = await getSecureAuditLogs("acorp");

    expect(result).toHaveLength(1);
    expect(result[0].amountReceivedCents).toBe("0");
  });
});
