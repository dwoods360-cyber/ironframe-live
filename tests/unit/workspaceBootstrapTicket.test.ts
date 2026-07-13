import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  WORKSPACE_BOOTSTRAP_TTL_MS,
  authorizeWorkspaceBootstrapMint,
  consumeWorkspaceBootstrapTicket,
  mintWorkspaceBootstrapTicket,
  resetWorkspaceBootstrapTicketStoreForTests,
} from "@/app/lib/auth/workspaceBootstrapTicket";
import {
  buildWorkspaceBootstrapRedeemUrl,
  mintWorkspaceBootstrapHandoffUrl,
} from "@/app/lib/auth/workspaceSessionBootstrap";

vi.mock("@/app/lib/tenantSlugRegistry", () => ({
  lookupTenantBySlug: vi.fn(async (slug: string) => {
    if (slug === "acorp") return { id: "tenant-acorp-uuid", slug: "acorp", name: "acorp" };
    if (slug === "run3") return { id: "tenant-run3-uuid", slug: "run3", name: "Run 3" };
    return null;
  }),
}));

vi.mock("@/app/lib/security/tenantMembershipGuard", () => ({
  userHasTenantRoleAssignment: vi.fn(async (userId: string, tenantUuid: string) => {
    return userId === "wil-user" && tenantUuid === "tenant-acorp-uuid";
  }),
}));

vi.mock("@/app/lib/auth/platformAdminAccess", () => ({
  isPlatformAdministratorIdentity: vi.fn(async () => false),
}));

describe("workspace bootstrap ticket store", () => {
  beforeEach(() => {
    resetWorkspaceBootstrapTicketStoreForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-23T12:00:00.000Z"));
  });

  afterEach(() => {
    resetWorkspaceBootstrapTicketStoreForTests();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("mints compact handoff tokens without embedding Supabase JWTs", () => {
    const token = mintWorkspaceBootstrapTicket({
      userId: "wil-user",
      userEmail: "wil@example.com",
      tenantSlug: "acorp",
      tenantUuid: "tenant-acorp-uuid",
      nextPath: "/",
    });

    expect(token.startsWith("bt_")).toBe(true);
    expect(token.length).toBeLessThan(600);

    const first = consumeWorkspaceBootstrapTicket(token, "acorp");
    expect(first?.userId).toBe("wil-user");
    expect(first?.accessToken).toBeUndefined();
    expect(first?.refreshToken).toBeUndefined();
  });

  it("redeems a ticket once for the bound tenant host", () => {
    const token = mintWorkspaceBootstrapTicket({
      userId: "wil-user",
      userEmail: "wil@example.com",
      tenantSlug: "acorp",
      tenantUuid: "tenant-acorp-uuid",
      accessToken: "access",
      refreshToken: "refresh",
      nextPath: "/",
    });

    expect(token.startsWith("bt_")).toBe(true);

    const first = consumeWorkspaceBootstrapTicket(token, "acorp");
    expect(first?.userId).toBe("wil-user");
    expect(first?.tenantSlug).toBe("acorp");

    const second = consumeWorkspaceBootstrapTicket(token, "acorp");
    expect(second).toBeNull();
  });

  it("rejects host/token tenant mismatch and still shreds the ticket", () => {
    const token = mintWorkspaceBootstrapTicket({
      userId: "wil-user",
      tenantSlug: "run3",
      tenantUuid: "tenant-run3-uuid",
      accessToken: "access",
      refreshToken: "refresh",
      nextPath: "/",
    });

    expect(consumeWorkspaceBootstrapTicket(token, "acorp")).toBeNull();
    expect(consumeWorkspaceBootstrapTicket(token, "run3")).toBeNull();
  });

  it("expires tickets after the GRC TTL window", () => {
    const token = mintWorkspaceBootstrapTicket({
      userId: "wil-user",
      tenantSlug: "acorp",
      tenantUuid: "tenant-acorp-uuid",
      accessToken: "access",
      refreshToken: "refresh",
      nextPath: "/",
    });

    vi.advanceTimersByTime(WORKSPACE_BOOTSTRAP_TTL_MS + 1);
    expect(consumeWorkspaceBootstrapTicket(token, "acorp")).toBeNull();
  });
});

describe("mintWorkspaceBootstrapHandoffUrl", () => {
  beforeEach(() => {
    resetWorkspaceBootstrapTicketStoreForTests();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetWorkspaceBootstrapTicketStoreForTests();
  });

  it("returns a tenant bootstrap URL with opaque token only", async () => {
    const url = await mintWorkspaceBootstrapHandoffUrl({
      tenantSlug: "acorp",
      userId: "wil-user",
      userEmail: "wil@example.com",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      nextPath: "/get-started",
    });

    expect(url).toBeTruthy();
    const parsed = new URL(url!);
    expect(parsed.hostname).toBe("acorp.lvh.me");
    expect(parsed.pathname).toBe("/api/auth/session-bootstrap");
    expect(parsed.searchParams.get("token")?.startsWith("bt_")).toBe(true);
    expect(parsed.searchParams.get("access_token")).toBeNull();
    expect(parsed.searchParams.get("refresh_token")).toBeNull();
    expect(parsed.searchParams.get("next")).toBe("/get-started");
  });

  it("denies mint when membership is missing", async () => {
    const url = await mintWorkspaceBootstrapHandoffUrl({
      tenantSlug: "run3",
      userId: "wil-user",
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    expect(url).toBeNull();
  });
});

describe("authorizeWorkspaceBootstrapMint", () => {
  it("resolves tenant uuid for assigned operators", async () => {
    const result = await authorizeWorkspaceBootstrapMint("wil-user", "wil@example.com", "acorp");
    expect(result).toEqual({ tenantUuid: "tenant-acorp-uuid", tenantSlug: "acorp" });
  });
});

describe("buildWorkspaceBootstrapRedeemUrl", () => {
  it("never places Supabase session tokens in the query string", () => {
    const url = buildWorkspaceBootstrapRedeemUrl({
      tenantSlug: "gp3",
      token: "bt_exampletoken",
      nextPath: "/",
    });
    const parsed = new URL(url);
    expect(parsed.hostname).toBe("gp3.lvh.me");
    expect(parsed.searchParams.get("token")).toBe("bt_exampletoken");
    expect(parsed.searchParams.has("access_token")).toBe(false);
    expect(parsed.searchParams.has("refresh_token")).toBe(false);
  });
});
