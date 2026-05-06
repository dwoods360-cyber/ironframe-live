/**
 * UI Industry Profile labels -> regulatory framing for gaps page and exports.
 * Multipliers are presentation-tier signals for underwriter narratives (not pricing engines).
 */

export type SectorRegulatoryProfile = {
  multiplierLabel: string;
  frameworkLabel: string;
  /** Short banner line, e.g. "NIST 1.5x Applied" */
  badgeHeadline: string;
  /** Discovery Gate / center-pane shield line, e.g. "🛡️ 1.6× CMMC L3" */
  shieldDiscoveryBadge: string;
};

export function getSectorRegulatoryProfile(industry: string): SectorRegulatoryProfile | null {
  switch (industry.trim()) {
    case "Defense":
      return {
        multiplierLabel: "1.6x",
        frameworkLabel: "CMMC Level 3 / ITAR",
        badgeHeadline: "CMMC 1.6x Applied",
        shieldDiscoveryBadge: "🛡️ 1.6× CMMC L3",
      };
    case "Federal Government":
      return {
        multiplierLabel: "1.5x",
        frameworkLabel: "FISMA High / NIST SP 800-53",
        badgeHeadline: "NIST 1.5x Applied",
        shieldDiscoveryBadge: "🛡️ 1.5× NIST SP 800-53",
      };
    case "Aerospace":
      return {
        multiplierLabel: "1.45x",
        frameworkLabel: "AS9100 Rev D",
        badgeHeadline: "AS9100 1.45x Applied",
        shieldDiscoveryBadge: "🛡️ 1.45× AS9100",
      };
    case "State & Local":
      return {
        multiplierLabel: "1.25x",
        frameworkLabel: "CJIS-aligned / state procurement controls",
        badgeHeadline: "State 1.25x Applied",
        shieldDiscoveryBadge: "🛡️ 1.25× CJIS-aligned",
      };
    case "Public Sector":
      return {
        multiplierLabel: "1.4x",
        frameworkLabel: "NIST SP 800-53 (general government)",
        badgeHeadline: "NIST 1.4x Applied",
        shieldDiscoveryBadge: "🛡️ 1.4× NIST (gov)",
      };
    default:
      return null;
  }
}
