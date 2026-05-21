/**
 * Burn-In — multi-industry baselines, Ironguard ingress, ledger stress, cold-boot hooks.
 * Run: `npx vitest run tests/stress/burnInIntegrity.test.ts`
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as ironguardSession from "@/app/utils/ironguardSession";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import type { TenantKey } from "@/app/utils/tenantIsolation";
import { TENANT_INDUSTRY_BASELINE_ALE_CENTS } from "@/app/constants/devTenantRoster";
import {
  formatAleEngineManifestLine,
  formatBaselineDriftManifestParts,
  computeBaselineDriftDeltaCents,
} from "@/app/utils/baselineDriftManifest";
import { getTotalCurrentRiskCentsString } from "@/app/utils/riskStoreBigIntMath";
import {
  appendAuditLog,
  clearAuditLedgerMasterPurge,
  getAuditLogs,
  type ForensicEventLevel,
} from "@/app/utils/auditLogger";
import { assertIronguardBeforeFetch } from "@/app/utils/apiClient";
import {
  TENANT_API_CACHE_INVALIDATE_EVENT,
  tenantScopeCache,
} from "@/app/utils/apiCacheCoordinator";
import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import { useRiskStore } from "@/app/store/riskStore";

describe("Burn-In — Task 1: Multi-industry BIGINT anchors & ALE_ENGINE manifest", () => {
  it.each([
    ["medshield", "1110000000"],
    ["vaultbank", "590000000"],
    ["gridcore", "470000000"],
    ["defense", "1600000000"],
  ] as const)("formatAleEngineManifestLine(%s) embeds %s ¢", (key, centsStr) => {
    expect(TENANT_INDUSTRY_BASELINE_ALE_CENTS[key].toString()).toBe(centsStr);
    const line = formatAleEngineManifestLine(key);
    expect(line).toBe(`ALE_ENGINE: BIGINT_DETERMINISTIC (${centsStr} ¢)`);
  });

  it("insurance / ROI offset (riskOffset millions) moves Δ across Defense baseline via BigInt pipeline", () => {
    const baseAccepted = { a: 16 }; // $16M — aligns with defense narrative when liabilities empty
    const liabilities = {};
    const active0 = BigInt(getTotalCurrentRiskCentsString(baseAccepted, liabilities, 0));
    const activeMitigated = BigInt(getTotalCurrentRiskCentsString(baseAccepted, liabilities, 3));
    const d0 = computeBaselineDriftDeltaCents(active0, "defense");
    const d1 = computeBaselineDriftDeltaCents(activeMitigated, "defense");
    expect(d1 < d0).toBe(true);
    const m0 = formatBaselineDriftManifestParts(active0, "defense");
    const m1 = formatBaselineDriftManifestParts(activeMitigated, "defense");
    expect(m0.text).not.toBe(m1.text);
  });

  it.each(["medshield", "vaultbank", "gridcore", "defense"] as const)(
    "slider-style offset changes DRIFT_DELTA text for %s",
    (key: TenantKey) => {
      const b = TENANT_INDUSTRY_BASELINE_ALE_CENTS[key];
      const low = formatBaselineDriftManifestParts(b - 50_000_000n, key).text;
      const high = formatBaselineDriftManifestParts(b + 50_000_000n, key).text;
      expect(low).not.toBe(high);
    },
  );
});

describe("Burn-In — Task 2: Red-team ingress (Ironguard + Sentinel audit row)", () => {
  beforeEach(() => {
    clearAuditLedgerMasterPurge();
    vi.spyOn(ironguardSession, "getIronguardEffectiveTenant").mockReturnValue(TENANT_UUIDS.defense);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("KIM-style insider: Defense session + Medshield target URL → TENANT_MISMATCH block + SECURITY ALERT ledger line", async () => {
    expect(() =>
      assertIronguardBeforeFetch(
        new Request(`${window.location.origin}/api/records`, {
          headers: { "x-target-tenant-id": TENANT_UUIDS.medshield },
        }),
      ),
    ).toThrow();

    await new Promise<void>((r) => queueMicrotask(r));

    const row = getAuditLogs()[0];
    expect(row.description).toMatch(/^#\d{3} \| IRONGUARD \| 🚨 \|/);
    expect(row.description).toContain("[ 🚨 SECURITY ALERT ]");
    expect(row.description).toContain("BLOCKED:");
    expect(row.description).toContain("MEDSHIELD");
    expect(row.forensic_event_level).toBe("red_team");
  });

  it("ATT-style lateral: conflicting tenant headers → HEADER_CONFLICT + alert line", async () => {
    expect(() =>
      assertIronguardBeforeFetch(
        new Request(`${window.location.origin}/api/risk`, {
          headers: {
            "x-tenant-id": TENANT_UUIDS.defense,
            "x-target-tenant-id": TENANT_UUIDS.vaultbank,
          },
        }),
      ),
    ).toThrow();

    await new Promise<void>((r) => queueMicrotask(r));
    expect(getAuditLogs()[0].description).toContain("[ 🚨 SECURITY ALERT ]");
    expect(getAuditLogs()[0].description).toContain("HEADER_CONFLICT");
  });
});

describe("Burn-In — Task 2b: Chaos L5 style Irontech / sentinel narrative", () => {
  beforeEach(() => clearAuditLedgerMasterPurge());

  it("records CHAOS_L5 cascading-failure forensic row with red_team lane metadata", () => {
    appendAuditLog({
      action_type: "SYSTEM_WARNING",
      log_type: "GRC",
      forensic: {
        sourceName: "CHAOS_L5",
        eventLevel: "red_team",
        message:
          "[ CASCADING FAILURE ] Irontech cold-boot / LKG workforce rebirth protocol (simulated).",
        statusIcon: "⚠",
      },
      metadata_tag: "CHAOS_L5|IRONTECH_RESILIENCE",
    });
    const row = getAuditLogs()[0];
    expect(row.forensic_source_name).toBe("CHAOS_L5");
    expect(row.forensic_event_level).toBe("red_team");
    expect(row.description).toContain("#001");
    expect(row.description).toContain("CHAOS_L5");
  });
});

describe("Burn-In — Task 3: Ledger monotonicity, 120-agent burst, lane metadata", () => {
  beforeEach(() => clearAuditLedgerMasterPurge());

  it("ledger_sequence stays strictly increasing through 120 rapid workforce appendAuditLog calls", () => {
    expect(CORE_WORKFORCE_AGENTS.length).toBe(19);
    for (let i = 0; i < 120; i++) {
      const agent = CORE_WORKFORCE_AGENTS[i % 19];
      appendAuditLog({
        action_type: "CONFIG_CHANGE",
        log_type: "GRC",
        forensic: {
          sourceName: agent.name.toUpperCase(),
          eventLevel: "blue_team",
          message: `BURN_IN_PULSE idx=${i}`,
        },
        metadata_tag: `BURN_IN|${agent.name}`,
      });
    }
    const snap = getAuditLogs();
    expect(snap.length).toBe(120);
    const seqs = snap.map((e) => e.ledger_sequence!).sort((a, b) => a - b);
    for (let i = 0; i < 120; i++) {
      expect(seqs[i]).toBe(i + 1);
    }
    expect(snap.every((e) => e.forensic_event_level === "blue_team")).toBe(true);
  });

  function laneGlowToken(level: ForensicEventLevel | undefined): string {
    if (level === "red_team") return "red";
    if (level === "blue_team") return "cyan-emerald";
    return "slate";
  }

  function sidebarLanePrefix(level: ForensicEventLevel | undefined): string {
    return level === "red_team" || level === "blue_team" ? ">" : "";
  }

  it("visual lane contract: red_team vs blue_team vs system (matches Audit Intelligence)", () => {
    appendAuditLog({
      action_type: "SYSTEM_WARNING",
      forensic: {
        sourceName: "ACTOR:KIM",
        eventLevel: "red_team",
        message: "PROBE",
      },
    });
    appendAuditLog({
      action_type: "CONFIG_CHANGE",
      forensic: {
        sourceName: "IRONLOCK",
        eventLevel: "blue_team",
        message: "QUARANTINE",
      },
    });
    appendAuditLog({
      action_type: "CONFIG_CHANGE",
      forensic: { sourceName: "HANDSHAKE", eventLevel: "system", message: "OK" },
    });
    const snap = getAuditLogs();
    const kim = snap.find((l) => l.forensic_source_name === "ACTOR:KIM");
    const lock = snap.find((l) => l.forensic_source_name === "IRONLOCK");
    const hs = snap.find((l) => l.forensic_source_name === "HANDSHAKE");
    expect(kim && sidebarLanePrefix(kim.forensic_event_level)).toBe(">");
    expect(kim && laneGlowToken(kim.forensic_event_level)).toBe("red");
    expect(lock && sidebarLanePrefix(lock.forensic_event_level)).toBe(">");
    expect(lock && laneGlowToken(lock.forensic_event_level)).toBe("cyan-emerald");
    expect(hs && sidebarLanePrefix(hs.forensic_event_level)).toBe("");
    expect(hs && laneGlowToken(hs.forensic_event_level)).toBe("slate");
  });
});

describe("Burn-In — Task 4: Cold-boot cache + store obliteration", () => {
  beforeEach(() => {
    clearAuditLedgerMasterPurge();
    vi.restoreAllMocks();
  });

  it("tenantScopeCache.clear dispatches tenant invalidation event", () => {
    const spy = vi.spyOn(window, "dispatchEvent");
    tenantScopeCache.clear();
    expect(spy.mock.calls.some((c) => (c[0] as CustomEvent).type === TENANT_API_CACHE_INVALIDATE_EVENT)).toBe(
      true,
    );
    spy.mockRestore();
  });

  it("clearAllRiskStateForPurge wipes riskOffset / insurance slider RAM (same primitive resetAllStores invokes)", () => {
    useRiskStore.setState({ riskOffset: 12 });
    expect(useRiskStore.getState().riskOffset).toBe(12);
    useRiskStore.getState().clearAllRiskStateForPurge();
    expect(useRiskStore.getState().riskOffset).toBe(0);
  });
});
