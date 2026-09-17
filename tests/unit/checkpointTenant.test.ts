import { describe, expect, it } from "vitest";
import {
  NIL_TENANT_UUID,
  assertCheckpointTenantParity,
  composeCheckpointThreadId,
  parseCheckpointThreadTenant,
  requireCheckpointTenantUuid,
  tenantIdFromCheckpointValues,
} from "@/src/services/orchestration/checkpointTenant";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";

describe("checkpoint tenant binding", () => {
  it("rejects missing, malformed, and nil tenant UUIDs", () => {
    expect(() => requireCheckpointTenantUuid("")).toThrow("IRONGUARD_SESSION_TENANT_UUID_REQUIRED");
    expect(() => requireCheckpointTenantUuid("not-a-uuid")).toThrow(
      "IRONGUARD_SESSION_TENANT_UUID_REQUIRED",
    );
    expect(() => requireCheckpointTenantUuid(NIL_TENANT_UUID)).toThrow(
      "IRONGUARD_SESSION_TENANT_UUID_REQUIRED",
    );
  });

  it("prefixes thread ids with the caller tenant and refuses cross-tenant prefixes", () => {
    expect(composeCheckpointThreadId(TENANT_A, "thread-1")).toBe(`${TENANT_A}::thread-1`);
    expect(composeCheckpointThreadId(TENANT_A, `${TENANT_A}::thread-1`)).toBe(
      `${TENANT_A}::thread-1`,
    );
    expect(() => composeCheckpointThreadId(TENANT_A, `${TENANT_B}::thread-1`)).toThrow(
      /CRITICAL_TENANT_VIOLATION/,
    );
  });

  it("parses tenant prefixes and ignores unbound or nil threads", () => {
    expect(parseCheckpointThreadTenant(`${TENANT_A}::abc`)).toBe(TENANT_A);
    expect(parseCheckpointThreadTenant("abc")).toBeNull();
    expect(parseCheckpointThreadTenant(`${NIL_TENANT_UUID}::abc`)).toBeNull();
  });

  it("fails closed when a checkpoint stamp is missing or mismatched", () => {
    const threadId = `${TENANT_A}::thread-1`;
    expect(() =>
      assertCheckpointTenantParity({
        callerTenant: TENANT_A,
        threadId,
        channelValues: { title: "unstamped" },
      }),
    ).toThrow(/missing a checkpoint tenant stamp/);

    expect(() =>
      assertCheckpointTenantParity({
        callerTenant: TENANT_A,
        threadId,
        channelValues: { tenant_id: TENANT_B },
      }),
    ).toThrow(/CRITICAL_TENANT_VIOLATION/);

    expect(
      assertCheckpointTenantParity({
        callerTenant: TENANT_A,
        threadId,
        channelValues: { tenant_id: TENANT_A },
      }),
    ).toBe(TENANT_A);
  });

  it("does not treat a nil graph default as a valid checkpoint stamp", () => {
    expect(tenantIdFromCheckpointValues({ tenant_id: NIL_TENANT_UUID })).toBeNull();
  });
});
