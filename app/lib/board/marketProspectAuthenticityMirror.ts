import "server-only";

/** Mirrors Ironboard marketProspectAuthenticity — keep in sync for live prospect counts. */

export const EXPANSION_TEMPLATE_LEDGER_EMPLOYEES = 24;
export const EXPANSION_TEMPLATE_VAULT_EMPLOYEES = 18;

export const CURATED_DEMO_SEED_DOMAINS = new Set([
  "payflow-london.io",
  "ledgerbridge.uk",
  "vaultpulse.finance",
  "regstack.io",
  "finstack.sg",
  "meridianpay.asia",
  "chaincustody.sg",
  "compliance-lattice.io",
]);

export type MarketProspectAuthenticitySlice = {
  companyName: string;
  domain: string;
  employeeCount: number;
  region: string;
};

export function isSyntheticExpansionTemplateProspect(
  prospect: MarketProspectAuthenticitySlice,
): boolean {
  const name = prospect.companyName.trim();
  const domain = prospect.domain.trim().toLowerCase();

  if (/-ledger\.io$/.test(domain) || /-vault\.finance$/.test(domain)) {
    return true;
  }

  if (/^.+ Ledger$/.test(name) && prospect.employeeCount === EXPANSION_TEMPLATE_LEDGER_EMPLOYEES) {
    return true;
  }

  if (/^.+ Vault$/.test(name) && prospect.employeeCount === EXPANSION_TEMPLATE_VAULT_EMPLOYEES) {
    return true;
  }

  return false;
}

export function isCuratedDemoSeedProspect(prospect: MarketProspectAuthenticitySlice): boolean {
  return CURATED_DEMO_SEED_DOMAINS.has(prospect.domain.trim().toLowerCase());
}

export function isNonAuthenticProspect(prospect: MarketProspectAuthenticitySlice): boolean {
  return isSyntheticExpansionTemplateProspect(prospect) || isCuratedDemoSeedProspect(prospect);
}

export const ACTIVE_PROSPECT_MIN_SCORE = 100;
