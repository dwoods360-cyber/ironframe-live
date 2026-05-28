export type PhysicalUnitType = "kWh" | "L" | "km";

export type TenantLocation = {
  country: string;
  zipCode?: string;
  /** ISO 3166-1 alpha-2 for GlobalPetrolPrices when country !== USA */
  countryCode?: string;
};

export type UtilityRateSource =
  | "openei-urdb"
  | "nrel-utility-rates-v3"
  | "globalpetrol-industrial"
  | "forensic-estimate";

export type UtilityRateQuote = {
  rateUsdPerUnit: number;
  unitType: PhysicalUnitType;
  source: UtilityRateSource;
  jurisdiction: string;
  polledAt: string;
};

export type SealedUtilityRateSnapshot = Readonly<{
  rateUsdPerUnit: number;
  unitType: PhysicalUnitType;
  source: UtilityRateSource;
  jurisdiction: string;
  fetchedAt: string;
  sealDigest: string;
}>;

export type IronbloomRatePollResult = {
  tenantKey: string;
  skipped?: boolean;
  reason?: string;
  quote?: UtilityRateQuote;
  driftDetected?: boolean;
  driftRatio?: number;
  alertId?: string;
};
