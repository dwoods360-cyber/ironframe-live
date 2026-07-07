import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST as mintSessionBootstrap } from "@/app/api/auth/session-bootstrap/mint/route";
import { GET as redeemSessionBootstrap } from "@/app/api/auth/session-bootstrap/route";
import { GET as launchWorkspace } from "@/app/api/auth/workspace-launch/route";
import {
  resetWorkspaceBootstrapTicketStoreForTests,
  workspaceBootstrapTicketIsPendingForTests,
} from "@/app/lib/auth/workspaceBootstrapTicket";

const mockAuth = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  refreshSession: vi.fn(),
  setSession: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth: mockAuth })),
}));

vi.mock("@/app/lib/tenantSlugRegistry", () => ({
  lookupTenantBySlug: vi.fn(async (slug: string) => {
    if (slug === "bwc") {
      return { id: "tenant-bwc-uuid", slug: "bwc", name: "Blackwoods Coffee" };
    }
    if (slug === "run3") {
      return { id: "tenant-run3-uuid", slug: "run3", name: "Run 3" };
    }
    return null;
  }),
}));

vi.mock("@/app/lib/security/tenantMembershipGuard", () => ({
  userHasTenantRoleAssignment: vi.fn(async (userId: string, tenantUuid: string) => {
    return userId === "wil-user-id" && tenantUuid === "tenant-bwc-uuid";
  }),
}));

vi.mock("@/app/lib/auth/platformAdminAccess", () => ({
  isPlatformAdministratorIdentity: vi.fn(async () => false),
}));

vi.mock("@/app/lib/auth/corporateInviteProvisioning", () => ({
  ensureCorporateInviteRoleAssignment: vi.fn(async () => undefined),
}));

const WIL_USER = {
  id: "wil-user-id",
  email: "wil@blackwoodscoffee.com",
  user_metadata: { tenant_slug: "bwc" },
};

const WIL_SESSION = {
  access_token: "supabase-access-token",
  refresh_token: "supabase-refresh-token",
};

function buildMintRequest(tenantSlug: string, nextPath = "/"): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/session-bootstrap/mint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantSlug, nextPath }),
  });
}

function buildRedeemRequest(
  tenantSlug: string,
  token: string,
  options?: { acceptJson?: boolean; nextPath?: string },
): NextRequest {
  const nextPath = options?.nextPath ?? "/";
  const url = new URL(`http://${tenantSlug}.lvh.me:3000/api/auth/session-bootstrap`);
  url.searchParams.set("token", token);
  url.searchParams.set("next", nextPath);
  const headers: Record<string, string> = { host: `${tenantSlug}.lvh.me:3000` };
  if (options?.acceptJson) {
    headers.accept = "application/json";
  }
  return new NextRequest(url.toString(), { headers });
}

function configureAuthenticatedMintSession(): void {
  mockAuth.getSession.mockResolvedValue({
    data: { session: WIL_SESSION },
    error: null,
  });
  mockAuth.getUser.mockResolvedValue({
    data: { user: WIL_USER },
    error: null,
  });
  mockAuth.refreshSession.mockResolvedValue({
    data: { session: WIL_SESSION },
    error: null,
  });
}

function configureSuccessfulRedeemSession(): void {
  mockAuth.setSession.mockResolvedValue({ data: { session: WIL_SESSION }, error: null });
  mockAuth.getUser.mockResolvedValue({
    data: { user: WIL_USER },
    error: null,
  });
}

