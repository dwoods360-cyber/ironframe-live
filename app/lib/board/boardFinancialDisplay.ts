import { formatUsdCentsBigInt } from "@/app/utils/formatUsdCentsBigInt";
import type { TenantKey } from "@/app/utils/tenantIsolation";
import {
  BOARD_MARKET_TRUTH_MANDATE,
  BOARD_LIVE_DISCOVERY_ONLY_MANDATE,
  SYNTHETIC_DEMO_SEED_SLUGS,
} from "@/app/lib/board/boardMarketTruthMandate";

/** Whole-cent BigInt → macro USD (e.g. 590000000n → "$5.9M USD"). Integer math only. */
export function formatCentsToMacroUsd(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const dollars = abs / 100n;

  const million = 1_000_000n;
  const thousand = 1_000n;

  let formatted: string;
  if (dollars >= million) {
    const wholeM = dollars / million;
    const remainder = dollars % million;
    const tenths = (remainder * 10n) / million;
    formatted = tenths > 0n ? `$${wholeM}.${tenths}M USD` : `$${wholeM}M USD`;
  } else if (dollars >= thousand) {
    const wholeK = dollars / thousand;
    const remainder = dollars % thousand;
    const tenths = (remainder * 10n) / thousand;
    formatted = tenths > 0n ? `$${wholeK}.${tenths}K USD` : `$${wholeK}K USD`;
  } else {
    formatted = `$${dollars.toString()} USD`;
  }

  return negative ? `-${formatted}` : formatted;
}

/** Precise whole-cent exposure for board citations (e.g. 9650000n → "$96,500.00 USD"). */
export function formatCentsToPreciseUsd(cents: bigint): string {
  return `${formatUsdCentsBigInt(cents)} USD`;
}

export type SovereignPoolEntityDisplay = {
  rawBaselineCents: string;
  baselineFormatted: string;
  rawCurrentExposureCents: string;
  currentExposureFormatted: string;
};

export type SyntheticDemoSeedDisplay = SovereignPoolEntityDisplay & {
  classification: "SYNTHETIC_DEMO_SEED";
  engineeringSlug: "medshield" | "vaultbank" | "gridcore";
  fixtureLabel: string;
};

export type BoardFinancialDisplay = {
  /** @deprecated Prefer syntheticDemoSeedPool — same cent strings; slug keys are engineering fixtures only. */
  sovereignPool: Record<"medshield" | "vaultbank" | "gridcore", SovereignPoolEntityDisplay>;
  /** Pre-formatted demo fixtures — cite verbatim; never present as real companies in board prose. */
  syntheticDemoSeedPool: Record<"medshield" | "vaultbank" | "gridcore", SyntheticDemoSeedDisplay>;
  marketTruth: {
    mandateSummary: string;
    liveDiscoveryOnly: string;
    syntheticDemoSeedSlugs: readonly string[];
  };
  activeTenant: {
    tenantId: string;
    slug: TenantKey | "unknown";
    companyName: string;
    rawCurrentExposureCents: string;
    currentExposureFormatted: string;
  };
  /** Explicit scope tunnel — boardroom cites these strings verbatim per active tenant. */
  activeTenantScope: {
    companyUuid: string;
    companyName: string;
    baselineFormatted: string;
    currentExposureFormatted: string;
  };
  sustainability: {
    powerUsageFormatted: string;
    fluidConsumptionFormatted: string;
  };
  compliance: {
    doraReadinessFormatted: string;
    doraStatus: string;
  };
  /** Mandatory triad scaffold — headings are fixed; AI fills narrative under each. */
  governanceTriadScaffold: {
    exposureHeading: "I. Exposure Vector";
    impactHeading: "II. Calculated Quantitative Impact";
    remediationHeading: "III. Machine-Rule Technical Translation";
  };
};

const SOVEREIGN_POOL_SLUGS = ["medshield", "vaultbank", "gridcore"] as const;
type SovereignPoolSlug = (typeof SOVEREIGN_POOL_SLUGS)[number];

function isSovereignPoolSlug(slug: TenantKey | "unknown"): slug is SovereignPoolSlug {
  return slug !== "unknown" && SOVEREIGN_POOL_SLUGS.includes(slug as SovereignPoolSlug);
}

const SYNTHETIC_DEMO_SEED_LABELS: Record<SovereignPoolSlug, string> = {
  medshield: "Internal demo fixture (slug: medshield) — not a real company",
  vaultbank: "Internal demo fixture (slug: vaultbank) — not a real company",
  gridcore: "Internal demo fixture (slug: gridcore) — not a real company",
};

