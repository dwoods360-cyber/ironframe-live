import { describe, it, expect } from "vitest";
import { TENANT_INDUSTRY_BASELINE_ALE_CENTS } from "@/app/constants/devTenantRoster";
import type { TenantKey } from "@/app/utils/tenantIsolation";
import { getTotalCurrentRiskCentsString } from "@/app/utils/riskStoreBigIntMath";
import {
  computeBaselineDriftDeltaCents,
  formatBaselineDriftManifestParts,
} from "@/app/utils/baselineDriftManifest";

/** Constitutional targets (USD cents) — must match docs/TAS.md §4 + `devTenantRoster`. */
const TARGETS: Record<TenantKey, bigint> = {
  medshield: 1_110_000_000n,
  vaultbank: 590_000_000n,
  gridcore: 470_000_000n,
  defense: 1_600_000_000n,
};

describe("PART 1 — Multi-tenant industry baseline sweep (BIGINT)", () => {
  it.each([
    ["medshield", 11_100_000],
    ["vaultbank", 5_900_000],
    ["gridcore", 4_700_000],
    ["defense", 16_000_000],
  ] as const)("TENANT_INDUSTRY_BASELINE_ALE_CENTS.%s === %i USD exactly (¢ deterministic)", (key, usd) => {
    expect(TENANT_INDUSTRY_BASELINE_ALE_CENTS[key]).toBe(TARGETS[key]);
    expect(TENANT_INDUSTRY_BASELINE_ALE_CENTS[key]).toBe(BigInt(usd) * 100n);
  });

  it("all keys match exported map reference identity", () => {
    (Object.keys(TARGETS) as TenantKey[]).forEach((k) => {
      expect(TENANT_INDUSTRY_BASELINE_ALE_CENTS[k]).toBe(TARGETS[k]);
    });
  });
});

describe("PART 1 — Drift Δ tracks active ALE inputs (BIGINT pipeline)", () => {
  it("Δ goes more negative when riskOffset increases (mitigation / insurance offset)", () => {
    const accepted = { x: 20 };
    const delta0 = computeBaselineDriftDeltaCents(
      BigInt(getTotalCurrentRiskCentsString(accepted, {}, 0)),
      "defense",
    );
    const deltaMitigated = computeBaselineDriftDeltaCents(
      BigInt(getTotalCurrentRiskCentsString(accepted, {}, 3)),
      "defense",
    );
    expect(deltaMitigated < delta0).toBe(true);
  });

  it("manifest tone flips when active crosses baseline (Vaultbank)", () => {
    const b = TENANT_INDUSTRY_BASELINE_ALE_CENTS.vaultbank;
    const below = formatBaselineDriftManifestParts(b - 100_000_000n, "vaultbank");
    const above = formatBaselineDriftManifestParts(b + 100_000_000n, "vaultbank");
    expect(below.tone).toBe("emerald");
    expect(above.tone).toBe("amber");
  });
});

/** Mirrors `computeNextLedgerSequence` in `auditLogger.ts` — empty ledger → next entry #001. */
function computeNextLedgerSequenceFrom(snapshot: ReadonlyArray<{ ledger_sequence?: number }>): number {
  let maxSeq = 0;
  for (const e of snapshot) {
    if (typeof e.ledger_sequence === "number" && Number.isFinite(e.ledger_sequence)) {
      maxSeq = Math.max(maxSeq, Math.floor(e.ledger_sequence));
    }
  }
  return maxSeq + 1;
}

describe("PART 4 — Audit ledger sequence model (cold-boot implies #001)", () => {
  it("empty snapshot → next ledger index is 1 (#001)", () => {
    expect(computeNextLedgerSequenceFrom([])).toBe(1);
  });

  it("monotonic max + 1 after cold-boot replay", () => {
    expect(computeNextLedgerSequenceFrom([{ ledger_sequence: 1 }])).toBe(2);
    expect(computeNextLedgerSequenceFrom([{ ledger_sequence: 41 }, { ledger_sequence: 40 }])).toBe(42);
  });
});