describe("session bootstrap perimeter (mint → redeem → reuse rejection)", () => {
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalSupabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    resetWorkspaceBootstrapTicketStoreForTests();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key";
    configureAuthenticatedMintSession();
    configureSuccessfulRedeemSession();
  });

  afterEach(() => {
    resetWorkspaceBootstrapTicketStoreForTests();
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnon;
    vi.clearAllMocks();
  });

  it("workspace-launch redirects to tenant bootstrap in one server hop", async () => {
    const launchRequest = new NextRequest(
      "http://localhost:3000/api/auth/workspace-launch?tenant=bwc&next=/",
    );
    const launchResponse = await launchWorkspace(launchRequest);
    expect(launchResponse.status).toBe(307);

    const location = launchResponse.headers.get("location");
    expect(location).toBeTruthy();
    const bootstrapUrl = new URL(location!);
    expect(bootstrapUrl.hostname).toBe("bwc.lvh.me");
    expect(bootstrapUrl.pathname).toBe("/api/auth/session-bootstrap");
    expect(bootstrapUrl.searchParams.get("token")?.startsWith("bt_")).toBe(true);
  });

  it("workspace-launch sends unauthenticated operators to tenant login, not apex /integrity", async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockAuth.refreshSession.mockResolvedValue({ data: { session: null }, error: null });

    const launchRequest = new NextRequest(
      "http://localhost:3000/api/auth/workspace-launch?tenant=bwc&next=/",
    );
    const launchResponse = await launchWorkspace(launchRequest);
    expect(launchResponse.status).toBe(307);

    const location = launchResponse.headers.get("location");
    expect(location).toBeTruthy();
    const loginUrl = new URL(location!);
    expect(loginUrl.hostname).toBe("bwc.lvh.me");
    expect(loginUrl.pathname).toBe("/login");
    expect(loginUrl.searchParams.get("fresh")).toBe("1");
  });

  it("workspace-launch refreshes session when getSession is empty but getUser is valid", async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockAuth.getUser.mockResolvedValue({
      data: { user: WIL_USER },
      error: null,
    });
    mockAuth.refreshSession.mockResolvedValue({
      data: { session: WIL_SESSION },
      error: null,
    });

    const launchRequest = new NextRequest(
      "http://localhost:3000/api/auth/workspace-launch?tenant=bwc&next=/",
    );
    const launchResponse = await launchWorkspace(launchRequest);
    expect(launchResponse.status).toBe(307);
    expect(mockAuth.refreshSession).toHaveBeenCalled();

    const location = launchResponse.headers.get("location");
    expect(location).toBeTruthy();
    const bootstrapUrl = new URL(location!);
    expect(bootstrapUrl.hostname).toBe("bwc.lvh.me");
    expect(bootstrapUrl.pathname).toBe("/api/auth/session-bootstrap");
    expect(bootstrapUrl.searchParams.get("token")?.startsWith("bt_")).toBe(true);
  });

  it("mints an opaque bt_ ticket for a tenant with active role assignment", async () => {
    const mintResponse = await mintSessionBootstrap(buildMintRequest("bwc", "/integrity"));
    expect(mintResponse.status).toBe(200);

    const mintPayload = (await mintResponse.json()) as { bootstrapUrl?: string };
    expect(mintPayload.bootstrapUrl).toBeTruthy();

    const bootstrapUrl = new URL(mintPayload.bootstrapUrl!);
    expect(bootstrapUrl.hostname).toBe("bwc.lvh.me");
    expect(bootstrapUrl.pathname).toBe("/api/auth/session-bootstrap");

    const token = bootstrapUrl.searchParams.get("token");
    expect(token?.startsWith("bt_")).toBe(true);
    expect(bootstrapUrl.searchParams.get("access_token")).toBeNull();
    expect(bootstrapUrl.searchParams.get("refresh_token")).toBeNull();
    expect(workspaceBootstrapTicketIsPendingForTests(token!)).toBe(true);
  });

  it("denies mint when the operator lacks tenant membership", async () => {
    const mintResponse = await mintSessionBootstrap(buildMintRequest("run3"));
    expect(mintResponse.status).toBe(403);

    const mintPayload = (await mintResponse.json()) as { error?: string };
    expect(mintPayload.error).toBe("tenant_membership_required");
  });

  it("redeems a valid ticket, establishes session cookies, and purges the cache entry", async () => {
    const mintResponse = await mintSessionBootstrap(buildMintRequest("bwc"));
    const { bootstrapUrl } = (await mintResponse.json()) as { bootstrapUrl: string };
    const token = new URL(bootstrapUrl).searchParams.get("token")!;

    const redeemResponse = await redeemSessionBootstrap(buildRedeemRequest("bwc", token));
    expect(redeemResponse.status).toBeGreaterThanOrEqual(300);
    expect(redeemResponse.status).toBeLessThan(400);
    const location = redeemResponse.headers.get("location");
    expect(location).toBeTruthy();
    expect(new URL(location!).hostname).toBe("bwc.lvh.me");
    expect(new URL(location!).pathname).toBe("/");
    expect(mockAuth.setSession).toHaveBeenCalledWith({
      access_token: WIL_SESSION.access_token,
      refresh_token: WIL_SESSION.refresh_token,
    });
    expect(workspaceBootstrapTicketIsPendingForTests(token)).toBe(false);
  });

  it("returns 401 on an immediate second redeem attempt with the identical token", async () => {
    const mintResponse = await mintSessionBootstrap(buildMintRequest("bwc"));
    const { bootstrapUrl } = (await mintResponse.json()) as { bootstrapUrl: string };
    const token = new URL(bootstrapUrl).searchParams.get("token")!;

    const firstRedeem = await redeemSessionBootstrap(buildRedeemRequest("bwc", token));
    expect(firstRedeem.status).toBeGreaterThanOrEqual(300);
    expect(firstRedeem.status).toBeLessThan(400);

    const secondRedeem = await redeemSessionBootstrap(
      buildRedeemRequest("bwc", token, { acceptJson: true }),
    );
    expect(secondRedeem.status).toBe(401);

    const secondPayload = (await secondRedeem.json()) as { error?: string };
    expect(secondPayload.error).toBe("bootstrap_token_invalid");
  });

  it("rejects cross-tenant host binding before session initialization", async () => {
    const mintResponse = await mintSessionBootstrap(buildMintRequest("bwc"));
    const { bootstrapUrl } = (await mintResponse.json()) as { bootstrapUrl: string };
    const token = new URL(bootstrapUrl).searchParams.get("token")!;

    const crossTenantRedeem = await redeemSessionBootstrap(
      buildRedeemRequest("run3", token, { acceptJson: true }),
    );
    expect(crossTenantRedeem.status).toBe(401);

    const payload = (await crossTenantRedeem.json()) as { error?: string };
    expect(payload.error).toBe("bootstrap_token_invalid");
    expect(mockAuth.setSession).not.toHaveBeenCalled();
  });

  it("rejects retired legacy access_token query bootstrap attempts", async () => {
    const legacyUrl = new URL("http://bwc.lvh.me:3000/api/auth/session-bootstrap");
    legacyUrl.searchParams.set("access_token", "leaked-access");
    legacyUrl.searchParams.set("refresh_token", "leaked-refresh");

    const legacyRequest = new NextRequest(legacyUrl.toString(), {
      headers: {
        host: "bwc.lvh.me:3000",
        accept: "application/json",
      },
    });

    const legacyResponse = await redeemSessionBootstrap(legacyRequest);
    expect(legacyResponse.status).toBe(401);

    const legacyPayload = (await legacyResponse.json()) as { error?: string };
    expect(legacyPayload.error).toBe("legacy_bootstrap_retired");
    expect(mockAuth.setSession).not.toHaveBeenCalled();
  });
});
