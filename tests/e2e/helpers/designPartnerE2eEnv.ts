/** Production Playwright target — set E2E_PRODUCTION_TENANT_SLUG before running live smoke. */
export function resolveE2EProductionTenantSlug(): string {
  return process.env.E2E_PRODUCTION_TENANT_SLUG?.trim().toLowerCase() || "";
}

export function resolveE2EDesignPartnerSlug(): string {
  return (
    process.env.E2E_DESIGN_PARTNER_SLUG?.trim().toLowerCase() ||
    resolveE2EProductionTenantSlug()
  );
}

export function resolveE2EProductionOperatorEmail(): string {
  return process.env.E2E_PRODUCTION_OPERATOR_EMAIL?.trim().toLowerCase() || "";
}

export function resolveE2EProductionBaseUrl(): string {
  const explicit = process.env.E2E_PRODUCTION_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const slug = resolveE2EProductionTenantSlug();
  const apex = process.env.E2E_TENANT_APEX_DOMAIN?.trim() || "ironframegrc.com";
  if (!slug) return `https://${apex}`;
  return `https://${slug}.${apex}`;
}

/** Local billing-gate E2E fixture tenant (see scripts/dev/fire-billing-activation.ts). */
export const LOCAL_BILLING_GATE_SLUG = "stripe-act-b1";
