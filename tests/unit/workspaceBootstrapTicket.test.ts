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
    if (slug === "bwc") return { id: "tenant-bwc-uuid", slug: "bwc", name: "BWC" };
    if (slug === "run3") return { id: "tenant-run3-uuid", slug: "run3", name: "Run 3" };
    return null;
  }),
}));

vi.mock("@/app/lib/security/tenantMembershipGuard", () => ({
  userHasTenantRoleAssignment: vi.fn(async (userId: string, tenantUuid: string) => {
    return userId === "wil-user" && tenantUuid === "tenant-bwc-uuid";
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
      tenantSlug: "bwc",
      tenantUuid: "tenant-bwc-uuid",
      nextPath: "/",
    });

    expect(token.startsWith("bt_")).toBe(true);
    expect(token.length).toBeLessThan(600);

    const first = consumeWorkspaceBootstrapTicket(token, "bwc");
    expect(first?.userId).toBe("wil-user");
    expect(first?.accessToken).toBeUndefined();
    expect(first?.refreshToken).toBeUndefined();
  });

  it("redeems a ticket once for the bound tenant host", () => {
    const token = mintWorkspaceBootstrapTicket({
      userId: "wil-user",
      userEmail: "wil@example.com",
      tenantSlug: "bwc",
      tenantUuid: "tenant-bwc-uuid",
      accessToken: "access",
      refreshToken: "refresh",
      nextPath: "/",
    });

    expect(token.startsWith("bt_")).toBe(true);

    const first = consumeWorkspaceBootstrapTicket(token, "bwc");
    expect(first?.userId).toBe("wil-user");
    expect(first?.tenantSlug).toBe("bwc");

    const second = consumeWorkspaceBootstrapTicket(token, "bwc");
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

    expect(consumeWorkspaceBootstrapTicket(token, "bwc")).toBeNull();
    expect(consumeWorkspaceBootstrapTicket(token, "run3")).toBeNull();
  });

  it("expires tickets after the GRC TTL window", () => {
    const token = mintWorkspaceBootstrapTicket({
      userId: "wil-user",
      tenantSlug: "bwc",
      tenantUuid: "tenant-bwc-uuid",
      accessToken: "access",
      refreshToken: "refresh",
      nextPath: "/",
    });

    vi.advanceTimersByTime(WORKSPACE_BOOTSTRAP_TTL_MS + 1);
    expect(consumeWorkspaceBootstrapTicket(token, "bwc")).toBeNull();
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
      tenantSlug: "bwc",
      userId: "wil-user",
      userEmail: "wil@example.com",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      nextPath: "/get-started",
    });

    expect(url).toBeTruthy();
    const parsed = new URL(url!);
    expect(parsed.hostname).toBe("bwc.lvh.me");
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
    const result = await authorizeWorkspaceBootstrapMint("wil-user", "wil@example.com", "bwc");
    expect(result).toEqual({ tenantUuid: "tenant-bwc-uuid", tenantSlug: "bwc" });
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
