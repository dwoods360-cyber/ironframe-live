"use server";

import { revalidatePath } from "next/cache";
import {
  verifyAndCommitVaultResolution,
  type BankVaultCommitResult,
  type BankVaultVerificationArgs,
} from "@/src/services/bankVault/vaultResolution";

export type { BankVaultCommitResult };

/**
 * Epic 11.4 — Server action bridge for Bank Vault dual-gate UI (client cannot import server-only service).
 */
export async function verifyAndCommitVaultResolutionAction(
  args: BankVaultVerificationArgs,
): Promise<BankVaultCommitResult> {
  const result = await verifyAndCommitVaultResolution(args);
  revalidatePath("/");
  revalidatePath("/integrity");
  revalidatePath("/admin/clearance");
  revalidatePath("/admin/clearance/vault");
  return result;
}
