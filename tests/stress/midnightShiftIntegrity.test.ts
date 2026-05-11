/**
 * Midnight Shift — full-stack integrity sweep (automated).
 *
 * Task 2 (behavioral): exercised manually / via existing actions — cross-tenant blocks
 * (`app/utils/isolationSentinelLog.ts`), GRC remediation anchor (`lib/simulation/remediation.ts`),
 * chaos cold-boot (`app/actions/chaosActions.ts` + `TenantProvider.switchDevTenantColdBoot`).
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { TENANT_INDUSTRY_BASELINE_ALE_CENTS } from "@/app/constants/devTenantRoster";
import type { TenantKey } from "@/app/utils/tenantIsolation";
import {
  computeBaselineDriftDeltaCents,
  formatBaselineDriftManifestParts,
} from "@/app/utils/baselineDriftManifest";
import { formatBattlefieldLogLine, formatLedgerSequenceLabel } from "@/app/utils/auditLogger";

describe("Midnight Shift — Task 1: Constitutional ALE baselines (BIGINT ¢ only)", () => {
  it.each([
    ["medshield", 1_110_000_000n],
    ["vaultbank", 590_000_000n],
    ["gridcore", 470_000_000n],
    ["defense", 1_600_000_000n],
  ] as const)("TAS anchor %s === %s ¢", (key, cents) => {
    expect(TENANT_INDUSTRY_BASELINE_ALE_CENTS[key]).toBe(cents);
  });

  it("Δ is exactly zero when active ALE equals baseline (every tenant key)", () => {
    (Object.entries(TENANT_INDUSTRY_BASELINE_ALE_CENTS) as [TenantKey, bigint][]).forEach(([k, b]) => {
      expect(computeBaselineDriftDeltaCents(b, k)).toBe(0n);
      expect(formatBaselineDriftManifestParts(b, k).text).toBe("Δ $0");
      expect(formatBaselineDriftManifestParts(b, k).tone).toBe("neutral");
    });
  });

  it("elevated exposure vs Vaultbank surfaces positive Δ (amber tone)", () => {
    const b = TENANT_INDUSTRY_BASELINE_ALE_CENTS.vaultbank;
    const parts = formatBaselineDriftManifestParts(b + 50_000_000n, "vaultbank");
    expect(parts.tone).toBe("amber");
    expect(parts.text.startsWith("Δ +")).toBe(true);
  });

  it("mitigated posture below MEDSHIELD baseline surfaces negative Δ (emerald tone)", () => {
    const b = TENANT_INDUSTRY_BASELINE_ALE_CENTS.medshield;
    const parts = formatBaselineDriftManifestParts(b - 25_000_000n, "medshield");
    expect(parts.tone).toBe("emerald");
    expect(parts.text.startsWith("Δ -")).toBe(true);
  });
});

describe("Midnight Shift — Task 3: Battlefield wire format & sequence labels", () => {
  it("formatLedgerSequenceLabel emits #001-style sequential IDs", () => {
    expect(formatLedgerSequenceLabel(1)).toBe("#001");
    expect(formatLedgerSequenceLabel(999)).toBe("#999");
  });

  it("formatBattlefieldLogLine embeds SOURCE | ICON | MESSAGE for adversarial evidence", () => {
    const line = formatBattlefieldLogLine(
      7,
      {
        sourceName: "ACTOR:KIM",
        eventLevel: "red_team",
        message: "BLOCKED: UNAUTHORIZED FETCH TO TENANT_ID: MEDSHIELD",
        statusIcon: "☢",
      },
      "2026-05-07T12:00:00.000Z",
    );
    expect(line.startsWith("#007 | ACTOR:KIM | ☢ |")).toBe(true);
    expect(line).toContain("BLOCKED: UNAUTHORIZED FETCH TO TENANT_ID: MEDSHIELD");
  });

  it("normalizes mixed-case agent names to uppercase wire tokens", () => {
    const line = formatBattlefieldLogLine(
      3,
      { sourceName: "Ironlock", eventLevel: "blue_team", message: "QUARANTINE SESSION" },
      "2026-05-07T12:00:00.000Z",
    );
    expect(line).toContain("| IRONLOCK |");
  });
});

describe("Midnight Shift — Task 4: PostgreSQL RLS readiness", () => {
  it("Ironguard session GUC migration exists (session variable for phased RLS policies)", () => {
    const sqlPath = path.join(
      process.cwd(),
      "prisma/migrations/20260507200000_ironguard_session_tenant_guc/migration.sql",
    );
    expect(existsSync(sqlPath)).toBe(true);
  });
});
