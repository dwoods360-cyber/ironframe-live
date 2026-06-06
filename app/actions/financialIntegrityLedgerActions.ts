"use server";

import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import {
  fetchFinancialIntegrityLedgerDbSnapshot,
  type FinancialIntegrityLedgerDbSnapshot,
} from "@/app/lib/financialIntegrityLedgerServer";

/**
 * Server-side ledger matrix snapshot — monetary fields are BIGINT cents serialized as digit strings.
 */
export async function fetchFinancialIntegrityLedgerMatrixSnapshot(
  premiumBasisCents?: string | null,
): Promise<FinancialIntegrityLedgerDbSnapshot | null> {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (!tenantUuid?.trim()) return null;
  return fetchFinancialIntegrityLedgerDbSnapshot(tenantUuid.trim(), premiumBasisCents);
}