function buildSyntheticDemoSeedDisplay(
  slug: SovereignPoolSlug,
  baselineCents: bigint,
  currentExposureCents: bigint,
): SyntheticDemoSeedDisplay {
  const entity = buildSovereignEntityDisplay(baselineCents, currentExposureCents);
  return {
    ...entity,
    classification: "SYNTHETIC_DEMO_SEED",
    engineeringSlug: slug,
    fixtureLabel: SYNTHETIC_DEMO_SEED_LABELS[slug],
  };
}

export function buildSovereignEntityDisplay(
  baselineCents: bigint,
  currentExposureCents: bigint,
): SovereignPoolEntityDisplay {
  return {
    rawBaselineCents: baselineCents.toString(),
    baselineFormatted: formatCentsToMacroUsd(baselineCents),
    rawCurrentExposureCents: currentExposureCents.toString(),
    currentExposureFormatted: formatCentsToPreciseUsd(currentExposureCents),
  };
}

export function buildBoardFinancialDisplay(args: {
  baselines: Record<"medshield" | "vaultbank" | "gridcore", bigint>;
  activeTenantId: string;
  activeTenantSlug: TenantKey | "unknown";
  activeTenantName: string;
  activeExposureCents: bigint;
  poolExposureBySlug: Record<(typeof SOVEREIGN_POOL_SLUGS)[number], bigint>;
  powerUsageKwh: bigint;
  fluidConsumptionLiters: bigint;
  doraCompletionPercentage: number;
  doraStatus: string;
}): BoardFinancialDisplay {
  const sovereignPool = {
    medshield: buildSovereignEntityDisplay(
      args.baselines.medshield,
      args.poolExposureBySlug.medshield,
    ),
    vaultbank: buildSovereignEntityDisplay(
      args.baselines.vaultbank,
      args.poolExposureBySlug.vaultbank,
    ),
    gridcore: buildSovereignEntityDisplay(
      args.baselines.gridcore,
      args.poolExposureBySlug.gridcore,
    ),
  };

  const syntheticDemoSeedPool = {
    medshield: buildSyntheticDemoSeedDisplay(
      "medshield",
      args.baselines.medshield,
      args.poolExposureBySlug.medshield,
    ),
    vaultbank: buildSyntheticDemoSeedDisplay(
      "vaultbank",
      args.baselines.vaultbank,
      args.poolExposureBySlug.vaultbank,
    ),
    gridcore: buildSyntheticDemoSeedDisplay(
      "gridcore",
      args.baselines.gridcore,
      args.poolExposureBySlug.gridcore,
    ),
  };

  const activePoolEntity = isSovereignPoolSlug(args.activeTenantSlug)
    ? sovereignPool[args.activeTenantSlug]
    : null;
  const activeExposureFormatted = formatCentsToPreciseUsd(args.activeExposureCents);

  return {
    sovereignPool,
    syntheticDemoSeedPool,
    marketTruth: {
      mandateSummary: BOARD_MARKET_TRUTH_MANDATE,
      liveDiscoveryOnly: BOARD_LIVE_DISCOVERY_ONLY_MANDATE,
      syntheticDemoSeedSlugs: SYNTHETIC_DEMO_SEED_SLUGS,
    },
    activeTenant: {
      tenantId: args.activeTenantId,
      slug: args.activeTenantSlug,
      companyName: args.activeTenantName,
      rawCurrentExposureCents: args.activeExposureCents.toString(),
      currentExposureFormatted: activeExposureFormatted,
    },
    activeTenantScope: {
      companyUuid: args.activeTenantId,
      companyName: args.activeTenantName,
      baselineFormatted:
        activePoolEntity?.baselineFormatted ??
        formatCentsToMacroUsd(
          isSovereignPoolSlug(args.activeTenantSlug)
            ? args.baselines[args.activeTenantSlug]
            : args.baselines.medshield,
        ),
      currentExposureFormatted: activeExposureFormatted,
    },
    sustainability: {
      powerUsageFormatted: `${formatGroupedInteger(args.powerUsageKwh)} kWh`,
      fluidConsumptionFormatted: `${formatGroupedInteger(args.fluidConsumptionLiters)} L`,
    },
    compliance: {
      doraReadinessFormatted: `${args.doraCompletionPercentage}%`,
      doraStatus: args.doraStatus,
    },
    governanceTriadScaffold: {
      exposureHeading: "I. Exposure Vector",
      impactHeading: "II. Calculated Quantitative Impact",
      remediationHeading: "III. Machine-Rule Technical Translation",
    },
  };
}

function formatGroupedInteger(value: bigint): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return negative ? `-${grouped}` : grouped;
}

export function formatPhysicalKwh(kwh: bigint): string {
  return `${formatGroupedInteger(kwh)} kWh`;
}

export function formatPhysicalLiters(liters: bigint): string {
  return `${formatGroupedInteger(liters)} L`;
}
