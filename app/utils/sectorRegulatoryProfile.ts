/**
 * UI Industry Profile labels → regulatory framing for gaps page and exports.
 * Multiplier display is driven by `governanceMultiplierBps` from the **`tenants`** row (via server action),
 * with sector defaults only when bps is omitted — integer bps only; labels format as decimal × for UX.
 */

/** Fallback bps when tenant-specific value not loaded — aligned with industrial seed / governance maps. */
const DEFAULT_BPS_BY_PROFILE: Record<string, number> = {
  Defense: 160,
  "Federal Government": 140,
  Aerospace: 150,
  "State & Local": 110,
  "Public Sector": 120,
};

export type SectorRegulatoryProfile = {
  multiplierLabel: string;
  frameworkLabel: string;
  badgeHeadline: string;
  shieldDiscoveryBadge: string;
};

function xDisplayFromBps(bps: number): { ascii: string; unicode: string } {
  const factor = bps / 100;
  return {
    ascii: `${factor.toFixed(2)}x`,
    unicode: `${factor.toFixed(2)}×`,
  };
}

/**
 * @param governanceMultiplierBps — from {@link getTenantGovernanceMultiplierBps} (`tenants.industry`); overrides sector defaults.
 */
export function getSectorRegulatoryProfile(
  industry: string,
  governanceMultiplierBps?: number,
): SectorRegulatoryProfile | null {
  const key = industry.trim();
  const bps = governanceMultiplierBps ?? DEFAULT_BPS_BY_PROFILE[key] ?? 100;
  const { ascii: xAscii, unicode: xUni } = xDisplayFromBps(bps);

  switch (key) {
    case "Defense":
      return {
        multiplierLabel: xAscii,
        frameworkLabel: "CMMC Level 3 / ITAR",
        badgeHeadline: `CMMC ${xAscii} Applied`,
        shieldDiscoveryBadge: `🛡️ ${xUni} CMMC L3`,
      };
    case "Federal Government":
      return {
        multiplierLabel: xAscii,
        frameworkLabel: "FISMA High / NIST SP 800-53",
        badgeHeadline: `NIST ${xAscii} Applied`,
        shieldDiscoveryBadge: `🛡️ ${xUni} NIST SP 800-53`,
      };
    case "Aerospace":
      return {
        multiplierLabel: xAscii,
        frameworkLabel: "AS9100 Rev D",
        badgeHeadline: `AS9100 ${xAscii} Applied`,
        shieldDiscoveryBadge: `🛡️ ${xUni} AS9100`,
      };
    case "State & Local":
      return {
        multiplierLabel: xAscii,
        frameworkLabel: "CJIS-aligned / state procurement controls",
        badgeHeadline: `State ${xAscii} Applied`,
        shieldDiscoveryBadge: `🛡️ ${xUni} CJIS-aligned`,
      };
    case "Public Sector":
      return {
        multiplierLabel: xAscii,
        frameworkLabel: "NIST SP 800-53 (general government)",
        badgeHeadline: `NIST ${xAscii} Applied`,
        shieldDiscoveryBadge: `🛡️ ${xUni} NIST (gov)`,
      };
    default:
      return null;
  }
}
